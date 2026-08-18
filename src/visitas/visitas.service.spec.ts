import { VisitasService } from './visitas.service';

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
  };
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

  it('getResumenDesempeno calcula pct = visitados/planificados y agrega totales, gestores derivados de punto_asignacion', async () => {
    const repo = makeRepo();
    const rutasStub = {
      getPlanSemanal: async (_gestorId: string) => ({
        emergencia: ['p1'],
        regular: ['p2', 'p3'],
        semanaISO: '2026-W34',
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
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);

    await service.registrarVisita('p1', 'g1', new Date());
    await service.registrarVisita('p2', 'g1', new Date());

    const resumen = await service.getResumenDesempeno();
    expect(resumen.gestores).toHaveLength(1);
    expect(resumen.gestores[0].gestorId).toBe('g1');
    expect(resumen.gestores[0].asignados).toBe(4);
    expect(resumen.gestores[0].planificadosEstaSemana).toBe(3);
    expect(resumen.gestores[0].visitados).toBe(2);
    expect(resumen.gestores[0].pct).toBe(67);
    expect(resumen.targetTotal).toBe(3);
    expect(resumen.actualTotal).toBe(2);
  });

  it('getResumenDesempeno filtra por gestorId cuando se pasa', async () => {
    const repo = makeRepo();
    const rutasStub = { getPlanSemanal: async () => ({ emergencia: [], regular: ['p1'], semanaISO: '2026-W34' }) };
    const asignacionesStub = {
      getMapaCompleto: async () => [
        { puntoResiduoId: 'p1', gestorId: 'g1' },
        { puntoResiduoId: 'p2', gestorId: 'g2' },
      ],
      getPuntosDeGestor: async () => ['p2'],
    };
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);

    const resumen = await service.getResumenDesempeno('g2');
    expect(resumen.gestores).toHaveLength(1);
    expect(resumen.gestores[0].gestorId).toBe('g2');
  });

  it('gestores sin asignaciones no aparecen en el resumen', async () => {
    const repo = makeRepo();
    const rutasStub = { getPlanSemanal: async () => ({ emergencia: [], regular: [], semanaISO: '2026-W34' }) };
    const asignacionesStub = {
      getMapaCompleto: async () => [{ puntoResiduoId: 'p1', gestorId: null }],
      getPuntosDeGestor: async () => [],
    };
    const service = new VisitasService(repo as any, rutasStub as any, asignacionesStub as any);

    const resumen = await service.getResumenDesempeno();
    expect(resumen.gestores).toHaveLength(0);
  });
});
