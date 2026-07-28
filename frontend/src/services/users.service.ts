import api from './api';
import type { User } from '../types';

// El backend propio ya corta contra el hub a los 4s (ver users.service.ts,
// backend), pero se agrega un timeout aca tambien como red de seguridad -
// si por lo que sea esa proteccion fallara, esta llamada igual no se cuelga
// para siempre esperando respuesta.
const REQUEST_TIMEOUT_MS = 6000;

export const usersService = {
  async getUserById(id: string): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`, { timeout: REQUEST_TIMEOUT_MS });
    return data;
  },

  async getGestores(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/gestores/list', { timeout: REQUEST_TIMEOUT_MS });
    return data;
  },
};
