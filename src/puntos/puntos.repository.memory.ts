import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PuntosRepository } from './puntos.repository';
import { EstadoPunto, PuntoResiduo } from './entities/punto-residuo.entity';

@Injectable()
export class InMemoryPuntosRepository implements PuntosRepository {
  private puntos = new Map<string, PuntoResiduo>();

  async create(data: Omit<PuntoResiduo, 'id' | 'createdAt' | 'updatedAt'>): Promise<PuntoResiduo> {
    const now = new Date();
    const punto = { ...data, id: randomUUID(), createdAt: now, updatedAt: now } as PuntoResiduo;
    this.puntos.set(punto.id, punto);
    return punto;
  }

  async findByCreator(userId: string): Promise<PuntoResiduo[]> {
    return Array.from(this.puntos.values()).filter((p) => p.createdByUserId === userId);
  }

  async findById(id: string): Promise<PuntoResiduo | null> {
    return this.puntos.get(id) ?? null;
  }

  async findPending(): Promise<PuntoResiduo[]> {
    return Array.from(this.puntos.values()).filter((p) => p.status === EstadoPunto.ENVIADA);
  }

  async findPublished(): Promise<PuntoResiduo[]> {
    return Array.from(this.puntos.values()).filter((p) => p.status === EstadoPunto.PUBLICADA);
  }

  async findAll(filters?: { desde?: string; hasta?: string }): Promise<PuntoResiduo[]> {
    let all = Array.from(this.puntos.values());
    if (filters?.desde) {
      const desde = new Date(filters.desde);
      all = all.filter((p) => p.dateTime >= desde);
    }
    if (filters?.hasta) {
      const hasta = new Date(filters.hasta);
      all = all.filter((p) => p.dateTime <= hasta);
    }
    return all;
  }

  async save(punto: PuntoResiduo): Promise<PuntoResiduo> {
    const updated = { ...punto, updatedAt: new Date() };
    this.puntos.set(updated.id, updated);
    return updated;
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) this.puntos.delete(id);
  }

  async findUsedPointNumbers(): Promise<number[]> {
    return Array.from(this.puntos.values())
      .map((p) => p.pointNumber)
      .filter((n): n is number => typeof n === 'number' && n > 0);
  }
}
