import { VisitasService, CUTOVER_REGIMEN_PARES } from './visitas.service';
import { limitesQuincena } from '../rutas-semanales/lib/ciclo-quincenal.util';

// Quincena de septiembre (16-30), después del cutover: régimen de parejas.
const AHORA = new Date('2026-09-21T15:00:00.000Z');
const QUINCENA = limitesQuincena(AHORA);
const DIA_MS = 24 * 60 * 60 * 1000;

// Registra 2 parejas de días consecutivos en cada mitad de la quincena que
// arranca en inicioISO — lo mínimo para que un punto cuente como "cumple
// frecuencia" con la regla nueva. Offsets 0,1 y 3,4 en la primera mitad
// (días 0-6); 8,9 y 11,12 en la segunda (mitadesDeQuincena corta en el
// offset 7 — se arranca en 8, no 7, para dejar margen: el corte real cae a
// las 05:00 UTC pero el día se trunca a las 00:00, así que el offset 7
// exacto todavía cae del lado de la primera mitad).
async function visitarCumpliendoParejas(service: VisitasService, puntoId: string, gestorId: string, inicioISO: string) {
  const inicio = new Date(inicioISO).getTime();
  for (const i of [0, 1, 3, 4]) await service.registrarVisita(puntoId, gestorId, new Date(inicio + i * DIA_MS));
  for (const i of [8, 9, 11, 12]) await service.registrarVisita(puntoId, gestorId, new Date(inicio + i * DIA_MS));
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
        // Usado por getActividadHoy: MAX(fecha) de todas las visitas del
        // gestor, sin filtro de rango (a diferencia de getRawMany acá arriba).
        getRawOne: async () => {
          const delGestor = store.filter((v) => v.gestorId === filtros.gestorId);
          if (delGestor.length === 0) return { max: null };
          const max = delGestor.reduce((m, v) => (new Date(v.fecha) > new Date(m) ? v.fecha : m), delGestor[0].fecha);
          return { max };
        },
      };
      return qb;
    },
  };
};

// p1 está en emergencia; p2 y p3 son regulares. Los tres entran en la misma
// quincena: ya no hay reparto en mitades. Julio queda antes del cutover a
// propósito: sirve para ejercitar el régimen viejo en getHistorialConVisitas.
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
  // (el gestor toma evidencia una vez y no vuelve) no puede salir "cumplido"
  // en una quincena de régimen nuevo.
  it('una sola visita en la quincena no cumple la frecuencia mínima (régimen nuevo)', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', AHORA);

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.visitados).toBe(0);
    expect(gestor.pct).toBe(0);
  });

  // Régimen viejo (antes del cutover, ej. agosto): una sola visita SÍ basta.
  // Regresión explícita para que esto no se vuelva a romper.
  it('régimen viejo (antes del cutover): una sola visita en la quincena cumple la frecuencia', async () => {
    const ahoraViejo = new Date('2026-08-21T15:00:00.000Z');
    const quincenaVieja = limitesQuincena(ahoraViejo);
    const repo = makeRepo();
    const rutasStubViejo = {
      ...rutasStub,
      getPlanQuincena: async (gestorId: string) => ({
        gestorId,
        asignados: 4,
        quincena: { ...quincenaVieja, emergencia: ['p1'], regular: ['p2', 'p3'], planificados: ['p1', 'p2', 'p3'] },
      }),
    };
    const service = new VisitasService(repo as any, rutasStubViejo as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', ahoraViejo);

    const gestor = (await service.getResumenDesempeno('g1', ahoraViejo)).gestores[0];
    expect(gestor.visitados).toBe(1);
    expect(gestor.pct).toBe(33);
  });

  it('cumple la frecuencia con 2 parejas de días consecutivos por mitad', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await visitarCumpliendoParejas(service, 'p1', 'g1', QUINCENA.inicioISO);

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.planificados).toBe(3);
    expect(gestor.visitados).toBe(1);
    expect(gestor.pct).toBe(33);
  });

  it('4 visitas el mismo día cuentan como un solo día: no forman pareja', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    const inicio = new Date(QUINCENA.inicioISO).getTime();
    // 4 visitas el mismo día en la primera mitad: 0 parejas ahí.
    for (let i = 0; i < 4; i++) await service.registrarVisita('p1', 'g1', new Date(inicio));
    // ...y 2 parejas completas en la segunda mitad (esa sola no alcanza).
    for (const i of [8, 9, 11, 12]) await service.registrarVisita('p1', 'g1', new Date(inicio + i * DIA_MS));

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.visitados).toBe(0);
  });

  it('cumplir parejas en una sola mitad de la quincena no alcanza: deben cumplirse las dos', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    const inicio = new Date(QUINCENA.inicioISO).getTime();
    for (const i of [0, 1, 3, 4]) await service.registrarVisita('p1', 'g1', new Date(inicio + i * DIA_MS));

    const gestor = (await service.getResumenDesempeno('g1', AHORA)).gestores[0];
    expect(gestor.visitados).toBe(0);
  });

  it('días consecutivos sueltos: 3 días seguidos dan 1 pareja, no 2 (no cuenta como racha)', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    const inicio = new Date(QUINCENA.inicioISO).getTime();
    // lunes, martes, miércoles: greedy consume (lunes,martes), miércoles queda suelto.
    for (const i of [0, 1, 2]) await service.registrarVisita('p1', 'g1', new Date(inicio + i * DIA_MS));

    const progreso = await service.getProgresoFrecuencia('g1', QUINCENA.inicioISO, QUINCENA.finISO, AHORA);
    expect(progreso.get('p1')!.paresMitadActual).toBe(1);
  });

  it('días alternos sin parejas consecutivas no suman nada (lunes, miércoles, viernes)', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    const inicio = new Date(QUINCENA.inicioISO).getTime();
    for (const i of [0, 2, 4]) await service.registrarVisita('p1', 'g1', new Date(inicio + i * DIA_MS));

    const progreso = await service.getProgresoFrecuencia('g1', QUINCENA.inicioISO, QUINCENA.finISO, AHORA);
    expect(progreso.get('p1')!.paresMitadActual).toBe(0);
  });

  it('lunes, miércoles, jueves, viernes: solo 1 pareja aprovechable, no 2', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    const inicio = new Date(QUINCENA.inicioISO).getTime();
    for (const i of [0, 2, 3, 4]) await service.registrarVisita('p1', 'g1', new Date(inicio + i * DIA_MS));

    const progreso = await service.getProgresoFrecuencia('g1', QUINCENA.inicioISO, QUINCENA.finISO, AHORA);
    expect(progreso.get('p1')!.paresMitadActual).toBe(1);
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
    await visitarCumpliendoParejas(service, 'p1', 'g1', QUINCENA.inicioISO);
    await visitarCumpliendoParejas(service, 'p3', 'g1', QUINCENA.inicioISO);

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
    await visitarCumpliendoParejas(service, 'p2', 'g1', QUINCENA.inicioISO);

    const plan = await service.getPlanConVisitas('g1', AHORA);
    expect(plan.quincena.visitados).toEqual(['p2']);
    expect(plan.quincena.planificados).toHaveLength(3);
  });

  it('getPlanConVisitas expone el progreso de frecuencia por punto (régimen de parejas)', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    // 1 pareja completa en la mitad actual: no alcanza las 2 requeridas.
    const inicio = new Date(QUINCENA.inicioISO).getTime();
    await service.registrarVisita('p2', 'g1', new Date(inicio));
    await service.registrarVisita('p2', 'g1', new Date(inicio + DIA_MS));

    const plan = await service.getPlanConVisitas('g1', AHORA);
    const progreso = plan.quincena.progresoVisitas!;
    expect(progreso['p2'].regimen).toBe('parejas');
    expect(progreso['p2'].paresMitadActual).toBe(1);
    expect(progreso['p2'].paresRequeridos).toBe(2);
    expect(progreso['p2'].cumpleMitadActual).toBe(false);
    // Punto sin ninguna visita: progreso en cero, no undefined.
    expect(progreso['p3'].paresMitadActual).toBe(0);
  });

  it('getPlanConVisitas en régimen viejo expone progreso simple (siempre satisfecho)', async () => {
    const ahoraViejo = new Date('2026-08-21T15:00:00.000Z');
    const quincenaVieja = limitesQuincena(ahoraViejo);
    const repo = makeRepo();
    const rutasStubViejo = {
      ...rutasStub,
      getPlanQuincena: async (gestorId: string) => ({
        gestorId,
        asignados: 4,
        quincena: { ...quincenaVieja, emergencia: ['p1'], regular: ['p2', 'p3'], planificados: ['p1', 'p2', 'p3'] },
      }),
    };
    const service = new VisitasService(repo as any, rutasStubViejo as any, asignacionesStub as any);

    const plan = await service.getPlanConVisitas('g1', ahoraViejo);
    const progreso = plan.quincena.progresoVisitas!;
    expect(progreso['p2'].regimen).toBe('simple');
    expect(progreso['p2'].cumpleMitadActual).toBe(true);
  });

  // Frontera del cutover: quien arranca justo en CUTOVER_REGIMEN_PARES ya usa
  // el régimen nuevo; el que arranca justo antes sigue en el régimen viejo.
  it('quincena que arranca justo en el cutover usa el régimen nuevo (1 visita no basta)', async () => {
    const ahora = new Date(CUTOVER_REGIMEN_PARES);
    const q = limitesQuincena(ahora);
    expect(q.inicioISO).toBe(CUTOVER_REGIMEN_PARES);
    const repo = makeRepo();
    const rutasStubLocal = {
      ...rutasStub,
      getPlanQuincena: async (gestorId: string) => ({
        gestorId, asignados: 3,
        quincena: { ...q, emergencia: [], regular: ['p1', 'p2', 'p3'], planificados: ['p1', 'p2', 'p3'] },
      }),
    };
    const service = new VisitasService(repo as any, rutasStubLocal as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', ahora);
    const plan = await service.getPlanConVisitas('g1', ahora);
    expect(plan.quincena.visitados).toEqual([]);
  });

  it('quincena justo antes del cutover sigue en régimen viejo (1 visita basta)', async () => {
    const ahora = new Date(new Date(CUTOVER_REGIMEN_PARES).getTime() - 1);
    const q = limitesQuincena(ahora);
    expect(new Date(q.inicioISO).getTime()).toBeLessThan(new Date(CUTOVER_REGIMEN_PARES).getTime());
    const repo = makeRepo();
    const rutasStubLocal = {
      ...rutasStub,
      getPlanQuincena: async (gestorId: string) => ({
        gestorId, asignados: 3,
        quincena: { ...q, emergencia: [], regular: ['p1', 'p2', 'p3'], planificados: ['p1', 'p2', 'p3'] },
      }),
    };
    const service = new VisitasService(repo as any, rutasStubLocal as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', ahora);
    const plan = await service.getPlanConVisitas('g1', ahora);
    expect(plan.quincena.visitados).toEqual(['p1']);
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
  // rango, no contra el flag congelado de la ruta. quincenaHistorial es julio
  // (antes del cutover): régimen viejo, 1 sola visita ya cuenta.
  it('getHistorialConVisitas marca visitado con una sola visita (régimen viejo)', async () => {
    const repo = makeRepo();
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);
    await service.registrarVisita('p1', 'g1', new Date(quincenaHistorial.inicioISO));
    await service.registrarVisita('p3', 'g1', new Date(quincenaHistorial.inicioISO));

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
    await service.registrarVisita('p1', 'g1', new Date(quincenaHistorial.inicioISO));

    const [q] = await service.getHistorialConVisitas('g1', 20, AHORA);
    expect(q.paradas[0].visitado).toBe(false);
    expect(q.paradas[q.paradas.length - 1].puntoId).toBe('p1');
  });
});
