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

import { UserManager, WebStorageStateStore, UserManagerSettings } from 'oidc-client-ts';

const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'sohaara';
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'sohaara-admin';
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';

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
  loadUserInfo: true,
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: typeof window !== 'undefined' ? window.localStorage : undefined }),
};

let _userManager: UserManager | null = null;

export function getUserManager(): UserManager {
  if (!_userManager) _userManager = new UserManager(settings);
  return _userManager;
}