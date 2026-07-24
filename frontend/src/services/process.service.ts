import api from './api';
import type { Process } from '../types';

export const processService = {
    // Crear proceso
    async create(data: { nombre: string; descripcion?: string }): Promise<Process> {
        const { data: process } = await api.post<Process>('/sorver/processes', data);
        return process;
    },

    // Listar mis procesos
    async getMine(): Promise<Process[]> {
        const { data } = await api.get<Process[]>('/sorver/processes/mine');
        return data;
    },

    // Listar todos los procesos
    async getAll(): Promise<Process[]> {
        const { data } = await api.get<Process[]>('/sorver/processes/all');
        return data;
    },

    // Obtener proceso con actividades
    async getById(id: string): Promise<Process> {
        const { data } = await api.get<Process>(`/sorver/processes/${id}`);
        return data;
    },

    // Actualizar proceso
    async update(id: string, data: { nombre?: string; descripcion?: string }): Promise<Process> {
        const { data: process } = await api.patch<Process>(`/sorver/processes/${id}`, data);
        return process;
    },

    // Eliminar proceso
    async delete(id: string): Promise<void> {
        await api.delete(`/sorver/processes/${id}`);
    },
};
