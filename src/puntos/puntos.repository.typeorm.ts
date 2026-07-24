import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PuntosRepository } from './puntos.repository';
import { PuntoResiduo } from './entities/punto-residuo.entity';

@Injectable()
export class TypeOrmPuntosRepository implements PuntosRepository {
  constructor(
    @InjectRepository(PuntoResiduo)
    private readonly repo: Repository<PuntoResiduo>,
  ) {}

  async create(data: Omit<PuntoResiduo, 'id' | 'createdAt' | 'updatedAt'>): Promise<PuntoResiduo> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findByCreator(userId: string): Promise<PuntoResiduo[]> {
    return this.repo.find({ where: { createdByUserId: userId }, order: { createdAt: 'DESC' } });
  }
}
