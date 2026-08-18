import { PuntosService, toPublicPunto } from './puntos.service';
import { InMemoryPuntosRepository } from './puntos.repository.memory';
import { EstadoPunto } from './entities/punto-residuo.entity';

const asignacionesStub = { asignarACreador: async () => {} };
const procesosStub = { recalculateStatus: async () => {} };
const visitasStub = { registrarVisita: async () => {} };

describe('PuntosService', () => {
  const makeService = () => {
    const repo = new InMemoryPuntosRepository();
    return { service: new PuntosService(repo, asignacionesStub as any, procesosStub as any, visitasStub as any), repo };
  };

  it('crea un punto con entidad responsable, acompanantes y gestores involucrados', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', {
      lat: 1, lng: 1, barrio: 'A',
      results: 'Descripcion general',
      entidadResponsable: 'ALCALDIA_LOCAL',
      entidadesAcompanantes: ['POLICIA', 'BOMBEROS'],
      gestoresInvolucradosIds: ['gestor-2', 'gestor-3'],
    });
    expect(punto.results).toBe('Descripcion general');
    expect(punto.entidadResponsable).toBe('ALCALDIA_LOCAL');
    expect(punto.entidadesAcompanantes).toEqual(['POLICIA', 'BOMBEROS']);
    expect(punto.gestoresInvolucradosIds).toEqual(['gestor-2', 'gestor-3']);
    expect(punto.isGroupOperativo).toBe(true);
  });

  describe('update', () => {
    it('permite editar entidad responsable y gestores involucrados', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      const actualizado = await service.update(punto.id, 'user-1', {
        entidadResponsable: 'CVP',
        gestoresInvolucradosIds: ['gestor-9'],
      });
      expect(actualizado.entidadResponsable).toBe('CVP');
      expect(actualizado.gestoresInvolucradosIds).toEqual(['gestor-9']);
      expect(actualizado.isGroupOperativo).toBe(true);
    });

    it('permite al creador editar un punto en BORRADOR', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      const actualizado = await service.update(punto.id, 'user-1', { barrio: 'B', lat: 2 });
      expect(actualizado.barrio).toBe('B');
      expect(actualizado.lat).toBe(2);
    });

    it('permite al creador editar un punto RECHAZADA (corregir y reenviar)', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      await service.send(punto.id, 'user-1');
      await service.reject(punto.id, 'validador-1', 'Faltan fotos');
      const actualizado = await service.update(punto.id, 'user-1', { barrio: 'Corregido' });
      expect(actualizado.barrio).toBe('Corregido');
    });

    it('rechaza editar un punto ya ENVIADA', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      await service.send(punto.id, 'user-1');
      await expect(service.update(punto.id, 'user-1', { barrio: 'X' })).rejects.toThrow();
    });

    it('rechaza editar si quien edita no es el creador', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      await expect(service.update(punto.id, 'otro-user', { barrio: 'X' })).rejects.toThrow();
    });

    it('reemplaza el array de residuos cuando se pasa uno nuevo', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      const actualizado = await service.update(punto.id, 'user-1', {
        residuos: [{ tipoResiduo: 'PLANTAS', quienDispuso: 'COMUNIDAD', areaLinealMetros: 2, percibeOlores: false, percibeVectores: false, photos: [] }],
      });
      expect(actualizado.residuos).toHaveLength(1);
      expect(actualizado.residuos[0].tipoResiduo).toBe('PLANTAS');
      expect(actualizado.residuos[0].id).toBeTruthy();
    });
  });

  it('crea un punto asignando el creador desde el usuario autenticado', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 4.1, lng: -74.2, barrio: 'Centro' });
    expect(punto.createdByUserId).toBe('user-1');
    expect(punto.status).toBe('BORRADOR');
    expect(punto.residuos).toEqual([]);
  });

  it('crea un punto con residuos/fotos/acta iniciales (flujo de registro completo)', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', {
      lat: 4.1,
      lng: -74.2,
      barrio: 'Centro',
      dateTime: '2026-07-01T10:00:00.000Z',
      photos: ['foto1.jpg'],
      actaPdfUrl: 'acta.pdf',
      residuos: [{ tipoResiduo: 'ESCOMBROS', quienDispuso: 'COMUNIDAD', areaLinealMetros: 5, percibeOlores: false, percibeVectores: false, photos: [] }],
    });
    expect(punto.photos).toEqual(['foto1.jpg']);
    expect(punto.actaPdfUrl).toBe('acta.pdf');
    expect(punto.dateTime.toISOString()).toBe('2026-07-01T10:00:00.000Z');
    expect(punto.residuos).toHaveLength(1);
    expect(punto.residuos[0].tipoResiduo).toBe('ESCOMBROS');
    expect(punto.residuos[0].id).toBeTruthy();
    expect(punto.residuos[0].recogido).toBe(false);
  });

  it('findMine devuelve solo los puntos del usuario que pregunta', async () => {
    const { service } = makeService();
    await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await service.create('user-2', { lat: 2, lng: 2, barrio: 'B' });

    const mios = await service.findMine('user-1');
    expect(mios).toHaveLength(1);
    expect(mios[0].createdByUserId).toBe('user-1');
  });

  it('findAll devuelve los puntos de todos los usuarios, no solo los propios', async () => {
    const { service } = makeService();
    await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await service.create('user-2', { lat: 2, lng: 2, barrio: 'B' });

    const todos = await service.findAll();
    expect(todos).toHaveLength(2);
  });

  it('findAll filtra por rango de fechas cuando se pasan desde/hasta', async () => {
    const { service, repo } = makeService();
    const viejo = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await repo.save({ ...viejo, dateTime: new Date('2020-01-01T00:00:00.000Z') } as any);
    await service.create('user-2', { lat: 2, lng: 2, barrio: 'B', dateTime: '2026-01-01T00:00:00.000Z' } as any);

    const filtrados = await service.findAll({ desde: '2025-01-01T00:00:00.000Z' });
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].barrio).toBe('B');
  });

  it('create asigna el punto a su creador automaticamente', async () => {
    const repo = new InMemoryPuntosRepository();
    const asignado: { puntoId?: string; userId?: string } = {};
    const asignacionesStubLocal = { asignarACreador: async (puntoId: string, userId: string) => { asignado.puntoId = puntoId; asignado.userId = userId; } };
    const procesosStubLocal = { recalculateStatus: async () => {} };
    const service = new PuntosService(repo, asignacionesStubLocal as any, procesosStubLocal as any, visitasStub as any);
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    expect(asignado.puntoId).toBe(punto.id);
    expect(asignado.userId).toBe('user-1');
  });
});

describe('PuntosService — ciclo de vida', () => {
  const makeService = () => {
    const repo = new InMemoryPuntosRepository();
    return { service: new PuntosService(repo, asignacionesStub as any, procesosStub as any, visitasStub as any), repo };
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

describe('PuntosService — proyeccion publica', () => {
  const makeService = () => {
    const repo = new InMemoryPuntosRepository();
    return { service: new PuntosService(repo, asignacionesStub as any, procesosStub as any, visitasStub as any), repo };
  };

  const puntoConDatosInternos = (id: string) => ({
    id,
    createdByUserId: 'user-1',
    status: EstadoPunto.PUBLICADA,
    dateTime: new Date('2026-01-01T00:00:00.000Z'),
    lat: 4.05,
    lng: -74.05,
    barrio: 'Centro',
    photos: ['foto1.jpg'],
    photosFase2: undefined,
    fechaFinalizacion: undefined,
    actaPdfUrl: undefined,
    validatorUserId: 'validador-1',
    validatedAt: new Date(),
    validationNotes: 'Notas internas de validacion',
    publishedAt: new Date(),
    processId: undefined,
    descripcionAntes: 'antes',
    descripcionDespues: 'despues',
    revisadoPorUserId: 'revisor-1',
    revisadoPorNombre: 'revisor@ejemplo.com',
    fechaRevision: new Date(),
    pointNumber: 7,
    categorySeq: 1,
    residuos: [
      {
        id: 'r1',
        tipoResiduo: 'ORDINARIOS',
        quienDispuso: 'COMUNIDAD',
        dateTime: new Date().toISOString(),
        percibeOlores: true,
        percibeVectores: false,
        areaLinealMetros: 3,
        observaciones: 'obs',
        photos: ['r1.jpg'],
        recogido: true,
        fechaRecogida: new Date().toISOString(),
        photosRecogida: ['rec1.jpg'],
        createdByUserId: 'user-1',
        createdByNombre: 'user1@ejemplo.com',
        recogidoByUserId: 'staff-1',
        recogidoByNombre: 'staff@ejemplo.com',
        notas: [{ id: 'n1', fecha: new Date().toISOString(), autorId: 'user-1', autorNombre: 'user1@ejemplo.com', texto: 'nota interna' }],
      },
    ],
    ultimoSeguimientoAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('toPublicPunto no expone campos internos del punto', () => {
    const punto = puntoConDatosInternos('p1');
    const publico = toPublicPunto(punto as any);

    expect(publico).not.toHaveProperty('createdByUserId');
    expect(publico).not.toHaveProperty('validatorUserId');
    expect(publico).not.toHaveProperty('validatedAt');
    expect(publico).not.toHaveProperty('validationNotes');
    expect(publico).not.toHaveProperty('processId');
    expect(publico).not.toHaveProperty('descripcionAntes');
    expect(publico).not.toHaveProperty('descripcionDespues');
    expect(publico).not.toHaveProperty('revisadoPorUserId');
    expect(publico).not.toHaveProperty('revisadoPorNombre');
    expect(publico).not.toHaveProperty('fechaRevision');
    expect(publico).not.toHaveProperty('categorySeq');
    expect(publico).not.toHaveProperty('ultimoSeguimientoAt');
    expect(publico).not.toHaveProperty('createdAt');
    expect(publico).not.toHaveProperty('updatedAt');
    expect(publico).not.toHaveProperty('actaPdfUrl');
    expect(publico).not.toHaveProperty('fechaFinalizacion');
  });

  it('toPublicPunto no expone campos internos de cada residuo', () => {
    const punto = puntoConDatosInternos('p1');
    const publico = toPublicPunto(punto as any);
    const residuoPublico = publico.residuos[0];

    expect(residuoPublico).not.toHaveProperty('quienDispuso');
    expect(residuoPublico).not.toHaveProperty('createdByUserId');
    expect(residuoPublico).not.toHaveProperty('createdByNombre');
    expect(residuoPublico).not.toHaveProperty('recogidoByUserId');
    expect(residuoPublico).not.toHaveProperty('recogidoByNombre');
    expect(residuoPublico).not.toHaveProperty('notas');
    expect(residuoPublico.id).toBe('r1');
    expect(residuoPublico.tipoResiduo).toBe('ORDINARIOS');
  });

  it('findOnePublic devuelve la proyeccion publica de un punto existente', async () => {
    const { service, repo } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await repo.save(puntoConDatosInternos(punto.id) as any);

    const publico = await service.findOnePublic(punto.id);

    expect(publico.id).toBe(punto.id);
    expect(publico).not.toHaveProperty('createdByUserId');
    expect(publico).not.toHaveProperty('validationNotes');
    expect(publico.residuos[0]).not.toHaveProperty('recogidoByNombre');
    expect(publico.residuos[0]).not.toHaveProperty('notas');
  });

  it('findOnePublic lanza NotFoundException si el punto no existe', async () => {
    const { service } = makeService();
    await expect(service.findOnePublic('no-existe')).rejects.toThrow();
  });
});
