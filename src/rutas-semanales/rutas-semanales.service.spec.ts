import { RutasSemanalesService } from './rutas-semanales.service';
import { RutaSemanal } from './entities/ruta-semanal.entity';

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

describe('RutasSemanalesService', () => {
  it('crearRutaSemana crea una ruta nueva en progreso', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any);
    const ahora = new Date('2026-07-24T15:00:00.000Z');
    const ruta = await service.crearRutaSemana({ gestorId: 'g1', paradas: [], segmentos: [], ahora });
    expect(ruta.estado).toBe('en_progreso');
    expect(ruta.gestorId).toBe('g1');
  });

  it('crearRutaSemana en la misma semana recalcula en vez de duplicar', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any);
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
    const service = new RutasSemanalesService(repo as any);
    const ruta = await service.crearRutaSemana({ gestorId: 'g1', paradas: [], segmentos: [], ahora: new Date() });
    await expect(service.cancelarRuta(ruta.id, 'otro-gestor', false)).rejects.toThrow();
  });

  it('cancelarRuta funciona para el gestor dueno', async () => {
    const repo = makeRepo();
    const service = new RutasSemanalesService(repo as any);
    const ruta = await service.crearRutaSemana({ gestorId: 'g1', paradas: [], segmentos: [], ahora: new Date() });
    const cancelada = await service.cancelarRuta(ruta.id, 'g1', false);
    expect(cancelada.estado).toBe('cancelada');
  });
});
