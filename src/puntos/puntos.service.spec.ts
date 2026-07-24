import { PuntosService } from './puntos.service';
import { InMemoryPuntosRepository } from './puntos.repository.memory';

const asignacionesStub = { asignarACreador: async () => {} };
const procesosStub = { recalculateStatus: async () => {} };

describe('PuntosService', () => {
  const makeService = () => {
    const repo = new InMemoryPuntosRepository();
    return { service: new PuntosService(repo, asignacionesStub as any, procesosStub as any), repo };
  };

  it('crea un punto asignando el creador desde el usuario autenticado', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 4.1, lng: -74.2, barrio: 'Centro' });
    expect(punto.createdByUserId).toBe('user-1');
    expect(punto.status).toBe('BORRADOR');
    expect(punto.residuos).toEqual([]);
  });

  it('findMine devuelve solo los puntos del usuario que pregunta', async () => {
    const { service } = makeService();
    await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await service.create('user-2', { lat: 2, lng: 2, barrio: 'B' });

    const mios = await service.findMine('user-1');
    expect(mios).toHaveLength(1);
    expect(mios[0].createdByUserId).toBe('user-1');
  });

  it('create asigna el punto a su creador automaticamente', async () => {
    const repo = new InMemoryPuntosRepository();
    const asignado: { puntoId?: string; userId?: string } = {};
    const asignacionesStubLocal = { asignarACreador: async (puntoId: string, userId: string) => { asignado.puntoId = puntoId; asignado.userId = userId; } };
    const procesosStubLocal = { recalculateStatus: async () => {} };
    const service = new PuntosService(repo, asignacionesStubLocal as any, procesosStubLocal as any);
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    expect(asignado.puntoId).toBe(punto.id);
    expect(asignado.userId).toBe('user-1');
  });
});

describe('PuntosService — ciclo de vida', () => {
  const makeService = () => {
    const repo = new InMemoryPuntosRepository();
    return { service: new PuntosService(repo, asignacionesStub as any, procesosStub as any), repo };
  };

  it('send cambia el estado de BORRADOR a ENVIADA', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    const enviado = await service.send(punto.id, 'user-1');
    expect(enviado.status).toBe('ENVIADA');
  });

  it('send rechaza si quien envia no es el creador', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await expect(service.send(punto.id, 'otro-user')).rejects.toThrow();
  });

  it('approve marca PUBLICADA y guarda el validador', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await service.send(punto.id, 'user-1');
    const aprobado = await service.approve(punto.id, 'validador-1');
    expect(aprobado.status).toBe('PUBLICADA');
    expect(aprobado.validatorUserId).toBe('validador-1');
    expect(aprobado.publishedAt).toBeInstanceOf(Date);
  });

  it('reject marca RECHAZADA con las notas', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await service.send(punto.id, 'user-1');
    const rechazado = await service.reject(punto.id, 'validador-1', 'Faltan fotos');
    expect(rechazado.status).toBe('RECHAZADA');
    expect(rechazado.validationNotes).toBe('Faltan fotos');
  });

  it('seguimiento MARCAR_RECOGIDO marca el residuo como recogido', async () => {
    const { service, repo } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await repo.save({ ...punto, residuos: [{ id: 'r1', tipoResiduo: 'ESCOMBROS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: false }] } as any);
    const actualizado = await service.seguimiento('user-1', 'user1@test.com', punto.id, { action: 'MARCAR_RECOGIDO', residuoId: 'r1' });
    expect(actualizado.residuos[0].recogido).toBe(true);
    expect(actualizado.residuos[0].recogidoByNombre).toBe('user1@test.com');
  });

  it('seguimiento AGREGAR_RESIDUO agrega un residuo nuevo', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    const actualizado = await service.seguimiento('user-1', 'user1@test.com', punto.id, {
      action: 'AGREGAR_RESIDUO',
      nuevoResiduo: { tipoResiduo: 'PLANTAS', quienDispuso: 'COMUNIDAD', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 2, photos: [] },
    });
    expect(actualizado.residuos).toHaveLength(1);
    expect(actualizado.residuos[0].createdByNombre).toBe('user1@test.com');
  });

  it('mergeResiduos junta los residuos de los hijos en el padre y borra los hijos', async () => {
    const { service, repo } = makeService();
    const padre = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    const hijo = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await repo.save({ ...(await repo.findById(hijo.id))!, residuos: [{ id: 'rh', tipoResiduo: 'ESCOMBROS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: false }] } as any);

    const fusionado = await service.mergeResiduos(padre.id, [hijo.id]);
    expect(fusionado.residuos).toHaveLength(1);
    expect(await repo.findById(hijo.id)).toBeNull();
  });

  it('aprobarResiduo reemplaza el array de residuos del punto', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    const nuevos = [{ id: 'r1', tipoResiduo: 'PLANTAS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: true }];
    const actualizado = await service.aprobarResiduo(punto.id, nuevos as any);
    expect(actualizado.residuos).toEqual(nuevos);
  });
});
