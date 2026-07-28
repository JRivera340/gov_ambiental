import api from './api';
import type { User } from '../types';

export const usersService = {
  async getUserById(id: string): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  async getGestores(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/gestores/list');
    return data;
  },
};
