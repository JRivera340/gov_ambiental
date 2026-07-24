import api from './api';
import type { User, Role, PaginatedResponse } from '../types';

export interface CreateUserDTO {
  name: string;
  lastname: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserDTO {
  name?: string;
  lastname?: string;
  email?: string;
  password?: string;
  role?: Role;
  active?: boolean;
}

export const usersService = {
  async getAllUsers(filters?: { limit?: number; offset?: number; search?: string; role?: string }): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.role) params.append('role', filters.role);
    const queryString = params.toString();
    const url = `/users${queryString ? `?${queryString}` : ''}`;
    const { data } = await api.get<PaginatedResponse<User>>(url);
    return data;
  },

  async createUser(dto: CreateUserDTO): Promise<User> {
    const { data } = await api.post<User>('/users', dto);
    return data;
  },

  async getUserById(id: string): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  async updateUser(id: string, dto: UpdateUserDTO): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}`, dto);
    return data;
  },

  async getGestores(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/gestores/list');
    return data;
  },

  async importUsers(file: File): Promise<{ success: Array<{ name: string; email: string }>; errors: Array<{ row: number; error: string }> }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data } = await api.post<{ success: Array<{ name: string; email: string }>; errors: Array<{ row: number; error: string }> }>(
      '/users/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 5 * 60 * 1000, // 5 minutos
      }
    );
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};

