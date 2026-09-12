import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitaPunto } from './entities/visita-punto.entity';
import { isoWeekLabel } from '../rutas-semanales/lib/plan-semanal.util';
import { limitesQuincena } from '../rutas-semanales/lib/ciclo-quincenal.util';
import { RutasSemanalesService, type QuincenaHistorial } from '../rutas-semanales/rutas-semanales.service';
import { AsignacionesService } from '../asignaciones/asignaciones.service';

export type DesempenoGestor = {
  gestorId: string;
  asignados: number;
  planificados: number;
  visitados: number;
  pct: number;
  visitasFueraDePlan: number;
};

export type ResumenDesempeno = {
  quincenaInicioISO: string;
  quincenaFinISO: string;
  // "Quincena del 10 al 23 de agosto" — la UI muestra esto, nunca "2026-W34".
  etiqueta: string;
  gestores: DesempenoGestor[];
  targetTotal: number;
  actualTotal: number;
};

export const DIAS_REQUERIDOS_POR_MITAD = 4;

export type ProgresoFrecuencia = {
  // Días distintos de visita en la mitad de quincena que está corriendo AHORA
  // — lo que el gestor necesita ver para saber si le falta volver esta semana.
  diasMitadActual: number;
  // Días distintos en la otra mitad (la que ya pasó o la que viene).
  diasMitadRestante: number;
  requerido: number;
  cumpleMitadActual: boolean;
  cumpleMitadRestante: boolean;
};

@Injectable()
export class VisitasService {
  constructor(
    @InjectRepository(VisitaPunto)
    private readonly repo: Repository<VisitaPunto>,
    private readonly rutasSemanalesService: RutasSemanalesService,
    private readonly asignacionesService: AsignacionesService,
  ) {}

  // Registra una visita real de un gestor a un punto (llamado desde
  // PuntosService en cada acción de seguimiento — marcar recogido, agregar
  // residuo o agregar nota, ver puntos.service.ts). Append-only: no
  // deduplica, "visitado en la quincena" se deriva contando filas.
  async registrarVisita(puntoResiduoId: string, gestorId: string, fecha: Date = new Date()): Promise<VisitaPunto> {
    const visita = this.repo.create({
      puntoResiduoId,
      gestorId,
      fecha,
      semanaISO: isoWeekLabel(fecha),
    });
    return this.repo.save(visita);
  }

  async getVisitasPorGestor(gestorId: string, semanaISO: string): Promise<VisitaPunto[]> {
    return this.repo.find({ where: { gestorId, semanaISO } });
  }

  // La tabla no tiene FK contra puntos_residuo (append-only, sin cascada), asi
  // que al borrar un punto hay que limpiar sus visitas a mano o quedan filas
  // huerfanas apuntando a un punto inexistente.
  async eliminarDePunto(puntoResiduoId: string): Promise<void> {
    await this.repo.delete({ puntoResiduoId });
  }

  // Este módulo no tiene tabla de usuarios propia (identidad compartida con
  // el hub, ver PLAN-MAESTRO.md) — la lista de "gestores con actividad" se
  // deriva de los gestorId ya presentes en punto_asignacion (dato propio de
  // ambiental, siempre confiable), no de un directorio de usuarios. Los
  // nombres para mostrar los resuelve el frontend (usersService.getGestores(),
  // vía el proxy al hub en /users/gestores/list).
  private async gestorIdsConAsignaciones(): Promise<string[]> {
    const mapa = await this.asignacionesService.getMapaCompleto();
    const ids = new Set<string>();
    for (const fila of mapa) {
      if (fila.gestorId) ids.add(fila.gestorId);
    }
    return Array.from(ids);
  }

  // Ids de puntos que el gestor visitó al menos una vez dentro de un rango de
  // fechas (presencia cruda, sin exigir frecuencia). Ya no se usa para decidir
  // "cumplido" en ningún tablero — un solo toque no basta, ver
  // getIdsCumplenFrecuenciaEnRango — pero sigue sirviendo para detectar
  // visitas a puntos fuera del plan (getResumenDesempeno).
  async getIdsVisitadosEnRango(gestorId: string, desdeISO: string, hastaISO: string): Promise<Set<string>> {
    const filas = await this.repo
      .createQueryBuilder('v')
      .select('DISTINCT v."puntoResiduoId"', 'puntoResiduoId')
      .where('v."gestorId" = :gestorId', { gestorId })
      .andWhere('v.fecha BETWEEN :desde AND :hasta', { desde: new Date(desdeISO), hasta: new Date(hastaISO) })
      .getRawMany<{ puntoResiduoId: string }>();
    return new Set(filas.map((f) => f.puntoResiduoId));
  }

  // Corta el rango de la quincena en dos mitades de calendario: la primera de
  // 7 días, la segunda con el resto (6 a 9 días según el mes). No es semana
  // ISO — la quincena ya es un bloque de calendario propio (ver
  // ciclo-quincenal.util.ts), partirla así evita el bug que ya se dio acá una
  // vez con el universo de puntos por semana (ver comentario en
  // getResumenDesempeno): esto NO toca el universo de puntos, solo cuenta
  // días de visita dentro de un punto que ya está en el plan.
  private mitadesDeQuincena(desdeISO: string, hastaISO: string): [Date, Date, Date] {
    const DIA_MS = 24 * 60 * 60 * 1000;
    const inicio = new Date(desdeISO);
    const fin = new Date(hastaISO);
    const corte = new Date(inicio.getTime() + 7 * DIA_MS);
    return [inicio, corte, fin];
  }

  // Días distintos de visita por punto, separados por mitad de quincena.
  // Compartido por getIdsCumplenFrecuenciaEnRango (decide "cumplido") y
  // getProgresoFrecuencia (progreso crudo para mostrarle al gestor).
  private async contarDiasPorMitad(
    gestorId: string,
    desdeISO: string,
    hastaISO: string,
  ): Promise<{ porPunto: Map<string, [Set<string>, Set<string>]>; corte: Date }> {
    const [inicio, corte, fin] = this.mitadesDeQuincena(desdeISO, hastaISO);
    const filas = await this.repo
      .createQueryBuilder('v')
      .select('v."puntoResiduoId"', 'puntoResiduoId')
      .addSelect(`date_trunc('day', v.fecha)`, 'dia')
      .where('v."gestorId" = :gestorId', { gestorId })
      .andWhere('v.fecha BETWEEN :desde AND :hasta', { desde: inicio, hasta: fin })
      .distinct(true)
      .getRawMany<{ puntoResiduoId: string; dia: Date }>();

    // puntoId -> [días distintos mitad 1, días distintos mitad 2]
    const porPunto = new Map<string, [Set<string>, Set<string>]>();
    for (const fila of filas) {
      const dia = new Date(fila.dia);
      const idxMitad = dia.getTime() < corte.getTime() ? 0 : 1;
      if (!porPunto.has(fila.puntoResiduoId)) porPunto.set(fila.puntoResiduoId, [new Set(), new Set()]);
      porPunto.get(fila.puntoResiduoId)![idxMitad].add(dia.toISOString());
    }
    return { porPunto, corte };
  }

  // Ids de puntos que el gestor visitó con la frecuencia mínima exigida: al
  // menos 4 días DISTINTOS de visita en CADA mitad de la quincena (no solo un
  // toque inicial y nunca más — ese era el bug: un punto con una sola visita
  // en toda la quincena salía "visitado" al 100%). Reemplaza a
  // getIdsVisitadosEnRango en todo cálculo de cumplimiento.
  async getIdsCumplenFrecuenciaEnRango(gestorId: string, desdeISO: string, hastaISO: string): Promise<Set<string>> {
    const { porPunto } = await this.contarDiasPorMitad(gestorId, desdeISO, hastaISO);
    const resultado = new Set<string>();
    for (const [puntoId, [mitad1, mitad2]] of porPunto) {
      if (mitad1.size >= DIAS_REQUERIDOS_POR_MITAD && mitad2.size >= DIAS_REQUERIDOS_POR_MITAD) {
        resultado.add(puntoId);
      }
    }
    return resultado;
  }

  // Progreso crudo de frecuencia por punto, para mostrarle al gestor cuánto le
  // falta en la ruta — no solo "visitado sí/no" al final, sino "vas 2 de 4
  // esta semana" mientras la quincena sigue corriendo.
  async getProgresoFrecuencia(
    gestorId: string,
    desdeISO: string,
    hastaISO: string,
    ahora = new Date(),
  ): Promise<Map<string, ProgresoFrecuencia>> {
    const { porPunto, corte } = await this.contarDiasPorMitad(gestorId, desdeISO, hastaISO);
    const mitadActualIdx = ahora.getTime() < corte.getTime() ? 0 : 1;

    const resultado = new Map<string, ProgresoFrecuencia>();
    for (const [puntoId, mitades] of porPunto) {
      const diasMitadActual = mitades[mitadActualIdx].size;
      const diasMitadRestante = mitades[mitadActualIdx === 0 ? 1 : 0].size;
      resultado.set(puntoId, {
        diasMitadActual,
        diasMitadRestante,
        requerido: DIAS_REQUERIDOS_POR_MITAD,
        cumpleMitadActual: diasMitadActual >= DIAS_REQUERIDOS_POR_MITAD,
        cumpleMitadRestante: diasMitadRestante >= DIAS_REQUERIDOS_POR_MITAD,
      });
    }
    return resultado;
  }

  // Plan de la quincena con los puntos que el gestor ya visitó. Es lo que
  // consume la ruta y el perfil del gestor: una sola fuente de verdad sobre qué
  // está visitado, en vez de que cada pantalla lo dedujera por su cuenta (había
  // cuatro definiciones distintas y no coincidían).
  async getPlanConVisitas(gestorId: string, ahora = new Date()) {
    const plan = await this.rutasSemanalesService.getPlanQuincena(gestorId, ahora);
    const q = plan.quincena;
    const visitados = await this.getIdsCumplenFrecuenciaEnRango(gestorId, q.inicioISO, q.finISO);
    const progresoPorPunto = await this.getProgresoFrecuencia(gestorId, q.inicioISO, q.finISO, ahora);
    const progresoVisitas: Record<string, ProgresoFrecuencia> = {};
    for (const puntoId of q.planificados) {
      progresoVisitas[puntoId] = progresoPorPunto.get(puntoId) ?? {
        diasMitadActual: 0,
        diasMitadRestante: 0,
        requerido: DIAS_REQUERIDOS_POR_MITAD,
        cumpleMitadActual: false,
        cumpleMitadRestante: false,
      };
    }
    return {
      ...plan,
      quincena: {
        ...q,
        visitados: q.planificados.filter((puntoId) => visitados.has(puntoId)),
        progresoVisitas,
      },
    };
  }

  // Historial de quincenas cerradas con el cumplimiento REAL.
  //
  // El universo son los puntos asignados al gestor (lo arma getHistorial) y acá
  // se marca cuáles visitó dentro del rango de cada quincena, con la misma
  // fuente que usa getResumenDesempeno: la tabla visitas_punto, que registra
  // las tres acciones de seguimiento (marcar recogido, agregar residuo, agregar
  // nota).
  //
  // `paradas[].visitado` de la tabla de rutas no sirve: se escribe una sola vez,
  // al crear la ruta —cuando el gestor todavía no visitó nada— y nunca se
  // actualiza.
  async getHistorialConVisitas(gestorId: string, limite = 20, ahora = new Date()): Promise<QuincenaHistorial[]> {
    const quincenas = await this.rutasSemanalesService.getHistorial(gestorId, limite, ahora);

    return Promise.all(
      quincenas.map(async (q) => {
        const visitadosIds = await this.getIdsCumplenFrecuenciaEnRango(gestorId, q.inicioISO, q.finISO);
        const paradas = q.paradas.map((p) => ({ ...p, visitado: visitadosIds.has(p.puntoId) }));
        // Sin visitar primero: es lo que el supervisor necesita ver.
        paradas.sort((a, b) => {
          if (a.visitado !== b.visitado) return Number(a.visitado) - Number(b.visitado);
          return (a.pointNumber ?? 0) - (b.pointNumber ?? 0);
        });
        const visitados = paradas.filter((p) => p.visitado).length;
        return {
          ...q,
          paradas,
          planificados: paradas.length,
          visitados,
          pendientes: paradas.length - visitados,
          pct: paradas.length > 0 ? Math.round((visitados / paradas.length) * 100) : 0,
        };
      }),
    );
  }

  // Desempeño de la quincena por gestor: un solo bloque de calendario contra el
  // 100% de los puntos asignados. Antes se medía por semana con la mitad de los
  // puntos en cada una, y las visitas a la mitad que no tocaba no sumaban en
  // ningún lado (gestores que sí recorrieron sus puntos aparecían en 0%).
  async getResumenDesempeno(gestorId?: string, ahora = new Date()): Promise<ResumenDesempeno> {
    const todos = await this.gestorIdsConAsignaciones();
    const gestorIds = gestorId ? todos.filter((id) => id === gestorId) : todos;
    const rango = limitesQuincena(ahora);

    const gestores: DesempenoGestor[] = [];
    for (const id of gestorIds) {
      const plan = await this.rutasSemanalesService.getPlanQuincena(id, ahora);
      const q = plan.quincena;
      const cumpleFrecuenciaIds = await this.getIdsCumplenFrecuenciaEnRango(id, q.inicioISO, q.finISO);
      const visitados = q.planificados.filter((puntoId) => cumpleFrecuenciaIds.has(puntoId)).length;

      // Visitas a puntos que ya no están en el plan (reasignados o sin
      // asignación): se muestran aparte para que ningún trabajo real quede
      // invisible, pero no inflan el porcentaje. Acá sí basta presencia cruda
      // (no frecuencia) — es solo para no perder de vista trabajo hecho fuera
      // del plan, no mide cumplimiento.
      const visitadosIdsCrudo = await this.getIdsVisitadosEnRango(id, q.inicioISO, q.finISO);
      const enPlan = new Set(q.planificados);
      const visitasFueraDePlan = [...visitadosIdsCrudo].filter((puntoId) => !enPlan.has(puntoId)).length;

      gestores.push({
        gestorId: id,
        asignados: plan.asignados,
        planificados: q.planificados.length,
        visitados,
        pct: q.planificados.length > 0 ? Math.round((visitados / q.planificados.length) * 100) : 0,
        visitasFueraDePlan,
      });
    }

    return {
      quincenaInicioISO: rango.inicioISO,
      quincenaFinISO: rango.finISO,
      etiqueta: rango.etiqueta,
      gestores,
      targetTotal: gestores.reduce((t, g) => t + g.planificados, 0),
      actualTotal: gestores.reduce((t, g) => t + g.visitados, 0),
    };
  }
}
