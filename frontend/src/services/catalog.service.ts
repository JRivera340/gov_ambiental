import api from './api';
import type { Catalogs } from '../types';

export const catalogService = {
  async getAll(): Promise<Catalogs> {
    const { data } = await api.get<Catalogs>('/catalogs/all');
    return data;
  },

  async getBarrios(): Promise<string[]> {
    const { data } = await api.get<{ barrios: string[] }>('/catalogs/barrios');
    return data.barrios;
  },

  async getTiposActividad(): Promise<string[]> {
    const { data } = await api.get<{ tiposActividad: string[] }>('/catalogs/tipos-actividad');
    return data.tiposActividad;
  },

  async getEntidades(): Promise<string[]> {
    const { data } = await api.get<{ entidades: string[] }>('/catalogs/entidades');
    return data.entidades;
  },
};

