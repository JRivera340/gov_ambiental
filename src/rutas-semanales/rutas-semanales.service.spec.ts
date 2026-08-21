import { RutasSemanalesService } from './rutas-semanales.service';
import { RutaSemanal } from './entities/ruta-semanal.entity';
import { mitadDePunto, semanasDelCiclo } from './lib/ciclo-semanal.util';

const makeRepo = () => {
  const store = new Map<string, RutaSemanal>();
  let n = 0;
  return {
    find: async ({ where }: any) => Array.from(store.values()).filter((r) =>
      (where.estado === undefined || r.estado === where.estado) &&
      (where.gestorId === undefined || r.gestorId === where.gestorId) &&
      (where.semanaInicio === undefined || r.semanaInicio.getTime() === where.semanaInicio.getTime()),
    ),
    findOne: async ({ where }: any) => Array.from(store.values()).find((r) =>
      (where.id === undefined || r.id === where.id) &&
      (where.gestorId === undefined || r.gestorId === where.gestorId) &&
      (where.semanaInicio === undefined || r.semanaInicio.getTime() === where.semanaInicio.getTime()),
    ) ?? null,
    create: (data: Partial<RutaSemanal>) => ({ ...data }) as RutaSemanal,
    save: async (r: RutaSemanal) => { const withId = { ...r, id: r.id || `r-${++n}` }; store.set(withId.id, withId); return withId; },
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

describe('RutasSemanalesService.getPlanCiclo', () => {
  const ahora = new Date('2026-08-21T15:00:00.000Z');

  it('entre las dos semanas cubre el 100% de los puntos asignados, sin repetir', async () => {
    const puntos = Array.from({ length: 11 }, (_, i) => puntoSano(i + 1));
    const plan = await makePlanService(puntos).getPlanCiclo('g1', ahora);

    const todos = [...plan.semanas[0].planificados, ...plan.semanas[1].planificados];
    expect(new Set(todos).size).toBe(todos.length);
    expect(todos.sort()).toEqual(puntos.map((p) => p.id).sort());
    expect(plan.asignados).toBe(11);
  });

  it('un punto en emergencia se adelanta a la semana en curso aunque le tocara la siguiente', async () => {
    const [, semSiguiente] = semanasDelCiclo(ahora);
    // Un punto de la mitad de la semana siguiente, con un residuo vencido.
    const dePróximaSemana = Array.from({ length: 8 }, (_, i) => puntoSano(i + 1))
      .find((p) => mitadDePunto(p) === semSiguiente.slot)!;
    const vencido = {
      ...dePróximaSemana,
      residuos: [{ id: 'r1', recogido: false, dateTime: '2026-08-01T12:00:00.000Z' }],
    };

    const plan = await makePlanService([vencido]).getPlanCiclo('g1', ahora);
    expect(plan.semanas[0].emergencia).toContain(vencido.id);
    expect(plan.semanas[1].planificados).not.toContain(vencido.id);
  });

  it('la semana siguiente nunca trae emergencias', async () => {
    const puntos = Array.from({ length: 6 }, (_, i) => puntoSano(i + 1));
    const plan = await makePlanService(puntos).getPlanCiclo('g1', ahora);
    expect(plan.semanas[1].emergencia).toEqual([]);
  });

  it('un gestor sin asignaciones igual recibe las dos semanas con sus etiquetas', async () => {
    const plan = await makePlanService([]).getPlanCiclo('g1', ahora);
    expect(plan.asignados).toBe(0);
    expect(plan.semanas).toHaveLength(2);
    expect(plan.semanas[0].esActual).toBe(true);
    expect(plan.semanas[1].esActual).toBe(false);
    expect(plan.semanas[0].etiqueta).toMatch(/^Semana del /);
  });

  it('crearRutaSemana rechaza una semana que no pertenece al ciclo', async () => {
    const service = makePlanService([]);
    await expect(service.crearRutaSemana({
      gestorId: 'g1', paradas: [], segmentos: [], ahora,
      semanaInicioISO: '2026-01-05T05:00:00.000Z',
    })).rejects.toThrow();
  });

  it('crearRutaSemana permite planificar la semana siguiente del ciclo', async () => {
    const [, semSiguiente] = semanasDelCiclo(ahora);
    const service = makePlanService([]);
    const ruta = await service.crearRutaSemana({
      gestorId: 'g1', paradas: [], segmentos: [], ahora,
      semanaInicioISO: semSiguiente.inicioISO,
    });
    expect(new Date(ruta.semanaInicio).toISOString()).toBe(semSiguiente.inicioISO);
  });
});

describe('RutasSemanalesService', () => {
  it('crearRutaSemana crea una ruta nueva en progreso', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const ahora = new Date('2026-07-24T15:00:00.000Z');
    const ruta = await service.crearRutaSemana({ gestorId: 'g1', paradas: [], segmentos: [], ahora });
    expect(ruta.estado).toBe('en_progreso');
    expect(ruta.gestorId).toBe('g1');
  });

  it('crearRutaSemana en la misma semana recalcula en vez de duplicar', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const ahora = new Date('2026-07-24T15:00:00.000Z');
    const primera = await service.crearRutaSemana({ gestorId: 'g1', paradas: [], segmentos: [], ahora });
    const segunda = await service.crearRutaSemana({
      gestorId: 'g1',
      paradas: [{ puntoId: 'p1', lat: 0, lng: 0, barrio: 'X', visitado: false }],
      segmentos: [],
      ahora,
    });
    expect(segunda.id).toBe(primera.id);
    expect(segunda.paradas).toHaveLength(1);
  });

  it('cancelarRuta rechaza si el que cancela no es el gestor dueno ni admin', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const ruta = await service.crearRutaSemana({ gestorId: 'g1', paradas: [], segmentos: [], ahora: new Date() });
    await expect(service.cancelarRuta(ruta.id, 'otro-gestor', false)).rejects.toThrow();
  });

  it('cancelarRuta funciona para el gestor dueno', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any, puntosRepoStub as any, asignacionesServiceStub as any);
    const ruta = await service.crearRutaSemana({ gestorId: 'g1', paradas: [], segmentos: [], ahora: new Date() });
    const cancelada = await service.cancelarRuta(ruta.id, 'g1', false);
    expect(cancelada.estado).toBe('cancelada');
  });
});
