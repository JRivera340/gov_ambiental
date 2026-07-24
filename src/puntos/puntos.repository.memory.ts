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

  async save(punto: PuntoResiduo): Promise<PuntoResiduo> {
    const updated = { ...punto, updatedAt: new Date() };
    this.puntos.set(updated.id, updated);
    return updated;
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) this.puntos.delete(id);
  }
}
