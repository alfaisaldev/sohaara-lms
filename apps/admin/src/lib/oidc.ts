/**
 * OIDC client for the LMS admin app (sohaara-admin public client).
 *
 * Same shape as apps/web/src/lib/oidc.ts but for the admin app — separate
 * Keycloak client_id, separate redirect URIs, separate localStorage key
 * for the LMS access token (`adminToken`). The Keycloak session itself
 * is shared with the realm (so logging in on /admin/auth/start picks up
 * an existing browser Keycloak session if present).
 *
 * Env vars (build-time, NEXT_PUBLIC_*):
 *   NEXT_PUBLIC_KEYCLOAK_URL        e.g. http://localhost:8080
 *   NEXT_PUBLIC_KEYCLOAK_REALM      e.g. sohaara
 *   NEXT_PUBLIC_KEYCLOAK_CLIENT_ID  e.g. sohaara-admin
 *   NEXT_PUBLIC_ADMIN_URL           e.g. http://localhost:3001
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
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'sohaara-admin';
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

export const OIDC_AUTHORITY = `${KEYCLOAK_URL.replace(/\/+$/, '')}/realms/${KEYCLOAK_REALM}`;
export const OIDC_CLIENT_ID = KEYCLOAK_CLIENT_ID;

export const OIDC_REDIRECT_URI = `${ADMIN_URL.replace(/\/+$/, '')}/admin/auth/callback`;
export const OIDC_POST_LOGOUT_REDIRECT_URI = `${ADMIN_URL.replace(/\/+$/, '')}/admin/auth/logged-out`;
export const OIDC_SILENT_REDIRECT_URI = `${ADMIN_URL.replace(/\/+$/, '')}/admin/auth/silent-renew`;

export type AuthMode = 'login' | 'register' | 'reset';

export interface OidcState {
  mode: AuthMode;
  returnTo?: string;
  inviteToken?: string;
}

/**
 * Builds the direct Keycloak reset-credentials URL. See web/lib/oidc.ts
 * for the rationale — reset mode bypasses the OIDC auth URL so the user
 * lands on the themed reset form in one click instead of three (login →
 * "Forgot password" → reset form). PKCE isn't required by this endpoint;
 * /auth/callback reads `state.mode='reset'` from the OIDC state
 * persisted in localStorage by oidc-client-ts before the redirect.
 */
export function buildKeycloakResetCredentialsUrl(redirectUri: string): string {
  const base = `${OIDC_AUTHORITY.replace(/\/+$/, '')}/login-actions/reset-credentials`;
  const params = new URLSearchParams({
    client_id: OIDC_CLIENT_ID,
    redirect_uri: redirectUri,
  });
  return `${base}?${params.toString()}`;
}

const settings: UserManagerSettings = {
  authority: OIDC_AUTHORITY,
  client_id: OIDC_CLIENT_ID,
  redirect_uri: OIDC_REDIRECT_URI,
  post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI,
  silent_redirect_uri: OIDC_SILENT_REDIRECT_URI,
  response_type: 'code',
  scope: 'openid profile email sohaara-roles',
  loadUserInfo: true,
  automaticSilentRenew: true,
  userStore: typeof window !== 'undefined'
    ? new WebStorageStateStore({ store: window.localStorage })
    : undefined,
};

let _userManager: unknown = null;

/**
 * Returns the singleton UserManager for the LMS admin app. Created
 * lazily (and on the client only) so SSR doesn't try to touch
 * window.localStorage during build. Calling this on the server throws
 * — admin auth pages are marked `export const dynamic = 'force-dynamic'`
 * to ensure they never get statically prerendered.
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