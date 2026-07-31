import { PuntosService, toPublicPunto } from './puntos.service';
import { InMemoryPuntosRepository } from './puntos.repository.memory';
import {
  CamarasPunto,
  EstadoPunto,
  FrecuenciaAcumulacion,
  IdentificacionGenerador,
  MetodoIdentificacion,
  TipoGenerador,
  TipoOperativo,
  TipoSuelo,
  TipoZona,
} from './entities/punto-residuo.entity';
import { Role } from '../common/enums/role.enum';

const asignacionesStub = { asignarACreador: async () => {} };
const procesosStub = { recalculateStatus: async () => {} };

describe('PuntosService', () => {
  const makeService = () => {
    const repo = new InMemoryPuntosRepository();
    return { service: new PuntosService(repo, asignacionesStub as any, procesosStub as any), repo };
  };

  it('asigna pointNumber=1 al primer punto de acumulacion creado', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    expect(punto.pointNumber).toBe(1);
  });

  it('el siguiente punto de acumulacion llena huecos antes de continuar tras el mas alto (igual que el hub)', async () => {
    const { service, repo } = makeService();
    // Simula datos migrados: puntos con numero 1 y 440 ya usados, hueco en 2..439.
    await repo.create({ createdByUserId: 'x', status: EstadoPunto.PUBLICADA, tipoOperativo: TipoOperativo.PUNTO_ACUMULACION, pointNumber: 1, dateTime: new Date(), lat: 1, lng: 1, barrio: 'A', photos: [], isGroupOperativo: false, residuos: [] } as any);
    await repo.create({ createdByUserId: 'x', status: EstadoPunto.PUBLICADA, tipoOperativo: TipoOperativo.PUNTO_ACUMULACION, pointNumber: 440, dateTime: new Date(), lat: 1, lng: 1, barrio: 'A', photos: [], isGroupOperativo: false, residuos: [] } as any);

    const nuevo = await service.create('user-1', { lat: 2, lng: 2, barrio: 'B' });
    expect(nuevo.pointNumber).toBe(2);
  });

  it('sin huecos, el siguiente punto continua tras el numero mas alto', async () => {
    const { service, repo } = makeService();
    await repo.create({ createdByUserId: 'x', status: EstadoPunto.PUBLICADA, tipoOperativo: TipoOperativo.PUNTO_ACUMULACION, pointNumber: 1, dateTime: new Date(), lat: 1, lng: 1, barrio: 'A', photos: [], isGroupOperativo: false, residuos: [] } as any);
    await repo.create({ createdByUserId: 'x', status: EstadoPunto.PUBLICADA, tipoOperativo: TipoOperativo.PUNTO_ACUMULACION, pointNumber: 2, dateTime: new Date(), lat: 1, lng: 1, barrio: 'A', photos: [], isGroupOperativo: false, residuos: [] } as any);

    const nuevo = await service.create('user-1', { lat: 2, lng: 2, barrio: 'B' });
    expect(nuevo.pointNumber).toBe(3);
  });

  it('no asigna pointNumber a un operativo GENERICO', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A', tipoOperativo: TipoOperativo.GENERICO } as any);
    expect(punto.pointNumber).toBeUndefined();
  });

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

  it('persiste los 26 campos del formulario fijo y los recupera igual al reabrir el punto (ver ESTADO-EXTRACCION.md, regresion de operativoData)', async () => {
    const { service, repo } = makeService();
    const formularioLlenado = {
      lat: 4.6, lng: -74.08, barrio: 'La Candelaria',
      entidadResponsable: 'UAESP',
      frecuenciaAcumulacion: FrecuenciaAcumulacion.FRECUENTE,
      observaciones: 'Punto reincidente hace 3 semanas',
      entornoEscolar: true,
      nombreEntornoEscolar: 'Colegio Distrital X',
      especificarEntorno: 'Cerca de la entrada principal',
      tipoZona: TipoZona.RESIDENCIAL,
      tipoSuelo: TipoSuelo.ANDEN,
      condicionesZona: ['MAL_ESTADO_VIA', 'FALTA_ILUMINACION'],
      poblacionHabitanteCalle: true,
      factoresAcumulacion: ['CONTENEDOR_MAL_UBICADO', 'AUSENCIA_CONTENEDOR'],
      camarasPunto: CamarasPunto.FUNCIONAMIENTO,
      operadorAseo: 'Promoambiental',
      recoleccionPuertaAPuerta: false,
      m2Invasion: 12.5,
      actoresIndisciplina: 'Vendedores ambulantes de la zona',
      intervencionesPropuestas: 'Instalar contenedor y sensibilizar',
      identificacionGenerador: IdentificacionGenerador.PARCIALMENTE,
      tipoGenerador: TipoGenerador.COMUNIDAD,
      nombreResponsable: 'Juan Pérez (ficticio, dato de prueba)',
      direccionResponsable: 'Calle 10 # 5-20 (ficticio, dato de prueba)',
      observoDisposicion: true,
      fechaObservacion: '2026-07-20T08:30:00.000Z',
      metodoIdentificacion: MetodoIdentificacion.OBSERVACION_DIRECTA,
      actoresEstrategicos: ['JAC', 'ADMINISTRADOR_SECTOR'],
      telefonoActor: '3000000000 (ficticio, dato de prueba)',
      intervencionesRecomendadas: ['LIMPIEZA_INMEDIATA', 'INSTALACION_CONTENEDOR'],
    };

    const creado = await service.create('user-1', formularioLlenado as any);

    // "Reabrir el punto": no confiar en el objeto devuelto por create(), volver
    // a leerlo desde el repositorio como haria la app al abrir el detalle.
    const reabierto = await repo.findById(creado.id);
    expect(reabierto).not.toBeNull();

    for (const [campo, valorEsperado] of Object.entries(formularioLlenado)) {
      if (campo === 'lat' || campo === 'lng' || campo === 'barrio' || campo === 'entidadResponsable') continue;
      const valorReabierto = (reabierto as any)[campo];
      if (campo === 'fechaObservacion') {
        expect(new Date(valorReabierto).toISOString()).toBe(valorEsperado);
      } else {
        expect(valorReabierto).toEqual(valorEsperado);
      }
    }
  });

  it('crea un punto GENERICO (subtipo Ambiental) con sus 7 contadores y campos compartidos, sin residuos', async () => {
    const { service, repo } = makeService();
    const operativoGenerico = {
      lat: 4.6, lng: -74.08, barrio: 'La Candelaria',
      tipoOperativo: TipoOperativo.GENERICO,
      results: 'Jornada de sensibilizacion y limpieza en el sector',
      photos: ['photos/op-1/a.jpg'],
      actaPdfUrl: 'actas/op-1/acta.pdf',
      entidadResponsable: 'UAESP',
      isGroupOperativo: true,
      gestoresInvolucradosIds: ['gestor-2'],
      puntosCriticosEmergentesAtendidos: 3,
      comparendosPedagogicos: 2,
      comparendos: 1,
      personasSensibilizadas: 40,
      huertas: 1,
      kgMaterialResiduosRecolectados: 250.5,
      m2RecuperadosEspacioPublico: 18.2,
    };

    const creado = await service.create('user-1', operativoGenerico as any);
    const reabierto = await repo.findById(creado.id);

    expect(reabierto?.tipoOperativo).toBe(TipoOperativo.GENERICO);
    expect(reabierto?.residuos).toEqual([]);
    for (const [campo, valorEsperado] of Object.entries(operativoGenerico)) {
      if (['lat', 'lng', 'barrio', 'entidadResponsable', 'tipoOperativo'].includes(campo)) continue;
      expect((reabierto as any)[campo]).toEqual(valorEsperado);
    }
  });

  it('un punto sin tipoOperativo explicito queda como PUNTO_ACUMULACION por defecto', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    expect(punto.tipoOperativo).toBe(TipoOperativo.PUNTO_ACUMULACION);
  });

  describe('update', () => {
    it('permite editar entidad responsable y gestores involucrados', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      const actualizado = await service.update(punto.id, 'user-1', Role.GESTOR_AMBIENTAL, {
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
      const actualizado = await service.update(punto.id, 'user-1', Role.GESTOR_AMBIENTAL, { barrio: 'B', lat: 2 });
      expect(actualizado.barrio).toBe('B');
      expect(actualizado.lat).toBe(2);
    });

    it('permite al creador editar un punto RECHAZADA (corregir y reenviar)', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      await service.send(punto.id, 'user-1');
      await service.reject(punto.id, 'validador-1', 'Faltan fotos');
      const actualizado = await service.update(punto.id, 'user-1', Role.GESTOR_AMBIENTAL, { barrio: 'Corregido' });
      expect(actualizado.barrio).toBe('Corregido');
    });

    it('rechaza editar un punto ya ENVIADA', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      await service.send(punto.id, 'user-1');
      await expect(service.update(punto.id, 'user-1', Role.GESTOR_AMBIENTAL, { barrio: 'X' })).rejects.toThrow();
    });

    it('rechaza editar si quien edita no es el creador ni VALIDADOR_AMBIENTAL/ADMIN', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      await expect(service.update(punto.id, 'otro-user', Role.GESTOR_AMBIENTAL, { barrio: 'X' })).rejects.toThrow();
    });

    it('permite a VALIDADOR_AMBIENTAL editar un punto que no creo', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      const actualizado = await service.update(punto.id, 'validador-1', Role.VALIDADOR_AMBIENTAL, { barrio: 'Editado por validador' });
      expect(actualizado.barrio).toBe('Editado por validador');
    });

    it('permite a ADMIN editar un punto que no creo', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      const actualizado = await service.update(punto.id, 'admin-1', Role.ADMIN, { barrio: 'Editado por admin' });
      expect(actualizado.barrio).toBe('Editado por admin');
    });

    it('reemplaza el array de residuos cuando se pasa uno nuevo', async () => {
      const { service } = makeService();
      const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
      const actualizado = await service.update(punto.id, 'user-1', Role.GESTOR_AMBIENTAL, {
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

  it('approve recalcula el estado del proceso cuando el punto esta ligado a uno', async () => {
    const repo = new InMemoryPuntosRepository();
    const recalculado: string[] = [];
    const procesosStubLocal = { recalculateStatus: async (processId: string) => { recalculado.push(processId); } };
    const service = new PuntosService(repo, asignacionesStub as any, procesosStubLocal as any);
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await service.send(punto.id, 'user-1');
    await repo.save({ ...(await repo.findById(punto.id))!, processId: 'proceso-1' } as any);

    await service.approve(punto.id, 'validador-1');

    expect(recalculado).toEqual(['proceso-1']);
  });

  it('approve no llama a recalculateStatus si el punto no esta ligado a un proceso', async () => {
    const recalculado: string[] = [];
    const procesosStubLocal = { recalculateStatus: async (processId: string) => { recalculado.push(processId); } };
    const repo = new InMemoryPuntosRepository();
    const service = new PuntosService(repo, asignacionesStub as any, procesosStubLocal as any);
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await service.send(punto.id, 'user-1');

    await service.approve(punto.id, 'validador-1');

    expect(recalculado).toEqual([]);
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

  // ultimoSeguimientoAt es lo que la ruta semanal usa para marcar un punto
  // "visitado" (ver frontend/src/pages/gestor-ambiental/lib/visitado.ts).
  // Las 3 acciones que deben estamparlo, igual que en el hub
  // (sorver.repository.typeorm.ts): marcar recogido, agregar residuo nuevo,
  // agregar una nota.
  it('seguimiento MARCAR_RECOGIDO estampa ultimoSeguimientoAt', async () => {
    const { service, repo } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await repo.save({ ...punto, residuos: [{ id: 'r1', tipoResiduo: 'ESCOMBROS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: false }] } as any);
    expect((await repo.findById(punto.id))!.ultimoSeguimientoAt).toBeUndefined();
    const actualizado = await service.seguimiento('user-1', 'user1@test.com', punto.id, { action: 'MARCAR_RECOGIDO', residuoId: 'r1' });
    expect(actualizado.ultimoSeguimientoAt).toBeInstanceOf(Date);
  });

  it('seguimiento AGREGAR_RESIDUO estampa ultimoSeguimientoAt', async () => {
    const { service } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    const actualizado = await service.seguimiento('user-1', 'user1@test.com', punto.id, {
      action: 'AGREGAR_RESIDUO',
      nuevoResiduo: { tipoResiduo: 'PLANTAS', quienDispuso: 'COMUNIDAD', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 2, photos: [] },
    });
    expect(actualizado.ultimoSeguimientoAt).toBeInstanceOf(Date);
  });

  it('agregarNota estampa ultimoSeguimientoAt (paridad con el hub, antes no lo hacia)', async () => {
    const { service, repo } = makeService();
    const punto = await service.create('user-1', { lat: 1, lng: 1, barrio: 'A' });
    await repo.save({ ...punto, residuos: [{ id: 'r1', tipoResiduo: 'ESCOMBROS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: false }] } as any);
    const actualizado = await service.agregarNota('user-1', 'user1@test.com', punto.id, { residuoId: 'r1', texto: 'Se ve mas grande hoy' });
    expect(actualizado.ultimoSeguimientoAt).toBeInstanceOf(Date);
    expect(actualizado.residuos[0].notas).toHaveLength(1);
  });
});

describe('PuntosService — proyeccion publica', () => {
  const makeService = () => {
    const repo = new InMemoryPuntosRepository();
    return { service: new PuntosService(repo, asignacionesStub as any, procesosStub as any), repo };
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
