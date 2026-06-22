/**
 * OIDC client for the LMS web app (sohaara-web public client).
 *
 * Keycloak owns identity, signup, login, password reset, MFA, account
 * lifecycle, and roles. The LMS never sees, stores, transmits, or hashes a
 * password — the browser speaks OIDC + PKCE directly with the Keycloak
 * realm, and only the resulting access_token reaches the LMS api
 * (via POST /api/v1/auth/keycloak/exchange).
 *
 * Architecture rules:
 *  - Single auth entry point: /auth/start (three buttons, one OIDC pipe).
 *  - `state.mode` ∈ {'login', 'register', 'reset'} is the ONLY discriminator;
 *    the universal /auth/callback branches on it for post-auth routing only.
 *  - acr_values={mode} is sent to Keycloak so the themed login/register/
 *    reset page renders inline on the same OIDC flow (Keycloak has no
 *    /protocol/openid-connect/registrations endpoint).
 *  - `automaticSilentRenew: true` keeps the Keycloak session alive by
 *    refreshing via the Keycloak session cookie; the LMS's HS256 session
 *    JWT is independent.
 *  - No wildcard redirect URIs anywhere — strictly per-route allow-list
 *    in sohaara.json.
 *
 * Env vars (build-time, NEXT_PUBLIC_*):
 *   NEXT_PUBLIC_KEYCLOAK_URL        e.g. http://localhost:8080
 *   NEXT_PUBLIC_KEYCLOAK_REALM      e.g. sohaara
 *   NEXT_PUBLIC_KEYCLOAK_CLIENT_ID  e.g. sohaara-web
 *   NEXT_PUBLIC_APP_URL             e.g. http://localhost:3000
 */

import { WebStorageStateStore, UserManagerSettings } from 'oidc-client-ts';
// NOTE: `UserManager` is NOT imported at module top level — it pulls in
// `localStorage` access at module-init time, which crashes Next.js SSR
// static prerender. We dynamic-import it inside `getUserManager()` so
// the whole `oidc-client-ts` module only evaluates in the browser.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserManagerCtor = new (...args: any[]) => any;

const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'sohaara';
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'sohaara-web';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const OIDC_AUTHORITY = `${KEYCLOAK_URL.replace(/\/+$/, '')}/realms/${KEYCLOAK_REALM}`;
export const OIDC_CLIENT_ID = KEYCLOAK_CLIENT_ID;

export const OIDC_REDIRECT_URI = `${APP_URL.replace(/\/+$/, '')}/auth/callback`;
export const OIDC_POST_LOGOUT_REDIRECT_URI = `${APP_URL.replace(/\/+$/, '')}/auth/logged-out`;
export const OIDC_SILENT_REDIRECT_URI = `${APP_URL.replace(/\/+$/, '')}/auth/silent-renew`;

/**
 * The state mode that distinguishes login vs register vs reset. Set in
 * the `state` payload by /auth/start, read by /auth/callback.
 */
export type AuthMode = 'login' | 'register' | 'reset';

export interface OidcState {
  mode: AuthMode;
  returnTo?: string;
  inviteToken?: string;
}

/**
 * Direct Keycloak endpoints that bypass the OIDC auth URL. Used by
 * /auth/start when `mode='reset'` so the user lands straight on the
 * themed reset-password form (skipping the extra login-page → click
 * "Forgot password" → reset-form round-trip). Keycloak's
 * `login-actions/reset-credentials` endpoint accepts the same
 * `client_id` and `redirect_uri` query params as the OIDC auth
 * endpoint and works without PKCE — once the user resets their
 * password Keycloak redirects them back to `redirect_uri` and
 * /auth/callback reads `state.mode='reset'` from the OIDC state
 * (kept in localStorage by oidc-client-ts before the redirect).
 */
export function buildKeycloakResetCredentialsUrl(redirectUri: string): string {
  const base = `${OIDC_AUTHORITY.replace(/\/+$/, '')}/login-actions/reset-credentials`;
  const params = new URLSearchParams({
    client_id: OIDC_CLIENT_ID,
    redirect_uri: redirectUri,
  });
  return `${base}?${params.toString()}`;
}

/**
 * Register flow uses the OIDC auth URL (no separate register endpoint
 * path that accepts PKCE) — the sohaara theme renders a "Register" link
 * inline on the themed login page so the user only adds one extra
 * click. Keycloak's `acr_values_supported: ["0","1"]` confirms it does
 * NOT honor `acr_values=register`, so we don't try to send it.
 */

const settings: UserManagerSettings = {
  authority: OIDC_AUTHORITY,
  client_id: OIDC_CLIENT_ID,
  redirect_uri: OIDC_REDIRECT_URI,
  post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI,
  silent_redirect_uri: OIDC_SILENT_REDIRECT_URI,
  response_type: 'code',
  // `sohaara-roles` is also a default client scope in the realm
  // (sohaara.json), so Keycloak auto-issues the realm-role claim even
  // without it here — but listing it makes the contract explicit and
  // safe against accidental scope drift in the realm export.
  scope: 'openid profile email sohaara-roles',
  // PKCE is auto-enabled in oidc-client-ts v3+ with S256 by default.
  // Realm client config (sohaara.json) must have PKCE enabled with
  // code_challenge_method: S256 to match.
  loadUserInfo: true,
  automaticSilentRenew: true,
  // localStorage so refresh-token persistence survives across tabs
  // (and so the silent-renew iframe on Keycloak can find the user).
  userStore: typeof window !== 'undefined'
    ? new WebStorageStateStore({ store: window.localStorage })
    : undefined,
};

let _userManager: unknown = null;

/**
 * Returns the singleton UserManager for the LMS web app. Created lazily
 * (and on the client only) so SSR doesn't try to touch window.localStorage
 * during build. Calling this on the server throws — auth pages are
 * marked `export const dynamic = 'force-dynamic'` to ensure they never
 * get statically prerendered.
 */
export async function getUserManager(): Promise<unknown> {
  if (typeof window === 'undefined') {
    throw new Error('getUserManager() called on the server — should only run in the browser');
  }
  if (_userManager) return _userManager;
  const mod = await import('oidc-client-ts');
  const UserManager = mod.UserManager as UserManagerCtor;
  _userManager = new UserManager(settings);
  return _userManager;
}