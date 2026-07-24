import { create } from 'zustand';
import type { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  
  login: (token: string, user: User) => void;
  logout: () => void;
  loadUser: () => void;
  clearAuth: () => void;
}

// Rehidratación inicial síncrona desde sessionStorage
const getInitialState = () => {
  try {
    const token = authService.getToken();
    const user = authService.getCurrentUser();
    if (token && user) {
      return { user, token, isAuthenticated: true, loading: false, initialized: true };
    }
  } catch (e) {
    console.error('Error rehydrating auth state:', e);
  }
  return { user: null, token: null, isAuthenticated: false, loading: false, initialized: true };
};

const initialState = getInitialState();

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  
  login: (token, user) => {
    authService.saveSession(token, user);
    set({ user, token, isAuthenticated: true, loading: false, initialized: true });
  },
  
  logout: () => {
    authService.clearSession();
    set({ user: null, token: null, isAuthenticated: false, loading: false });
  },
  
  // loadUser ahora es idempotente y rápido (ya rehidratamos en init)
  loadUser: () => {
    try {
      const token = authService.getToken();
      const user = authService.getCurrentUser();
      
      if (token && user) {
        set({ user, token, isAuthenticated: true, loading: false, initialized: true });
      } else {
        set({ user: null, token: null, isAuthenticated: false, loading: false, initialized: true });
      }
    } catch (error) {
      console.error('Error loading user:', error);
      authService.clearSession();
      set({ user: null, token: null, isAuthenticated: false, loading: false, initialized: true });
    }
  },
  
  // Limpieza manual (usado por el evento session-expired)
  clearAuth: () => {
    authService.clearSession();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

