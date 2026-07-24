import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RutaSemanal } from './entities/ruta-semanal.entity';
import type { ParadaLite } from './lib/paradas.types';
import { limitesSemana, semanaVencida, calcularArrastre } from './lib/ruta-semanal.util';

export type CrearRutaInput = {
  gestorId: string; paradas: ParadaLite[]; segmentos: unknown[]; ahora?: Date;
};

@Injectable()
export class RutasSemanalesService {
  constructor(
    @InjectRepository(RutaSemanal)
    private readonly repo: Repository<RutaSemanal>,
  ) {}

  async cerrarSemanasVencidas(ahora = new Date()): Promise<number> {
    const abiertas = await this.repo.find({ where: { estado: 'en_progreso' } });
    let n = 0;
    for (const ruta of abiertas) {
      if (!semanaVencida(new Date(ruta.semanaFin).toISOString(), ahora)) continue;
      ruta.estado = 'cerrada';
      ruta.arrastre = calcularArrastre(ruta.paradas as ParadaLite[]);
      await this.repo.save(ruta);
      n++;
    }
    return n;
  }

  async getRutaDeLaSemana(gestorId: string, ahora = new Date()): Promise<RutaSemanal | null> {
    await this.cerrarSemanasVencidas(ahora);
    const { inicioISO } = limitesSemana(ahora);
    return this.repo.findOne({ where: { gestorId, semanaInicio: new Date(inicioISO) } });
  }

  async crearRutaSemana(input: CrearRutaInput): Promise<RutaSemanal> {
    const ahora = input.ahora ?? new Date();
    const { inicioISO, finISO } = limitesSemana(ahora);
    const existente = await this.repo.findOne({ where: { gestorId: input.gestorId, semanaInicio: new Date(inicioISO) } });
    if (existente) {
      existente.paradas = input.paradas as RutaSemanal['paradas'];
      existente.segmentos = input.segmentos;
      existente.estado = 'en_progreso';
      return this.repo.save(existente);
    }
    const ruta = this.repo.create({
      gestorId: input.gestorId,
      semanaInicio: new Date(inicioISO),
      semanaFin: new Date(finISO),
      estado: 'en_progreso',
      paradas: input.paradas as RutaSemanal['paradas'],
      segmentos: input.segmentos,
      arrastre: [],
    });
    return this.repo.save(ruta);
  }

  async cancelarRuta(rutaId: string, callerId: string, esAdmin: boolean): Promise<RutaSemanal> {
    const ruta = await this.repo.findOne({ where: { id: rutaId } });
    if (!ruta) throw new NotFoundException('Ruta semanal no encontrada');
    if (!esAdmin && ruta.gestorId !== callerId) throw new ForbiddenException('No puedes cancelar una ruta de otro gestor');
    if (ruta.estado === 'cerrada') throw new BadRequestException('No se puede cancelar una ruta ya cerrada');
    ruta.estado = 'cancelada';
    return this.repo.save(ruta);
  }

  async getArrastrePendiente(gestorId: string): Promise<string[]> {
    const cerradas = await this.repo.find({ where: { gestorId, estado: 'cerrada' }, order: { semanaInicio: 'DESC' }, take: 1 });
    return cerradas[0]?.arrastre ?? [];
  }
}
