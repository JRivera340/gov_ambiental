import api from './api';
import { isTransientError, backoffDelay } from './lib/retry';
import type { LoginDTO, LoginResponse, User } from '../types';

// Single source of truth for token storage keys
// Usamos sessionStorage para que cada pestaña tenga su propia sesión independiente
// Esto evita que el login/logout se sincronice automáticamente entre pestañas
const TOKEN_KEY = 'gov_auth_token';
const USER_KEY = 'gov_auth_user';

// login() no tiene consumidor en esta rama (test/main/production usan JWT
// del hub vía /handoff, ver CLAUDE.md sección 0 — no hay LoginPage acá).
// Confirmado 2026-07-29: SÍ tiene consumidor real en `version1`
// (`pages/LoginPage.tsx` + backend propio `POST /auth/login`, la excepción
// de auth documentada porque esa rama es el entregable standalone a la
// UAESP). Se deja el método sin usar en esta rama a propósito, no se borra.
export const authService = {
  async login(credentials: LoginDTO): Promise<LoginResponse> {
    // Reintenta solo ante errores transitorios del backend (cold-start/502/503/504/red),
    // nunca ante 401/400: esos son credenciales/datos inválidos y deben mostrarse al toque.
    const maxRetries = 2;
    for (let attempt = 0; ; attempt++) {
      try {
        const { data } = await api.post<LoginResponse>('/auth/login', credentials);
        return data;
      } catch (error: any) {
        const status = error?.response?.status;
        if (attempt >= maxRetries || !isTransientError(status)) throw error;
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
      }
    }
  },

  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      // Si el JSON está corrupto, limpiamos
      this.clearSession();
      return null;
    }
  },

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  saveSession(token: string, user: User): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

