import { DataSource } from 'typeorm';
import { ProcesosService } from './procesos.service';
import { Proceso, ProcessStatus } from './entities/proceso.entity';
import { PuntoResiduo, EstadoPunto } from '../puntos/entities/punto-residuo.entity';

describe('ProcesosService', () => {
  const makeRepo = () => {
    const store = new Map<string, Proceso>();
    return {
      create: (data: Partial<Proceso>) => ({ ...data }) as Proceso,
      save: async (p: Proceso) => { const withId = { ...p, id: p.id || `p-${store.size + 1}` }; store.set(withId.id, withId); return withId; },
      find: async ({ where, order }: any) => {
        let arr = Array.from(store.values());
        if (where?.createdByUserId) arr = arr.filter((p) => p.createdByUserId === where.createdByUserId);
        return arr;
      },
      findOne: async ({ where }: any) => store.get(where.id) ?? null,
      remove: async (p: Proceso) => { store.delete(p.id); },
    };
  };

  const makeActivityRepo = (puntos: Partial<PuntoResiduo>[] = []) => ({
    findAndCount: async ({ where }: any) => {
      const filtered = puntos.filter((p) => p.processId === where.processId);
      return [filtered, filtered.length];
    },
    find: async ({ where }: any) => puntos.filter((p) => p.processId === where.processId),
    count: async ({ where }: any) => puntos.filter((p) => p.processId === where.processId).length,
  });

  it('crea un proceso con status ACTIVO', async () => {
    const repo = makeRepo();
    const dataSource = { getRepository: () => makeActivityRepo() } as unknown as DataSource;
    const service = new ProcesosService(repo as any, dataSource);
    const proceso = await service.create('user-1', { nombre: 'Proceso A' });
    expect(proceso.status).toBe(ProcessStatus.ACTIVO);
    expect(proceso.createdByUserId).toBe('user-1');
  });

  it('recalculateStatus pone FINALIZADO cuando todos los puntos estan PUBLICADA', async () => {
    const repo = makeRepo();
    const proceso = await repo.save(repo.create({ nombre: 'A', createdByUserId: 'u1', status: ProcessStatus.ACTIVO }));
    const puntos: Partial<PuntoResiduo>[] = [{ processId: proceso.id, status: EstadoPunto.PUBLICADA }];
    const dataSource = { getRepository: () => makeActivityRepo(puntos) } as unknown as DataSource;
    const service = new ProcesosService(repo as any, dataSource);
    await service.recalculateStatus(proceso.id);
    const actualizado = await repo.findOne({ where: { id: proceso.id } });
    expect(actualizado?.status).toBe(ProcessStatus.FINALIZADO);
  });

  it('recalculateStatus pone EN_SEGUIMIENTO cuando hay puntos sin publicar', async () => {
    const repo = makeRepo();
    const proceso = await repo.save(repo.create({ nombre: 'A', createdByUserId: 'u1', status: ProcessStatus.ACTIVO }));
    const puntos: Partial<PuntoResiduo>[] = [
      { processId: proceso.id, status: EstadoPunto.PUBLICADA },
      { processId: proceso.id, status: EstadoPunto.ENVIADA },
    ];
    const dataSource = { getRepository: () => makeActivityRepo(puntos) } as unknown as DataSource;
    const service = new ProcesosService(repo as any, dataSource);
    await service.recalculateStatus(proceso.id);
    const actualizado = await repo.findOne({ where: { id: proceso.id } });
    expect(actualizado?.status).toBe(ProcessStatus.EN_SEGUIMIENTO);
  });
});
