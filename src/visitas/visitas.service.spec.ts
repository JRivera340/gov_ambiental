import { VisitasService } from './visitas.service';
import { limitesQuincena } from '../rutas-semanales/lib/ciclo-quincenal.util';

const AHORA = new Date('2026-08-21T15:00:00.000Z');
const QUINCENA = limitesQuincena(AHORA);

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

// p1 está en emergencia; p2 y p3 son regulares. Los tres entran en la misma
// quincena: ya no hay reparto en mitades.
const quincenaHistorial = {
  indice: 48637,
  inicioISO: '2026-07-16T05:00:00.000Z',
  finISO: '2026-08-01T04:59:59.999Z',
  etiqueta: 'Quincena del 16 al 31 de julio',
  rutas: [{
    id: 'r1', estado: 'cerrada' as const,
    inicioISO: '2026-07-20T05:00:00.000Z',
    finISO: '2026-07-27T04:59:59.999Z',
    cerradaISO: '2026-07-27T04:59:59.999Z',
  }],
  // Universo: los puntos asignados, todos sin visitar hasta que se cruce.
  paradas: [
    { puntoId: 'p1', lat: 0, lng: 0, barrio: 'X', visitado: false, pointNumber: 1 },
    { puntoId: 'p2', lat: 0, lng: 0, barrio: 'X', visitado: false, pointNumber: 2 },
    { puntoId: 'p3', lat: 0, lng: 0, barrio: 'X', visitado: false, pointNumber: 3 },
  ],
  planificados: 3,
  visitados: 0,
  pendientes: 3,
  pct: 0,
};

const rutasStub = {
  getHistorial: async () => [JSON.parse(JSON.stringify(quincenaHistorial))],
  getPlanQuincena: async (gestorId: string) => ({
    gestorId,
    asignados: 4,
    quincena: {
      ...QUINCENA,
      emergencia: ['p1'],
      regular: ['p2', 'p3'],
      planificados: ['p1', 'p2', 'p3'],
    },
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

  it('cuenta las visitas contra el total de puntos de la quincena', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', AHORA);

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.planificados).toBe(3);
    expect(gestor.visitados).toBe(1);
    expect(gestor.pct).toBe(33);
  });

  // El bug que motivó el rediseño: con el ciclo de dos semanas, el gestor
  // recorría puntos de la mitad que no le tocaba y ese avance no sumaba en
  // ninguna parte (aparecía 0%). Con la quincena única todo punto asignado
  // cuenta, se visite el día que se visite.
  it('cuenta las visitas de las dos semanas de la quincena por igual', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    // Una en la primera semana y otra en la segunda.
    await service.registrarVisita('p2', 'g1', new Date(QUINCENA.inicioISO));
    await service.registrarVisita('p3', 'g1', new Date(new Date(QUINCENA.inicioISO).getTime() + 9 * 86400000));

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.visitados).toBe(2);
    expect(gestor.visitasFueraDePlan).toBe(0);
  });

  it('no cuenta visitas de una quincena anterior', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', new Date(new Date(QUINCENA.inicioISO).getTime() - 86400000));

    expect((await service.getResumenDesempeno('g1', AHORA)).gestores[0].visitados).toBe(0);
  });

  it('varias visitas al mismo punto cuentan una sola vez', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p2', 'g1', AHORA);
    await service.registrarVisita('p2', 'g1', AHORA);

    expect((await service.getResumenDesempeno('g1', AHORA)).gestores[0].visitados).toBe(1);
  });

  it('las visitas a puntos fuera del plan se reportan aparte y no inflan el pct', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p9', 'g1', AHORA);

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.visitasFueraDePlan).toBe(1);
    expect(gestor.visitados).toBe(0);
    expect(gestor.pct).toBe(0);
  });

  it('los totales suman a todos los gestores', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', AHORA);
    await service.registrarVisita('p3', 'g1', AHORA);

    const resumen = await service.getResumenDesempeno('g1', AHORA);
    expect(resumen.targetTotal).toBe(3);
    expect(resumen.actualTotal).toBe(2);
  });

  it('expone el rango de la quincena con etiqueta legible, sin formato de semana ISO', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    const resumen = await service.getResumenDesempeno('g1', AHORA);
    expect(resumen.quincenaInicioISO).toBe(QUINCENA.inicioISO);
    expect(resumen.quincenaFinISO).toBe(QUINCENA.finISO);
    expect(resumen.etiqueta).toMatch(/^Quincena del /);
    expect(resumen.etiqueta).not.toMatch(/W\d/);
  });

  it('getPlanConVisitas marca los puntos ya visitados de la quincena', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p2', 'g1', AHORA);

    const plan = await service.getPlanConVisitas('g1', AHORA);
    expect(plan.quincena.visitados).toEqual(['p2']);
    expect(plan.quincena.planificados).toHaveLength(3);
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
    // Aun sin gestores, la quincena tiene que venir informada para la UI.
    expect(resumen.quincenaInicioISO).toBe(QUINCENA.inicioISO);
  });

  it('eliminarDePunto borra las visitas del punto (no quedan huerfanas)', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', AHORA);
    await service.registrarVisita('p2', 'g1', AHORA);

    await service.eliminarDePunto('p1');
    expect(repo.store.map((v) => v.puntoResiduoId)).toEqual(['p2']);
  });

  // El historial se mide contra los puntos asignados y las visitas reales del
  // rango, no contra el flag congelado de la ruta.
  it('getHistorialConVisitas marca los puntos visitados dentro del rango', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    // Dentro de la quincena del 16 al 31 de julio.
    await service.registrarVisita('p1', 'g1', new Date('2026-07-22T15:00:00.000Z'));
    await service.registrarVisita('p3', 'g1', new Date('2026-07-30T15:00:00.000Z'));

    const [q] = await service.getHistorialConVisitas('g1', 20, AHORA);
    expect(q.planificados).toBe(3);
    expect(q.visitados).toBe(2);
    expect(q.pendientes).toBe(1);
    expect(q.pct).toBe(67);
  });

  it('getHistorialConVisitas ignora visitas fuera del rango de la quincena', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    // Agosto: fuera de la quincena de julio.
    await service.registrarVisita('p1', 'g1', new Date('2026-08-05T15:00:00.000Z'));

    const [q] = await service.getHistorialConVisitas('g1', 20, AHORA);
    expect(q.visitados).toBe(0);
  });

  it('getHistorialConVisitas pone los no visitados primero', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', new Date('2026-07-22T15:00:00.000Z'));

    const [q] = await service.getHistorialConVisitas('g1', 20, AHORA);
    expect(q.paradas[0].visitado).toBe(false);
    expect(q.paradas[q.paradas.length - 1].puntoId).toBe('p1');
  });
});
