import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { RutaSemanal } from './entities/ruta-semanal.entity';
import type { ParadaLite } from './lib/paradas.types';
import { semanaVencida, calcularArrastre } from './lib/ruta-semanal.util';
import { limitesQuincena, type RangoQuincena } from './lib/ciclo-quincenal.util';
import { PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { esPuntoEnEmergencia } from '../puntos/lib/emergencia.util';
import { AsignacionesService } from '../asignaciones/asignaciones.service';

export type CrearRutaInput = {
  gestorId: string; paradas: ParadaLite[]; segmentos: unknown[]; ahora?: Date;
};

export type QuincenaPlan = RangoQuincena & {
  // Puntos vencidos (≥4 días sin recoger, ver emergencia.util.ts). Ya no se
  // "adelantan" de una semana a la otra — la quincena es un bloque único — pero
  // siguen yendo primero en el orden del plan.
  emergencia: string[];
  regular: string[];
  // emergencia + regular, que es contra lo que se mide el cumplimiento.
  planificados: string[];
};

export type PlanQuincena = {
  gestorId: string;
  asignados: number;
  quincena: QuincenaPlan;
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

  // Plan de la quincena: el 100% de los puntos asignados al gestor, disponibles
  // durante los 14 días.
  //
  // Antes el ciclo eran dos semanas y cada punto caía en una mitad fija
  // (mitadDePunto), así que la ruta de una semana solo podía cubrir la mitad de
  // los asignados. Ahora no hay reparto: el único orden es prioridad
  // (emergencias primero, después por número de punto).
  async getPlanQuincena(gestorId: string, ahora = new Date()): Promise<PlanQuincena> {
    const rango = limitesQuincena(ahora);
    const armar = (emergencia: string[], regular: string[]): QuincenaPlan => ({
      ...rango,
      emergencia,
      regular,
      planificados: [...emergencia, ...regular],
    });

    const asignadosIds = await this.asignacionesService.getPuntosDeGestor(gestorId);
    if (asignadosIds.length === 0) {
      return { gestorId, asignados: 0, quincena: armar([], []) };
    }

    const puntos = await this.puntosRepo.find({ where: { id: In(asignadosIds) } });
    const porNumero = [...puntos].sort((a, b) => (a.pointNumber ?? 0) - (b.pointNumber ?? 0));

    const emergencia: string[] = [];
    const regular: string[] = [];
    for (const p of porNumero) {
      if (esPuntoEnEmergencia(p, ahora)) emergencia.push(p.id);
      else regular.push(p.id);
    }

    return { gestorId, asignados: puntos.length, quincena: armar(emergencia, regular) };
  }

  async cerrarQuincenasVencidas(ahora = new Date()): Promise<number> {
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

  async getRutaDeLaQuincena(gestorId: string, ahora = new Date()): Promise<RutaSemanal | null> {
    await this.cerrarQuincenasVencidas(ahora);
    const { inicioISO } = limitesQuincena(ahora);
    return this.repo.findOne({ where: { gestorId, semanaInicio: new Date(inicioISO) } });
  }

  // Rutas cerradas de quincenas anteriores. Es la fuente del historial: el
  // frontend del gestor guardaba su historial en localStorage, así que el admin
  // no podía verlo — esto lee la tabla, que siempre tuvo el dato completo.
  async getHistorial(gestorId: string, limite = 20, ahora = new Date()): Promise<RutaSemanal[]> {
    await this.cerrarQuincenasVencidas(ahora);
    const { inicioISO } = limitesQuincena(ahora);
    return this.repo.find({
      where: { gestorId, semanaInicio: LessThan(new Date(inicioISO)) },
      order: { semanaInicio: 'DESC' },
      take: Math.min(Math.max(limite, 1), 100),
    });
  }

  async crearRutaQuincena(input: CrearRutaInput): Promise<RutaSemanal> {
    const ahora = input.ahora ?? new Date();
    const { inicioISO, finISO } = limitesQuincena(ahora);
    const existente = await this.repo.findOne({ where: { gestorId: input.gestorId, semanaInicio: new Date(inicioISO) } });
    if (existente) {
      existente.paradas = input.paradas as RutaSemanal['paradas'];
      existente.segmentos = input.segmentos;
      existente.estado = 'en_progreso';
      // La quincena puede haber tomado el lugar de una ruta semanal vieja que
      // arrancaba el mismo lunes: hay que estirar el fin a los 14 días.
      existente.semanaFin = new Date(finISO);
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
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
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
