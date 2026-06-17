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
  if (userRoles.includes('platform_super_admin')) return true;
  return roles.some((r) => userRoles.includes(r));
}

export function useHasPermission(permission: string): boolean {
  const perms = usePermissions();
  if (useRoles().includes('platform_super_admin')) return true;
  return perms.includes('*') || perms.includes(permission);
}

export function useIsAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}

export function saveAuth(data: { user: any; roles: string[]; permissions: string[]; accessToken: string; refreshToken: string }, tokenKey = 'accessToken') {
  localStorage.setItem(tokenKey, data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('roles', JSON.stringify(data.roles || []));
  localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
}

export function clearAuth(tokenKey = 'accessToken') {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('roles');
  localStorage.removeItem('permissions');
}

export function logout(tokenKey = 'accessToken') {
  clearAuth(tokenKey);
  if (typeof window !== 'undefined') {
    window.location.href = tokenKey === 'adminToken' ? '/admin/login' : '/auth/login';
  }
}