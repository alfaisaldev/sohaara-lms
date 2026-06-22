const TOKEN_KEY = 'adminToken';

export function useUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useRoles(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('roles');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function usePermissions(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('permissions');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useCan(...roles: string[]): boolean {
  const userRoles = useRoles();
  if (userRoles.includes('super_admin')) return true;
  return roles.some((r) => userRoles.includes(r));
}

export function useIsAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(TOKEN_KEY);
}

export function saveAuth(data: { user: any; roles: string[]; permissions: string[]; accessToken: string; refreshToken: string }) {
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('roles', JSON.stringify(data.roles || []));
  localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
  document.cookie = 'admin_auth=true; path=/; max-age=86400; SameSite=Lax';
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('roles');
  localStorage.removeItem('permissions');
  document.cookie = 'admin_auth=; path=/; max-age=0';
}

export function logout() {
  // Navigate to the admin app's single OIDC logout page. The Keycloak
  // session is ended by userManager.signoutRedirect() there; LMS
  // localStorage is cleared by /admin/auth/logged-out after the
  // end-session redirect lands.
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/auth/logout';
  }
}