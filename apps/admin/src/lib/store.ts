import { create } from 'zustand';

interface AdminAuthState {
  user: { id: string; email: string; firstName: string; lastName: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminAuthState['user'], token: string) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => {
    localStorage.setItem('adminToken', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('adminToken');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
