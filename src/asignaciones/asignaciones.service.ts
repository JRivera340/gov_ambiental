import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PuntoAsignacion } from './entities/punto-asignacion.entity';

@Injectable()
export class AsignacionesService {
  constructor(
    @InjectRepository(PuntoAsignacion)
    private readonly repo: Repository<PuntoAsignacion>,
  ) {}

  async getPuntosDeGestor(gestorId: string): Promise<string[]> {
    const filas = await this.repo.find({ where: { gestorId } });
    return filas.map((f) => f.puntoResiduoId);
  }

  async estaAsignadoA(puntoResiduoId: string, gestorId: string): Promise<boolean> {
    const fila = await this.repo.findOne({ where: { puntoResiduoId } });
    return !!fila && fila.gestorId === gestorId;
  }

  getMapaCompleto(): Promise<PuntoAsignacion[]> {
    return this.repo.find();
  }

  async getSinAsignar(): Promise<string[]> {
    const filas = await this.repo.find({ where: { gestorId: IsNull() } });
    return filas.map((f) => f.puntoResiduoId);
  }

  async reasignarPunto(puntoResiduoId: string, gestorId: string | null, adminId: string): Promise<PuntoAsignacion> {
    let fila = await this.repo.findOne({ where: { puntoResiduoId } });
    if (!fila) fila = this.repo.create({ puntoResiduoId });
    fila.gestorId = gestorId;
    fila.updatedByUserId = adminId;
    return this.repo.save(fila);
  }

  async asignarACreador(puntoResiduoId: string, creatorId: string): Promise<void> {
    const existente = await this.repo.findOne({ where: { puntoResiduoId } });
    if (existente) return;
    await this.repo.save(this.repo.create({ puntoResiduoId, gestorId: creatorId, updatedByUserId: null }));
  }

  // Usado al eliminar un punto (PuntosService.remove) — sin esto quedaba una
  // fila huérfana en punto_asignacion apuntando a un id que ya no existe.
  async eliminarDePunto(puntoResiduoId: string): Promise<void> {
    await this.repo.delete({ puntoResiduoId });
  }
}
