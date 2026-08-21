import { extraerVisitasDePunto, filtrarNuevas, idDeterministico, claveDia } from './backfill-visitas.util';

const punto = (over: any = {}): any => ({
  id: 'punto-1',
  createdByUserId: 'creador',
  dateTime: new Date('2026-05-10T14:00:00.000Z'),
  residuos: [],
  ...over,
});

describe('extraerVisitasDePunto', () => {
  it('deriva las tres acciones de la regla de negocio', () => {
    const p = punto({
      residuos: [{
        id: 'r1',
        createdByUserId: 'g-crea',
        dateTime: '2026-05-10T14:00:00.000Z',
        recogido: true,
        recogidoByUserId: 'g-recoge',
        fechaRecogida: '2026-05-12T16:00:00.000Z',
        notas: [{ id: 'n1', autorId: 'g-nota', fecha: '2026-05-13T09:00:00.000Z', texto: 'x' }],
      }],
    });

    const visitas = extraerVisitasDePunto(p);
    expect(visitas.map((v) => v.origen).sort()).toEqual(['CREADO', 'NOTA', 'RECOGIDO']);
    expect(visitas.find((v) => v.origen === 'RECOGIDO')!.gestorId).toBe('g-recoge');
    expect(visitas.find((v) => v.origen === 'NOTA')!.gestorId).toBe('g-nota');
    expect(visitas.find((v) => v.origen === 'CREADO')!.gestorId).toBe('g-crea');
  });

  it('atribuye el residuo inicial al creador del punto cuando no tiene autor propio', () => {
    const p = punto({ residuos: [{ id: 'r1', recogido: false, dateTime: '2026-05-10T14:00:00.000Z' }] });
    const visitas = extraerVisitasDePunto(p);
    expect(visitas).toHaveLength(1);
    expect(visitas[0].gestorId).toBe('creador');
  });

  it('calcula la semanaISO desde la fecha del evento, no desde hoy', () => {
    const p = punto({
      residuos: [{ id: 'r1', recogido: false, createdByUserId: 'g1', dateTime: '2026-05-10T14:00:00.000Z' }],
    });
    expect(extraerVisitasDePunto(p)[0].semanaISO).toMatch(/^2026-W\d{2}$/);
  });

  it('descarta eventos sin autor', () => {
    const p = punto({
      createdByUserId: '',
      residuos: [{ id: 'r1', recogido: true, recogidoByUserId: null, fechaRecogida: '2026-05-12T16:00:00.000Z' }],
    });
    expect(extraerVisitasDePunto(p)).toHaveLength(0);
  });

  it('descarta eventos con fecha invalida o absurda', () => {
    const p = punto({
      dateTime: null,
      residuos: [
        { id: 'r1', recogido: false, createdByUserId: 'g1', dateTime: 'no-es-fecha' },
        { id: 'r2', recogido: false, createdByUserId: 'g1', dateTime: '1970-01-01T00:00:00.000Z' },
      ],
    });
    expect(extraerVisitasDePunto(p)).toHaveLength(0);
  });

  it('no registra visita por una nota sin autor', () => {
    const p = punto({
      residuos: [{
        id: 'r1', recogido: false, createdByUserId: 'g1', dateTime: '2026-05-10T14:00:00.000Z',
        notas: [{ id: 'n1', fecha: '2026-05-13T09:00:00.000Z', texto: 'sin autor' }],
      }],
    });
    expect(extraerVisitasDePunto(p).filter((v) => v.origen === 'NOTA')).toHaveLength(0);
  });
});

describe('idDeterministico', () => {
  it('produce el mismo id para el mismo evento (correrlo dos veces no duplica)', () => {
    const a = idDeterministico('p1', 'g1', '2026-05-10T14:00:00.000Z', 'NOTA');
    const b = idDeterministico('p1', 'g1', '2026-05-10T14:00:00.000Z', 'NOTA');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('produce ids distintos para eventos distintos', () => {
    const base = idDeterministico('p1', 'g1', '2026-05-10T14:00:00.000Z', 'NOTA');
    expect(idDeterministico('p2', 'g1', '2026-05-10T14:00:00.000Z', 'NOTA')).not.toBe(base);
    expect(idDeterministico('p1', 'g2', '2026-05-10T14:00:00.000Z', 'NOTA')).not.toBe(base);
    expect(idDeterministico('p1', 'g1', '2026-05-10T14:00:00.000Z', 'CREADO')).not.toBe(base);
  });
});

describe('filtrarNuevas', () => {
  const visita = (id: string, puntoResiduoId: string, gestorId: string, fecha: string): any => ({
    id, puntoResiduoId, gestorId, fecha: new Date(fecha), semanaISO: '2026-W20', origen: 'NOTA',
  });

  it('descarta las que ya estan en la tabla por id', () => {
    const candidatas = [visita('id-1', 'p1', 'g1', '2026-05-10T14:00:00.000Z')];
    expect(filtrarNuevas(candidatas, new Set(['id-1']), new Set())).toHaveLength(0);
  });

  it('descarta duplicados dentro del mismo lote', () => {
    const candidatas = [
      visita('id-1', 'p1', 'g1', '2026-05-10T14:00:00.000Z'),
      visita('id-1', 'p1', 'g1', '2026-05-10T14:00:00.000Z'),
    ];
    expect(filtrarNuevas(candidatas, new Set(), new Set())).toHaveLength(1);
  });

  it('no vuelve a insertar un dia que ya tiene visita organica del mismo gestor y punto', () => {
    const v = visita('id-1', 'p1', 'g1', '2026-05-10T14:00:00.000Z');
    expect(filtrarNuevas([v], new Set(), new Set([claveDia(v)]))).toHaveLength(0);
  });

  it('deja pasar las nuevas', () => {
    const candidatas = [
      visita('id-1', 'p1', 'g1', '2026-05-10T14:00:00.000Z'),
      visita('id-2', 'p2', 'g1', '2026-05-11T14:00:00.000Z'),
    ];
    expect(filtrarNuevas(candidatas, new Set(), new Set())).toHaveLength(2);
  });
});
