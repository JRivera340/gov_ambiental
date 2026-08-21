import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitaPunto } from './entities/visita-punto.entity';
import { isoWeekLabel } from '../rutas-semanales/lib/plan-semanal.util';
import { semanasDelCiclo } from '../rutas-semanales/lib/ciclo-semanal.util';
import { RutasSemanalesService } from '../rutas-semanales/rutas-semanales.service';
import { AsignacionesService } from '../asignaciones/asignaciones.service';

export type SemanaDesempeno = {
  slot: 0 | 1;
  esActual: boolean;
  inicioISO: string;
  finISO: string;
  // "Semana del 17 al 23 de agosto" — la UI muestra esto, nunca "2026-W34".
  etiqueta: string;
  planificados: number;
  visitados: number;
  pct: number;
};

export type DesempenoGestor = {
  gestorId: string;
  asignados: number;
  semanas: [SemanaDesempeno, SemanaDesempeno];
  visitasFueraDePlan: number;
};

export type ResumenDesempeno = {
  cicloInicioISO: string;
  cicloFinISO: string;
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
  // deduplica, "visitado esta semana" se deriva contando filas.
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
  // Se consulta por rango y no por igualdad de semanaISO a propósito: una
  // visita adelantada a un punto de la semana siguiente tiene que contar para
  // esa semana, no perderse. semanaISO queda como dato de auditoría.
  async getIdsVisitadosEnRango(gestorId: string, desdeISO: string, hastaISO: string): Promise<Set<string>> {
    const filas = await this.repo
      .createQueryBuilder('v')
      .select('DISTINCT v."puntoResiduoId"', 'puntoResiduoId')
      .where('v."gestorId" = :gestorId', { gestorId })
      .andWhere('v.fecha BETWEEN :desde AND :hasta', { desde: new Date(desdeISO), hasta: new Date(hastaISO) })
      .getRawMany<{ puntoResiduoId: string }>();
    return new Set(filas.map((f) => f.puntoResiduoId));
  }

  // Plan del ciclo con los puntos que el gestor ya visitó en cada semana. Es
  // lo que consume la ruta y el perfil del gestor: una sola fuente de verdad
  // sobre qué está visitado, en vez de que cada pantalla lo dedujera por su
  // cuenta (había cuatro definiciones distintas y no coincidían).
  async getPlanConVisitas(gestorId: string, ahora = new Date()) {
    const plan = await this.rutasSemanalesService.getPlanCiclo(gestorId, ahora);
    const semanas = await Promise.all(
      plan.semanas.map(async (s) => {
        const visitados = await this.getIdsVisitadosEnRango(gestorId, s.ventanaDesdeISO, s.finISO);
        return { ...s, visitados: s.planificados.filter((puntoId) => visitados.has(puntoId)) };
      }),
    );
    return { ...plan, semanas };
  }

  // Desempeño del ciclo de 2 semanas por gestor. Cada punto se cuenta en la
  // semana a la que pertenece, así que visitar un punto de la semana que viene
  // suma en esa semana en vez de no sumar en ninguna (que era el bug: gestores
  // que sí recorrieron sus puntos aparecían en 0%).
  async getResumenDesempeno(gestorId?: string, ahora = new Date()): Promise<ResumenDesempeno> {
    const todos = await this.gestorIdsConAsignaciones();
    const gestorIds = gestorId ? todos.filter((id) => id === gestorId) : todos;

    const resultado: DesempenoGestor[] = [];
    let cicloInicioISO = '';
    let cicloFinISO = '';

    for (const id of gestorIds) {
      const plan = await this.rutasSemanalesService.getPlanCiclo(id, ahora);
      cicloInicioISO = plan.semanas[0].inicioISO;
      cicloFinISO = plan.semanas[1].finISO;

      const visitadosPorSemana = await Promise.all(
        plan.semanas.map((s) => this.getIdsVisitadosEnRango(id, s.ventanaDesdeISO, s.finISO)),
      );

      const semanas = plan.semanas.map((s, i) => {
        const visitados = s.planificados.filter((puntoId) => visitadosPorSemana[i].has(puntoId)).length;
        return {
          slot: s.slot,
          esActual: s.esActual,
          inicioISO: s.inicioISO,
          finISO: s.finISO,
          etiqueta: s.etiqueta,
          planificados: s.planificados.length,
          visitados,
          pct: s.planificados.length > 0 ? Math.round((visitados / s.planificados.length) * 100) : 0,
        };
      }) as [SemanaDesempeno, SemanaDesempeno];

      // Visitas a puntos que ya no están en ningún plan (reasignados o sin
      // asignación): se muestran aparte para que ningún trabajo real quede
      // invisible, pero no inflan el porcentaje.
      const enPlan = new Set(plan.semanas.flatMap((s) => s.planificados));
      const visitadosTodos = new Set<string>([...visitadosPorSemana[0], ...visitadosPorSemana[1]]);
      const visitasFueraDePlan = [...visitadosTodos].filter((puntoId) => !enPlan.has(puntoId)).length;

      resultado.push({ gestorId: id, asignados: plan.asignados, semanas, visitasFueraDePlan });
    }

    if (!cicloInicioISO) {
      const [actual, siguiente] = semanasDelCiclo(ahora);
      cicloInicioISO = actual.inicioISO;
      cicloFinISO = siguiente.finISO;
    }

    const sumar = (pick: (s: SemanaDesempeno) => number) =>
      resultado.reduce((total, g) => total + g.semanas.reduce((sub, s) => sub + pick(s), 0), 0);

    return {
      cicloInicioISO,
      cicloFinISO,
      gestores: resultado,
      targetTotal: sumar((s) => s.planificados),
      actualTotal: sumar((s) => s.visitados),
    };
  }
}
