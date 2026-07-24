import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PuntosRepository } from './puntos.repository';
import { PuntoResiduo } from './entities/punto-residuo.entity';

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
}
