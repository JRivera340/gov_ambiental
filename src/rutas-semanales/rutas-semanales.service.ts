import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RutaSemanal } from './entities/ruta-semanal.entity';
import type { ParadaLite } from './lib/paradas.types';
import { limitesSemana, semanaVencida, calcularArrastre } from './lib/ruta-semanal.util';
import { mitadDePunto, semanasDelCiclo, type RangoSemana } from './lib/ciclo-semanal.util';
import { PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { esPuntoEnEmergencia } from '../puntos/lib/emergencia.util';
import { AsignacionesService } from '../asignaciones/asignaciones.service';

export type CrearRutaInput = {
  gestorId: string; paradas: ParadaLite[]; segmentos: unknown[]; ahora?: Date;
  // Lunes de la semana del ciclo que se está planificando. Sin esto solo se
  // podía crear la ruta de la semana en curso, y el gestor no tenía forma de
  // armar la de la semana siguiente.
  semanaInicioISO?: string;
};

export type SemanaPlan = RangoSemana & {
  esActual: boolean;
  // Solo la semana en curso puede traer emergencias: un punto vencido se
  // adelanta a esta semana aunque por reparto le tocara la siguiente.
  emergencia: string[];
  regular: string[];
  // emergencia + regular, que es contra lo que se mide el cumplimiento.
  planificados: string[];
};

export type PlanCiclo = {
  gestorId: string;
  asignados: number;
  semanas: [SemanaPlan, SemanaPlan];
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

  // Plan del ciclo de 2 semanas: entre ambas cubren el 100% de los puntos
  // asignados al gestor. Cada punto cae siempre en la misma mitad
  // (mitadDePunto), salvo que esté en emergencia (≥4 días sin recoger, ver
  // emergencia.util.ts): esos se adelantan a la semana en curso, sin tope,
  // para que nada vencido espere una semana más.
  //
  // Antes esto devolvía una sola semana con la mitad de los puntos, mientras
  // la ruta del gestor listaba todos: las visitas a la otra mitad no contaban
  // en ningún lado.
  async getPlanCiclo(gestorId: string, ahora = new Date()): Promise<PlanCiclo> {
    const [semActual, semSiguiente] = semanasDelCiclo(ahora);
    const armar = (rango: RangoSemana, esActual: boolean, emergencia: string[], regular: string[]): SemanaPlan => ({
      ...rango,
      esActual,
      emergencia,
      regular,
      planificados: [...emergencia, ...regular],
    });

    const asignadosIds = await this.asignacionesService.getPuntosDeGestor(gestorId);
    if (asignadosIds.length === 0) {
      return {
        gestorId,
        asignados: 0,
        semanas: [armar(semActual, true, [], []), armar(semSiguiente, false, [], [])],
      };
    }

    const puntos = await this.puntosRepo.find({ where: { id: In(asignadosIds) } });
    const porNumero = [...puntos].sort((a, b) => (a.pointNumber ?? 0) - (b.pointNumber ?? 0));

    const emergencia: string[] = [];
    const regularActual: string[] = [];
    const regularSiguiente: string[] = [];

    for (const p of porNumero) {
      if (esPuntoEnEmergencia(p, ahora)) {
        emergencia.push(p.id);
        continue;
      }
      if (mitadDePunto(p) === semActual.slot) regularActual.push(p.id);
      else regularSiguiente.push(p.id);
    }

    return {
      gestorId,
      asignados: puntos.length,
      semanas: [
        armar(semActual, true, emergencia, regularActual),
        armar(semSiguiente, false, [], regularSiguiente),
      ],
    };
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

  // Las rutas de las dos semanas del ciclo, en el mismo orden que el plan.
  async getRutasDelCiclo(gestorId: string, ahora = new Date()): Promise<[RutaSemanal | null, RutaSemanal | null]> {
    await this.cerrarSemanasVencidas(ahora);
    const semanas = semanasDelCiclo(ahora);
    const rutas = await Promise.all(
      semanas.map((s) => this.repo.findOne({ where: { gestorId, semanaInicio: new Date(s.inicioISO) } })),
    );
    return [rutas[0] ?? null, rutas[1] ?? null];
  }

  async crearRutaSemana(input: CrearRutaInput): Promise<RutaSemanal> {
    const ahora = input.ahora ?? new Date();
    // Solo se puede planificar una de las dos semanas del ciclo: así el gestor
    // no arma la ruta de una semana que no corresponde.
    const semanas = semanasDelCiclo(ahora);
    const semana = input.semanaInicioISO
      ? semanas.find((s) => s.inicioISO === input.semanaInicioISO)
      : semanas[0];
    if (!semana) {
      throw new BadRequestException('La semana indicada no pertenece al ciclo actual');
    }
    const { inicioISO, finISO } = semana;
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
