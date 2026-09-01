import { RutasSemanalesService } from './rutas-semanales.service';
import { RutaSemanal } from './entities/ruta-semanal.entity';
import { limitesQuincena } from './lib/ciclo-quincenal.util';

// El repo real recibe operadores de TypeORM (LessThan) en `where`; el mock los
// reconoce por su forma para poder probar el historial sin base de datos.
const cumple = (valor: any, criterio: any): boolean => {
  if (criterio === undefined) return true;
  if (criterio && typeof criterio === 'object' && '_type' in criterio) {
    return new Date(valor).getTime() < new Date(criterio._value).getTime();
  }
  if (valor instanceof Date) return valor.getTime() === new Date(criterio).getTime();
  return valor === criterio;
};

const makeRepo = () => {
  const store = new Map<string, RutaSemanal>();
  let n = 0;
  const filtrar = (where: any) => Array.from(store.values()).filter((r) =>
    cumple(r.estado, where.estado) &&
    cumple(r.gestorId, where.gestorId) &&
    cumple(r.semanaInicio, where.semanaInicio) &&
    cumple(r.id, where.id),
  );
  return {
    find: async ({ where, order, take }: any) => {
      let filas = filtrar(where);
      if (order?.semanaInicio === 'DESC') {
        filas = [...filas].sort((a, b) => b.semanaInicio.getTime() - a.semanaInicio.getTime());
      }
      return take ? filas.slice(0, take) : filas;
    },
    findOne: async ({ where }: any) => filtrar(where)[0] ?? null,
    create: (data: Partial<RutaSemanal>) => ({ ...data }) as RutaSemanal,
    save: async (r: RutaSemanal) => { const withId = { ...r, id: r.id || `r-${++n}` }; store.set(withId.id, withId); return withId; },
    store,
  };
};

const puntosRepoStub = { find: async () => [] };
const asignacionesServiceStub = { getPuntosDeGestor: async () => [] };

// Puntos sin residuos pendientes: ninguno entra en emergencia salvo que el
// test lo prepare a proposito.
const puntoSano = (pointNumber: number) => ({
  id: `p${pointNumber}`,
  pointNumber,
  residuos: [],
  dateTime: new Date('2026-08-20T12:00:00.000Z'),
});

const makePlanService = (puntos: any[]) => {
  const ids = puntos.map((p) => p.id);
  return new RutasSemanalesService(
    makeRepo() as any,
    { find: async () => puntos } as any,
    { getPuntosDeGestor: async () => ids } as any,
  );
};

describe('RutasSemanalesService.getPlanQuincena', () => {
  const ahora = new Date('2026-08-21T15:00:00.000Z');

  it('la quincena cubre el 100% de los puntos asignados, sin repetir', async () => {
    const puntos = Array.from({ length: 11 }, (_, i) => puntoSano(i + 1));
    const plan = await makePlanService(puntos).getPlanQuincena('g1', ahora);

    const todos = plan.quincena.planificados;
    expect(new Set(todos).size).toBe(todos.length);
    expect([...todos].sort()).toEqual(puntos.map((p) => p.id).sort());
    expect(plan.asignados).toBe(11);
  });

  it('los puntos en emergencia van primero en el orden del plan', async () => {
    const sano = puntoSano(1);
    const vencido = {
      ...puntoSano(2),
      residuos: [{ id: 'r1', recogido: false, dateTime: '2026-08-01T12:00:00.000Z' }],
    };

    const plan = await makePlanService([sano, vencido]).getPlanQuincena('g1', ahora);
    expect(plan.quincena.emergencia).toEqual([vencido.id]);
    expect(plan.quincena.regular).toEqual([sano.id]);
    expect(plan.quincena.planificados[0]).toBe(vencido.id);
  });

  it('un gestor sin asignaciones igual recibe la quincena con su etiqueta', async () => {
    const plan = await makePlanService([]).getPlanQuincena('g1', ahora);
    expect(plan.asignados).toBe(0);
    expect(plan.quincena.planificados).toEqual([]);
    expect(plan.quincena.etiqueta).toMatch(/^Quincena del /);
  });

  it('el plan usa el rango de la quincena en curso', async () => {
    const plan = await makePlanService([]).getPlanQuincena('g1', ahora);
    const rango = limitesQuincena(ahora);
    expect(plan.quincena.inicioISO).toBe(rango.inicioISO);
    expect(plan.quincena.finISO).toBe(rango.finISO);
  });
});

describe('RutasSemanalesService', () => {
  const ahora = new Date('2026-07-27T15:00:00.000Z');

  it('crearRutaQuincena crea una ruta nueva en progreso, de 14 dias', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const ruta = await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora });
    expect(ruta.estado).toBe('en_progreso');
    expect(ruta.gestorId).toBe('g1');
    const dias = (ruta.semanaFin.getTime() - ruta.semanaInicio.getTime() + 1) / 86400000;
    expect(dias).toBe(14);
  });

  it('crearRutaQuincena en la segunda semana de la misma quincena recalcula en vez de duplicar', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const primera = await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora });
    const segunda = await service.crearRutaQuincena({
      gestorId: 'g1',
      paradas: [{ puntoId: 'p1', lat: 0, lng: 0, barrio: 'X', visitado: false }],
      segmentos: [],
      ahora: new Date(ahora.getTime() + 7 * 86400000),
    });
    expect(segunda.id).toBe(primera.id);
    expect(segunda.paradas).toHaveLength(1);
  });

  it('cancelarRuta rechaza si el que cancela no es el gestor dueno ni admin', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const ruta = await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: new Date() });
    await expect(service.cancelarRuta(ruta.id, 'otro-gestor', false)).rejects.toThrow();
  });

  it('cancelarRuta funciona para el gestor dueno', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const ruta = await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: new Date() });
    const cancelada = await service.cancelarRuta(ruta.id, 'g1', false);
    expect(cancelada.estado).toBe('cancelada');
  });
});

describe('RutasSemanalesService.getHistorial', () => {
  const quincenaVieja = new Date('2026-06-15T15:00:00.000Z');
  const quincenaPasada = new Date('2026-07-24T15:00:00.000Z');
  const quincenaActual = new Date('2026-08-21T15:00:00.000Z');
  const nuevoService = () =>
    new RutasSemanalesService(makeRepo() as any, puntosRepoStub as any, asignacionesServiceStub as any);

  it('devuelve las rutas de quincenas anteriores, de la mas reciente a la mas vieja', async () => {
    const service = nuevoService();
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaVieja });
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaPasada });

    const historial = await service.getHistorial('g1', 20, quincenaActual);
    expect(historial).toHaveLength(2);
    expect(historial[0].semanaInicio.getTime()).toBeGreaterThan(historial[1].semanaInicio.getTime());
  });

  it('no incluye la quincena en curso', async () => {
    const service = nuevoService();
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaActual });

    expect(await service.getHistorial('g1', 20, quincenaActual)).toHaveLength(0);
  });

  it('no mezcla rutas de otros gestores', async () => {
    const service = nuevoService();
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaPasada });
    await service.crearRutaQuincena({ gestorId: 'g2', paradas: [], segmentos: [], ahora: quincenaPasada });

    const historial = await service.getHistorial('g1', 20, quincenaActual);
    expect(historial.map((r) => r.gestorId)).toEqual(['g1']);
  });

  it('cierra las quincenas vencidas antes de devolverlas, con su arrastre', async () => {
    const service = nuevoService();
    await service.crearRutaQuincena({
      gestorId: 'g1',
      paradas: [
        { puntoId: 'p1', lat: 0, lng: 0, barrio: 'X', visitado: true },
        { puntoId: 'p2', lat: 0, lng: 0, barrio: 'X', visitado: false },
      ],
      segmentos: [],
      ahora: quincenaPasada,
    });

    const historial = await service.getHistorial('g1', 20, quincenaActual);
    expect(historial[0].estado).toBe('cerrada');
    expect(historial[0].arrastre).toEqual(['p2']);
  });

  it('respeta el limite pedido', async () => {
    const service = nuevoService();
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaVieja });
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaPasada });

    expect(await service.getHistorial('g1', 1, quincenaActual)).toHaveLength(1);
  });
});
