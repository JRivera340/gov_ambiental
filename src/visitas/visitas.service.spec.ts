import { VisitasService } from './visitas.service';
import { limitesQuincena } from '../rutas-semanales/lib/ciclo-quincenal.util';

const AHORA = new Date('2026-08-21T15:00:00.000Z');
const QUINCENA = limitesQuincena(AHORA);
const DIA_MS = 24 * 60 * 60 * 1000;

// Registra 4 días distintos de visita en cada mitad de la quincena que
// arranca en inicioISO — es lo mínimo para que un punto cuente como
// "cumple frecuencia" con la regla nueva (4 días distintos por semana, en
// las dos mitades de la quincena).
async function visitarCumpliendoFrecuencia(service: VisitasService, puntoId: string, gestorId: string, inicioISO: string) {
  const inicio = new Date(inicioISO).getTime();
  for (let i = 0; i < 4; i++) await service.registrarVisita(puntoId, gestorId, new Date(inicio + i * DIA_MS));
  for (let i = 8; i < 12; i++) await service.registrarVisita(puntoId, gestorId, new Date(inicio + i * DIA_MS));
}

// El repo real resuelve getIdsVisitadosEnRango/getIdsCumplenFrecuenciaEnRango
// con un query builder; acá se simula filtrando el store en memoria por
// gestor y rango de fechas, devolviendo una fila por visita con su día
// truncado (ambos métodos leen puntoResiduoId; el de frecuencia además lee
// "dia" para contar días distintos por mitad de quincena).
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
        addSelect: () => qb,
        where: (_: string, params: any) => { Object.assign(filtros, params); return qb; },
        andWhere: (_: string, params: any) => { Object.assign(filtros, params); return qb; },
        distinct: () => qb,
        getRawMany: async () => {
          const desde = new Date(filtros.desde).getTime();
          const hasta = new Date(filtros.hasta).getTime();
          return store
            .filter((v) => v.gestorId === filtros.gestorId)
            .filter((v) => {
              const t = new Date(v.fecha).getTime();
              return t >= desde && t <= hasta;
            })
            .map((v) => {
              const d = new Date(v.fecha);
              const dia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
              return { puntoResiduoId: v.puntoResiduoId, dia };
            });
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

  // El bug reportado: un punto con una sola visita en toda la quincena
  // (el gestor toma evidencia una vez y no vuelve) no puede salir "cumplido".
  it('una sola visita en la quincena no cumple la frecuencia mínima', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', AHORA);

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.visitados).toBe(0);
    expect(gestor.pct).toBe(0);
  });

  it('cumple la frecuencia con 4 días distintos de visita en cada mitad de la quincena', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await visitarCumpliendoFrecuencia(service, 'p1', 'g1', QUINCENA.inicioISO);

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.planificados).toBe(3);
    expect(gestor.visitados).toBe(1);
    expect(gestor.pct).toBe(33);
  });

  it('4 visitas el mismo día cuentan como un solo día, no alcanzan la frecuencia', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    const inicio = new Date(QUINCENA.inicioISO).getTime();
    // 4 visitas el mismo día en la primera mitad...
    for (let i = 0; i < 4; i++) await service.registrarVisita('p1', 'g1', new Date(inicio));
    // ...y 4 días distintos en la segunda mitad (esa sí cumple sola).
    for (let i = 8; i < 12; i++) await service.registrarVisita('p1', 'g1', new Date(inicio + i * DIA_MS));

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.visitados).toBe(0);
  });

  it('4 días distintos en una sola mitad de la quincena no alcanzan: deben cumplirse las dos', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    const inicio = new Date(QUINCENA.inicioISO).getTime();
    for (let i = 0; i < 4; i++) await service.registrarVisita('p1', 'g1', new Date(inicio + i * DIA_MS));

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.visitados).toBe(0);
  });

  it('no cuenta visitas de una quincena anterior', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', new Date(new Date(QUINCENA.inicioISO).getTime() - 86400000));

    expect((await service.getResumenDesempeno('g1', AHORA)).gestores[0].visitados).toBe(0);
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
    await visitarCumpliendoFrecuencia(service, 'p1', 'g1', QUINCENA.inicioISO);
    await visitarCumpliendoFrecuencia(service, 'p3', 'g1', QUINCENA.inicioISO);

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

  it('getPlanConVisitas marca los puntos que cumplen la frecuencia en la quincena', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await visitarCumpliendoFrecuencia(service, 'p2', 'g1', QUINCENA.inicioISO);

    const plan = await service.getPlanConVisitas('g1', AHORA);
    expect(plan.quincena.visitados).toEqual(['p2']);
    expect(plan.quincena.planificados).toHaveLength(3);
  });

  it('getPlanConVisitas expone el progreso de frecuencia por punto', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    // AHORA cae en la primera mitad de la quincena. 2 días distintos ahí no
    // alcanzan los 4 requeridos.
    const inicio = new Date(QUINCENA.inicioISO).getTime();
    await service.registrarVisita('p2', 'g1', new Date(inicio));
    await service.registrarVisita('p2', 'g1', new Date(inicio + DIA_MS));

    const plan = await service.getPlanConVisitas('g1', AHORA);
    const progreso = plan.quincena.progresoVisitas!;
    expect(progreso['p2'].diasMitadActual).toBe(2);
    expect(progreso['p2'].requerido).toBe(4);
    expect(progreso['p2'].cumpleMitadActual).toBe(false);
    // Punto sin ninguna visita: progreso en cero, no undefined.
    expect(progreso['p3'].diasMitadActual).toBe(0);
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
  it('getHistorialConVisitas marca cumplida la frecuencia dentro del rango', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    // Dentro de la quincena del 16 al 31 de julio.
    await visitarCumpliendoFrecuencia(service, 'p1', 'g1', quincenaHistorial.inicioISO);
    await visitarCumpliendoFrecuencia(service, 'p3', 'g1', quincenaHistorial.inicioISO);

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
    await visitarCumpliendoFrecuencia(service, 'p1', 'g1', quincenaHistorial.inicioISO);

    const [q] = await service.getHistorialConVisitas('g1', 20, AHORA);
    expect(q.paradas[0].visitado).toBe(false);
    expect(q.paradas[q.paradas.length - 1].puntoId).toBe('p1');
  });
});
