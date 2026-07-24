import { Inject, Injectable } from '@nestjs/common';
import { PuntosRepository } from './puntos.repository';
import { PUNTOS_REPOSITORY } from './puntos.tokens';
import { EstadoPunto, PuntoResiduo } from './entities/punto-residuo.entity';
import { CreatePuntoDto } from './dto/create-punto.dto';

@Injectable()
export class PuntosService {
  constructor(@Inject(PUNTOS_REPOSITORY) private readonly repo: PuntosRepository) {}

  async create(userId: string, dto: CreatePuntoDto): Promise<PuntoResiduo> {
    return this.repo.create({
      createdByUserId: userId,
      status: EstadoPunto.BORRADOR,
      dateTime: new Date(),
      lat: dto.lat,
      lng: dto.lng,
      barrio: dto.barrio,
      photos: [],
      residuos: [],
    } as Omit<PuntoResiduo, 'id' | 'createdAt' | 'updatedAt'>);
  }

  async findMine(userId: string): Promise<PuntoResiduo[]> {
    return this.repo.findByCreator(userId);
  }
}
