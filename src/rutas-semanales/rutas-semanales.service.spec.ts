import { RutasSemanalesService } from './rutas-semanales.service';
import { RutaSemanal } from './entities/ruta-semanal.entity';
import { limitesQuincena, diasDeQuincena } from './lib/ciclo-quincenal.util';

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
  // 20 de julio: segunda quincena de julio (16 al 31).
  const ahora = new Date('2026-07-20T15:00:00.000Z');

  it('crearRutaQuincena crea una ruta nueva que abarca la quincena de calendario', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const ruta = await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora });
    expect(ruta.estado).toBe('en_progreso');
    expect(ruta.gestorId).toBe('g1');

    const rango = limitesQuincena(ahora);
    expect(ruta.semanaInicio.toISOString()).toBe(rango.inicioISO);
    expect(ruta.semanaFin.toISOString()).toBe(rango.finISO);
    // 20 de julio cae en la segunda quincena, y julio tiene 31: son 16 dias.
    const dias = (ruta.semanaFin.getTime() - ruta.semanaInicio.getTime() + 1) / 86400000;
    expect(dias).toBe(diasDeQuincena(rango.inicioISO, rango.finISO));
    expect(dias).toBe(16);
  });

  it('crearRutaQuincena mas tarde en la misma quincena recalcula en vez de duplicar', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const primera = await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora });
    const segunda = await service.crearRutaQuincena({
      gestorId: 'g1',
      paradas: [{ puntoId: 'p1', lat: 0, lng: 0, barrio: 'X', visitado: false }],
      segmentos: [],
      // 28 de julio: sigue siendo la quincena del 16 al 31.
      ahora: new Date('2026-07-28T15:00:00.000Z'),
    });
    expect(segunda.id).toBe(primera.id);
    expect(segunda.paradas).toHaveLength(1);
  });

  it('crearRutaQuincena en la otra mitad del mes abre una ruta distinta', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const segundaMitadJulio = await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora });
    const primeraMitadAgosto = await service.crearRutaQuincena({
      gestorId: 'g1', paradas: [], segmentos: [], ahora: new Date('2026-08-03T15:00:00.000Z'),
    });
    expect(primeraMitadAgosto.id).not.toBe(segundaMitadJulio.id);
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
  const quincenaVieja = new Date('2026-06-05T15:00:00.000Z');
  const quincenaPasada = new Date('2026-07-20T15:00:00.000Z');
  const quincenaActual = new Date('2026-08-21T15:00:00.000Z');

  const parada = (puntoId: string, visitado: boolean) => ({
    puntoId, lat: 0, lng: 0, barrio: 'X', visitado,
  });

  const nuevoService = (puntos: any[] = []) =>
    new RutasSemanalesService(
      makeRepo() as any,
      { find: async () => puntos } as any,
      asignacionesServiceStub as any,
    );

  it('agrupa por quincena, de la mas reciente a la mas vieja', async () => {
    const service = nuevoService();
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaVieja });
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaPasada });

    const historial = await service.getHistorial('g1', 20, quincenaActual);
    expect(historial).toHaveLength(2);
    expect(historial[0].indice).toBeGreaterThan(historial[1].indice);
    expect(historial[0].etiqueta).toMatch(/^Quincena del /);
  });

  it('cada entrada abarca la quincena de calendario, aunque las rutas guardadas sean semanales', async () => {
    const service = nuevoService();
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaPasada });

    const [q] = await service.getHistorial('g1', 20, quincenaActual);
    expect(q).toMatchObject(limitesQuincena(quincenaPasada));
    const dias = (new Date(q.finISO).getTime() - new Date(q.inicioISO).getTime() + 1) / 86400000;
    expect(dias).toBe(diasDeQuincena(q.inicioISO, q.finISO));
  });

  // El bug del panel: antes del ciclo quincenal se creaba una ruta por semana.
  // Mostradas de a una, las cards decian "Quincena del 17 al 23" — 7 dias.
  it('fusiona en una sola quincena las dos rutas semanales viejas que caen dentro', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, { find: async () => [] } as any, asignacionesServiceStub as any);
    // Se simulan dos filas semanales, como las que dejo el modelo anterior.
    // Dos lunes distintos, ambos dentro de la quincena del 16 al 31 de julio.
    await repo.save({
      gestorId: 'g1',
      semanaInicio: new Date('2026-07-20T05:00:00.000Z'),
      semanaFin: new Date('2026-07-27T04:59:59.999Z'),
      estado: 'cerrada',
      paradas: [parada('p1', true), parada('p2', false)],
      segmentos: [], arrastre: [],
    } as any);
    await repo.save({
      gestorId: 'g1',
      semanaInicio: new Date('2026-07-27T05:00:00.000Z'),
      semanaFin: new Date('2026-08-03T04:59:59.999Z'),
      estado: 'cerrada',
      paradas: [parada('p3', true)],
      segmentos: [], arrastre: [],
    } as any);

    const historial = await service.getHistorial('g1', 20, quincenaActual);
    expect(historial).toHaveLength(1);
    expect(historial[0].rutas).toHaveLength(2);
    expect(historial[0].planificados).toBe(3);
    expect(historial[0].visitados).toBe(2);
    expect(historial[0].pendientes).toBe(1);
    expect(historial[0].pct).toBe(67);
  });

  it('un punto repetido en las dos rutas cuenta una vez, y basta con visitarlo en una', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, { find: async () => [] } as any, asignacionesServiceStub as any);
    await repo.save({
      gestorId: 'g1',
      semanaInicio: new Date('2026-07-20T05:00:00.000Z'),
      semanaFin: new Date('2026-07-27T04:59:59.999Z'),
      estado: 'cerrada', paradas: [parada('p1', false)], segmentos: [], arrastre: [],
    } as any);
    await repo.save({
      gestorId: 'g1',
      semanaInicio: new Date('2026-07-27T05:00:00.000Z'),
      semanaFin: new Date('2026-08-03T04:59:59.999Z'),
      estado: 'cerrada', paradas: [parada('p1', true)], segmentos: [], arrastre: [],
    } as any);

    const [q] = await service.getHistorial('g1', 20, quincenaActual);
    expect(q.planificados).toBe(1);
    expect(q.visitados).toBe(1);
  });

  it('lista los puntos con su numero, los no visitados primero', async () => {
    const repo = makeRepo();
    const puntos = [
      { id: 'p1', pointNumber: 7 },
      { id: 'p2', pointNumber: 3 },
    ];
    const service = new RutasSemanalesService(repo as any, { find: async () => puntos } as any, asignacionesServiceStub as any);
    await repo.save({
      gestorId: 'g1',
      semanaInicio: new Date('2026-07-20T05:00:00.000Z'),
      semanaFin: new Date('2026-08-01T04:59:59.999Z'),
      estado: 'cerrada',
      paradas: [parada('p1', true), parada('p2', false)],
      segmentos: [], arrastre: [],
    } as any);

    const [q] = await service.getHistorial('g1', 20, quincenaActual);
    expect(q.paradas.map((p) => p.puntoId)).toEqual(['p2', 'p1']);
    expect(q.paradas[0].visitado).toBe(false);
    expect(q.paradas.find((p) => p.puntoId === 'p1')!.pointNumber).toBe(7);
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
    expect(historial).toHaveLength(1);
    expect(historial[0].rutas).toHaveLength(1);
  });

  it('cierra las quincenas vencidas antes de devolverlas', async () => {
    const service = nuevoService();
    await service.crearRutaQuincena({
      gestorId: 'g1',
      paradas: [parada('p1', true), parada('p2', false)],
      segmentos: [],
      ahora: quincenaPasada,
    });

    const [q] = await service.getHistorial('g1', 20, quincenaActual);
    expect(q.rutas[0].estado).toBe('cerrada');
  });

  it('respeta el limite pedido, contado en quincenas', async () => {
    const service = nuevoService();
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaVieja });
    await service.crearRutaQuincena({ gestorId: 'g1', paradas: [], segmentos: [], ahora: quincenaPasada });

    expect(await service.getHistorial('g1', 1, quincenaActual)).toHaveLength(1);
  });
});
