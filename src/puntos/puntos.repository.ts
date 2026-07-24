import { PuntoResiduo } from './entities/punto-residuo.entity';

export interface PuntosRepository {
  create(data: Omit<PuntoResiduo, 'id' | 'createdAt' | 'updatedAt'>): Promise<PuntoResiduo>;
  findByCreator(userId: string): Promise<PuntoResiduo[]>;
}
