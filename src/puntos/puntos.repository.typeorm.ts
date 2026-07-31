import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { PuntosRepository } from './puntos.repository';
import { EstadoPunto, PuntoResiduo } from './entities/punto-residuo.entity';

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

  async findById(id: string): Promise<PuntoResiduo | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findPending(): Promise<PuntoResiduo[]> {
    return this.repo.find({ where: { status: EstadoPunto.ENVIADA } });
  }

  async findPublished(): Promise<PuntoResiduo[]> {
    return this.repo.find({ where: { status: EstadoPunto.PUBLICADA } });
  }

  async findAll(filters?: { desde?: string; hasta?: string }): Promise<PuntoResiduo[]> {
    const where: any = {};
    if (filters?.desde && filters?.hasta) {
      where.dateTime = Between(new Date(filters.desde), new Date(filters.hasta));
    } else if (filters?.desde) {
      where.dateTime = MoreThanOrEqual(new Date(filters.desde));
    } else if (filters?.hasta) {
      where.dateTime = LessThanOrEqual(new Date(filters.hasta));
    }
    return this.repo.find({ where });
  }

  async save(punto: PuntoResiduo): Promise<PuntoResiduo> {
    return this.repo.save(punto);
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.repo.delete(ids);
  }

  async findUsedPointNumbers(): Promise<number[]> {
    const rows = await this.repo
      .createQueryBuilder('p')
      .select('p.pointNumber', 'num')
      .where('p.pointNumber IS NOT NULL AND p.pointNumber > 0')
      .getRawMany();
    return rows.map((r: any) => parseInt(r.num, 10)).filter((n: number) => !isNaN(n));
  }
}
