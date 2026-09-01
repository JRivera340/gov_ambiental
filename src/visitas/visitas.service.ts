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

  // Ids de puntos que el gestor visitó dentro de un rango de fechas.
  //
  // Se consulta por rango y no por igualdad de semanaISO a propósito: la
  // quincena abarca dos semanas ISO, así que filtrar por semanaISO perdería la
  // mitad de las visitas. semanaISO queda como dato de auditoría.
  async getIdsVisitadosEnRango(gestorId: string, desdeISO: string, hastaISO: string): Promise<Set<string>> {
    const filas = await this.repo
      .createQueryBuilder('v')
      .select('DISTINCT v."puntoResiduoId"', 'puntoResiduoId')
      .where('v."gestorId" = :gestorId', { gestorId })
      .andWhere('v.fecha BETWEEN :desde AND :hasta', { desde: new Date(desdeISO), hasta: new Date(hastaISO) })
      .getRawMany<{ puntoResiduoId: string }>();
    return new Set(filas.map((f) => f.puntoResiduoId));
  }

  // Plan de la quincena con los puntos que el gestor ya visitó. Es lo que
  // consume la ruta y el perfil del gestor: una sola fuente de verdad sobre qué
  // está visitado, en vez de que cada pantalla lo dedujera por su cuenta (había
  // cuatro definiciones distintas y no coincidían).
  async getPlanConVisitas(gestorId: string, ahora = new Date()) {
    const plan = await this.rutasSemanalesService.getPlanQuincena(gestorId, ahora);
    const q = plan.quincena;
    const visitados = await this.getIdsVisitadosEnRango(gestorId, q.inicioISO, q.finISO);
    return {
      ...plan,
      quincena: { ...q, visitados: q.planificados.filter((puntoId) => visitados.has(puntoId)) },
    };
  }

  // Historial de quincenas cerradas con el cumplimiento REAL.
  //
  // `paradas[].visitado` de la tabla de rutas no sirve para esto: se escribe una
  // sola vez, al crear la ruta —cuando el gestor todavía no visitó nada— y nunca
  // se actualiza. El historial mostraba entonces 0% en quincenas que el gestor
  // había recorrido entera, contradiciendo al panel de Desempeño, que sí mide
  // contra visitas_punto. Acá se recalcula cada parada contra las visitas del
  // rango de la quincena, que es la misma fuente que usa getResumenDesempeno.
  async getHistorialConVisitas(gestorId: string, limite = 20, ahora = new Date()): Promise<QuincenaHistorial[]> {
    const quincenas = await this.rutasSemanalesService.getHistorial(gestorId, limite, ahora);

    return Promise.all(
      quincenas.map(async (q) => {
        const visitadosIds = await this.getIdsVisitadosEnRango(gestorId, q.inicioISO, q.finISO);
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
      const visitadosIds = await this.getIdsVisitadosEnRango(id, q.inicioISO, q.finISO);
      const visitados = q.planificados.filter((puntoId) => visitadosIds.has(puntoId)).length;

      // Visitas a puntos que ya no están en el plan (reasignados o sin
      // asignación): se muestran aparte para que ningún trabajo real quede
      // invisible, pero no inflan el porcentaje.
      const enPlan = new Set(q.planificados);
      const visitasFueraDePlan = [...visitadosIds].filter((puntoId) => !enPlan.has(puntoId)).length;

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
