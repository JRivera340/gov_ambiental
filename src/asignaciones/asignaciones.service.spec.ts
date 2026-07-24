import { AsignacionesService } from './asignaciones.service';
import { PuntoAsignacion } from './entities/punto-asignacion.entity';

const makeRepo = () => {
  const store = new Map<string, PuntoAsignacion>();
  return {
    find: async ({ where }: any = {}) => {
      let arr = Array.from(store.values());
      if (where?.gestorId?._type === 'isNull') {
        arr = arr.filter((f) => f.gestorId === null);
      } else if (where?.gestorId !== undefined) {
        arr = arr.filter((f) => f.gestorId === where.gestorId);
      }
      return arr;
    },
    findOne: async ({ where }: any) => store.get(where.puntoResiduoId) ?? null,
    create: (data: Partial<PuntoAsignacion>) => ({ gestorId: null, updatedByUserId: null, updatedAt: new Date(), ...data }) as PuntoAsignacion,
    save: async (f: PuntoAsignacion) => { store.set(f.puntoResiduoId, f); return f; },
  };
};

describe('AsignacionesService', () => {
  it('asignarACreador asigna el punto al creador si no tiene asignación previa', async () => {
    const repo = makeRepo();
    const service = new AsignacionesService(repo as any);
    await service.asignarACreador('punto-1', 'creador-1');
    expect(await service.estaAsignadoA('punto-1', 'creador-1')).toBe(true);
  });

  it('asignarACreador no sobreescribe una asignacion existente', async () => {
    const repo = makeRepo();
    const service = new AsignacionesService(repo as any);
    await service.reasignarPunto('punto-1', 'gestor-x', 'admin-1');
    await service.asignarACreador('punto-1', 'creador-1');
    expect(await service.estaAsignadoA('punto-1', 'gestor-x')).toBe(true);
  });

  it('getSinAsignar devuelve solo puntos con gestorId null', async () => {
    const repo = makeRepo();
    const service = new AsignacionesService(repo as any);
    await service.reasignarPunto('punto-1', null, 'admin-1');
    await service.reasignarPunto('punto-2', 'gestor-x', 'admin-1');
    expect(await service.getSinAsignar()).toEqual(['punto-1']);
  });
});
