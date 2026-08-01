import api from './api';
import type { User } from '../types';

// El backend propio ya corta contra el hub a los 4s (ver users.service.ts,
// backend), pero se agrega un timeout aca tambien como red de seguridad -
// si por lo que sea esa proteccion fallara, esta llamada igual no se cuelga
// para siempre esperando respuesta.
const REQUEST_TIMEOUT_MS = 6000;

export interface CreateUserPayload {
  name: string;
  lastname: string;
  email: string;
  password: string;
  role: User['role'];
}

export interface UpdateUserPayload {
  name?: string;
  lastname?: string;
  email?: string;
  role?: User['role'];
  password?: string;
}

export const usersService = {
  async getUserById(id: string): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`, { timeout: REQUEST_TIMEOUT_MS });
    return data;
  },

  async getGestores(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/gestores/list', { timeout: REQUEST_TIMEOUT_MS });
    return data;
  },

  // Gestión de usuarios — solo ADMIN.
  async getAll(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users');
    return data;
  },

  async create(payload: CreateUserPayload): Promise<User> {
    const { data } = await api.post<User>('/users', payload);
    return data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}`, payload);
    return data;
  },

  async deactivate(id: string): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}/desactivar`, {});
    return data;
  },

  async activate(id: string): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}/activar`, {});
    return data;
  },
};
