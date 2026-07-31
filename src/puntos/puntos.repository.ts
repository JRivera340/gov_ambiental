import { PuntoResiduo } from './entities/punto-residuo.entity';

export interface PuntosRepository {
  create(data: Omit<PuntoResiduo, 'id' | 'createdAt' | 'updatedAt'>): Promise<PuntoResiduo>;
  findByCreator(userId: string): Promise<PuntoResiduo[]>;
  findById(id: string): Promise<PuntoResiduo | null>;
  findPending(): Promise<PuntoResiduo[]>;
  findPublished(): Promise<PuntoResiduo[]>;
  findAll(filters?: { desde?: string; hasta?: string }): Promise<PuntoResiduo[]>;
  save(punto: PuntoResiduo): Promise<PuntoResiduo>;
  deleteMany(ids: string[]): Promise<void>;
  /** Todos los pointNumber ya asignados (>0), para calcular el siguiente disponible. */
  findUsedPointNumbers(): Promise<number[]>;
}
