import { VisitasService } from './visitas.service';
import { semanasDelCiclo } from '../rutas-semanales/lib/ciclo-semanal.util';

const AHORA = new Date('2026-08-21T15:00:00.000Z');
const [SEM_ACTUAL, SEM_SIGUIENTE] = semanasDelCiclo(AHORA);

// El repo real resuelve getIdsVisitadosEnRango con un query builder; acá se
// simula filtrando el store en memoria por gestor y rango de fechas.
const makeRepo = () => {
  const store: any[] = [];
  return {
    store,
    create: (data: any) => ({ ...data }),
    save: async (v: any) => { const withId = { ...v, id: `v-${store.length + 1}` }; store.push(withId); return withId; },
    find: async ({ where }: any) => store.filter((v) =>
      (where.gestorId === undefined || v.gestorId === where.gestorId) &&
      (where.semanaISO === undefined || v.semanaISO === where.semanaISO),
    ),
    delete: async ({ puntoResiduoId }: any) => {
      for (let i = store.length - 1; i >= 0; i--) {
        if (store[i].puntoResiduoId === puntoResiduoId) store.splice(i, 1);
      }
    },
    createQueryBuilder: () => {
      const filtros: any = {};
      const qb: any = {
        select: () => qb,
        where: (_: string, params: any) => { Object.assign(filtros, params); return qb; },
        andWhere: (_: string, params: any) => { Object.assign(filtros, params); return qb; },
        getRawMany: async () => {
          const desde = new Date(filtros.desde).getTime();
          const hasta = new Date(filtros.hasta).getTime();
          const ids = new Set(
            store
              .filter((v) => v.gestorId === filtros.gestorId)
              .filter((v) => {
                const t = new Date(v.fecha).getTime();
                return t >= desde && t <= hasta;
              })
              .map((v) => v.puntoResiduoId),
          );
          return [...ids].map((puntoResiduoId) => ({ puntoResiduoId }));
        },
      };
      return qb;
    },
  };
};

// p1 (emergencia) y p2 caen en la semana en curso; p3 en la siguiente.
const rutasStub = {
  getPlanCiclo: async (gestorId: string) => ({
    gestorId,
    asignados: 4,
    semanas: [
      { ...SEM_ACTUAL, esActual: true, emergencia: ['p1'], regular: ['p2'], planificados: ['p1', 'p2'] },
      { ...SEM_SIGUIENTE, esActual: false, emergencia: [], regular: ['p3'], planificados: ['p3'] },
    ],
  }),
};

const asignacionesStub = {
  getMapaCompleto: async () => [
    { puntoResiduoId: 'p1', gestorId: 'g1' },
    { puntoResiduoId: 'p2', gestorId: 'g1' },
    { puntoResiduoId: 'p3', gestorId: 'g1' },
    { puntoResiduoId: 'p4', gestorId: 'g1' },
  ],
  getPuntosDeGestor: async () => ['p1', 'p2', 'p3', 'p4'],
};

describe('VisitasService', () => {
  it('registrarVisita guarda con la semanaISO derivada de la fecha', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, {} as any, {} as any);
    const visita = await service.registrarVisita('punto-1', 'gestor-1', new Date('2026-08-18T12:00:00Z'));
    expect(visita.puntoResiduoId).toBe('punto-1');
    expect(visita.gestorId).toBe('gestor-1');
    expect(visita.semanaISO).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('cuenta cada punto en la semana del ciclo a la que pertenece', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', AHORA);

    const resumen = await service.getResumenDesempeno('g1', AHORA);
    const [actual, siguiente] = resumen.gestores[0].semanas;
    expect(actual.planificados).toBe(2);
    expect(actual.visitados).toBe(1);
    expect(actual.pct).toBe(50);
    expect(siguiente.visitados).toBe(0);
  });

  // El bug que motivó el rediseño: el gestor adelantaba trabajo sobre puntos
  // de la otra mitad y ese avance no sumaba en ninguna parte (aparecía 0%).
  it('una visita adelantada a un punto de la semana siguiente suma en ESA semana, no se pierde', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p3', 'g1', AHORA);

    const resumen = await service.getResumenDesempeno('g1', AHORA);
    const [actual, siguiente] = resumen.gestores[0].semanas;
    expect(actual.visitados).toBe(0);
    expect(siguiente.visitados).toBe(1);
    expect(siguiente.pct).toBe(100);
    expect(resumen.gestores[0].visitasFueraDePlan).toBe(0);
  });

  it('varias visitas al mismo punto cuentan una sola vez', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p2', 'g1', AHORA);
    await service.registrarVisita('p2', 'g1', AHORA);

    const resumen = await service.getResumenDesempeno('g1', AHORA);
    expect(resumen.gestores[0].semanas[0].visitados).toBe(1);
  });

  it('las visitas a puntos fuera del plan se reportan aparte y no inflan el pct', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p9', 'g1', AHORA);

    const resumen = await service.getResumenDesempeno('g1', AHORA);
    expect(resumen.gestores[0].visitasFueraDePlan).toBe(1);
    expect(resumen.gestores[0].semanas[0].visitados).toBe(0);
  });

  it('los totales suman las dos semanas del ciclo', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', AHORA);
    await service.registrarVisita('p3', 'g1', AHORA);

    const resumen = await service.getResumenDesempeno('g1', AHORA);
    expect(resumen.targetTotal).toBe(3);
    expect(resumen.actualTotal).toBe(2);
  });

  it('expone el rango del ciclo con etiquetas legibles, sin formato de semana ISO', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    const resumen = await service.getResumenDesempeno('g1', AHORA);
    expect(resumen.cicloInicioISO).toBe(SEM_ACTUAL.inicioISO);
    expect(resumen.cicloFinISO).toBe(SEM_SIGUIENTE.finISO);
    for (const semana of resumen.gestores[0].semanas) {
      expect(semana.etiqueta).toMatch(/^Semana del /);
      expect(semana.etiqueta).not.toMatch(/W\d/);
    }
  });

  it('getResumenDesempeno filtra por gestorId cuando se pasa', async () => {
    const repo = makeRepo();
    const soloDosGestores = {
      getMapaCompleto: async () => [
        { puntoResiduoId: 'p1', gestorId: 'g1' },
        { puntoResiduoId: 'p2', gestorId: 'g2' },
      ],
      getPuntosDeGestor: async () => ['p2'],
    };
    const service = new VisitasService(repo as any, rutasStub as any, soloDosGestores as any);

    const resumen = await service.getResumenDesempeno('g2', AHORA);
    expect(resumen.gestores).toHaveLength(1);
    expect(resumen.gestores[0].gestorId).toBe('g2');
  });

  it('gestores sin asignaciones no aparecen en el resumen', async () => {
    const repo = makeRepo();
    const sinGestor = {
      getMapaCompleto: async () => [{ puntoResiduoId: 'p1', gestorId: null }],
      getPuntosDeGestor: async () => [],
    };
    const service = new VisitasService(repo as any, rutasStub as any, sinGestor as any);

    const resumen = await service.getResumenDesempeno(undefined, AHORA);
    expect(resumen.gestores).toHaveLength(0);
    // Aun sin gestores, el ciclo tiene que venir informado para la UI.
    expect(resumen.cicloInicioISO).toBe(SEM_ACTUAL.inicioISO);
  });

  it('eliminarDePunto borra las visitas del punto (no quedan huerfanas)', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', AHORA);
    await service.registrarVisita('p2', 'g1', AHORA);

    await service.eliminarDePunto('p1');
    expect(repo.store.map((v) => v.puntoResiduoId)).toEqual(['p2']);
  });
});
