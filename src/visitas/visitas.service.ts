import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitaPunto } from './entities/visita-punto.entity';
import { isoWeekLabel } from '../rutas-semanales/lib/plan-semanal.util';
import { RutasSemanalesService } from '../rutas-semanales/rutas-semanales.service';
import { AsignacionesService } from '../asignaciones/asignaciones.service';

export type DesempenoGestor = {
  gestorId: string;
  asignados: number;
  planificadosEstaSemana: number;
  visitados: number;
  pct: number;
};

export type ResumenDesempeno = {
  semanaISO: string;
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

  // Cruza el plan semanal (target: emergencia + regular de esa semana) con
  // las visitas reales registradas esa semana, por gestor. Si se pasa
  // gestorId, devuelve solo ese; si no, todos los que tengan asignaciones.
  async getResumenDesempeno(gestorId?: string, ahora = new Date()): Promise<ResumenDesempeno> {
    const semanaISO = isoWeekLabel(ahora);
    const todos = await this.gestorIdsConAsignaciones();
    const gestorIds = gestorId ? todos.filter((id) => id === gestorId) : todos;

    const resultado: DesempenoGestor[] = [];
    for (const id of gestorIds) {
      const plan = await this.rutasSemanalesService.getPlanSemanal(id, ahora);
      const planificados = new Set([...plan.emergencia, ...plan.regular]);
      const visitas = await this.getVisitasPorGestor(id, semanaISO);
      const visitadosSet = new Set(visitas.map((v) => v.puntoResiduoId));
      let visitados = 0;
      for (const puntoId of planificados) {
        if (visitadosSet.has(puntoId)) visitados++;
      }
      const asignadosIds = await this.asignacionesService.getPuntosDeGestor(id);
      resultado.push({
        gestorId: id,
        asignados: asignadosIds.length,
        planificadosEstaSemana: planificados.size,
        visitados,
        pct: planificados.size > 0 ? Math.round((visitados / planificados.size) * 100) : 0,
      });
    }

    const targetTotal = resultado.reduce((sum, r) => sum + r.planificadosEstaSemana, 0);
    const actualTotal = resultado.reduce((sum, r) => sum + r.visitados, 0);

    return { semanaISO, gestores: resultado, targetTotal, actualTotal };
  }
}
