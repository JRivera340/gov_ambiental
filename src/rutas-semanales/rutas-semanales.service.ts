import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RutaSemanal } from './entities/ruta-semanal.entity';
import type { ParadaLite } from './lib/paradas.types';
import { limitesSemana, semanaVencida, calcularArrastre } from './lib/ruta-semanal.util';
import { isoWeekLabel, isoWeekParity, splitAlternado } from './lib/plan-semanal.util';
import { PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { esPuntoEnEmergencia } from '../puntos/lib/emergencia.util';
import { AsignacionesService } from '../asignaciones/asignaciones.service';

export type CrearRutaInput = {
  gestorId: string; paradas: ParadaLite[]; segmentos: unknown[]; ahora?: Date;
};

export type PlanSemanal = {
  emergencia: string[];
  regular: string[];
  semanaISO: string;
};

@Injectable()
export class RutasSemanalesService {
  constructor(
    @InjectRepository(RutaSemanal)
    private readonly repo: Repository<RutaSemanal>,
    @InjectRepository(PuntoResiduo)
    private readonly puntosRepo: Repository<PuntoResiduo>,
    private readonly asignacionesService: AsignacionesService,
  ) {}

  // Plan semanal automático del gestor: los puntos en emergencia (≥4 días
  // sin recoger, ver emergencia.util.ts) siempre entran, sin tope. Del resto
  // de los puntos asignados, se muestra el 50% que corresponde según la
  // paridad de la semana ISO (ver plan-semanal.util.ts) — la otra mitad
  // aparece la semana siguiente, alternando.
  async getPlanSemanal(gestorId: string, ahora = new Date()): Promise<PlanSemanal> {
    const asignadosIds = await this.asignacionesService.getPuntosDeGestor(gestorId);
    if (asignadosIds.length === 0) {
      return { emergencia: [], regular: [], semanaISO: isoWeekLabel(ahora) };
    }
    const puntos = await this.puntosRepo.find({ where: { id: In(asignadosIds) } });

    const emergencia: string[] = [];
    const regulares: PuntoResiduo[] = [];
    for (const p of puntos) {
      if (esPuntoEnEmergencia(p, ahora)) emergencia.push(p.id);
      else regulares.push(p);
    }
    regulares.sort((a, b) => (a.pointNumber ?? 0) - (b.pointNumber ?? 0));
    const paridad = isoWeekParity(ahora);
    const regular = splitAlternado(regulares.map((p) => p.id), paridad);

    return { emergencia, regular, semanaISO: isoWeekLabel(ahora) };
  }

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
