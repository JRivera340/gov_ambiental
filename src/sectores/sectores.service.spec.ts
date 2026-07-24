import { SectoresService } from './sectores.service';
import { EstadoPunto, PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { SectorFeature } from './kmz-parser.service';

const sectorFixture: SectorFeature = {
  type: 'Feature',
  id: 'sector-1',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-74.1, 4.0],
        [-74.0, 4.0],
        [-74.0, 4.1],
        [-74.1, 4.1],
        [-74.1, 4.0],
      ],
    ],
  },
  properties: { name: 'Sector Prueba', barrio: 'Centro' },
};

const makeKmzParserStub = () =>
  ({
    getSectorById: async (id: string) => (id === 'sector-1' ? sectorFixture : null),
  }) as any;

const makePuntoRepoStub = (initial: PuntoResiduo[] = []) => {
  const puntos = [...initial];
  return {
    puntos,
    find: async (_opts?: any) => [...puntos],
    save: async (punto: PuntoResiduo) => {
      const idx = puntos.findIndex((p) => p.id === punto.id);
      if (idx >= 0) puntos[idx] = punto;
      else puntos.push(punto);
      return punto;
    },
  } as any;
};

const makePunto = (overrides: Partial<PuntoResiduo> & { id: string; lat: number; lng: number }): PuntoResiduo =>
  ({
    createdByUserId: 'user-1',
    status: EstadoPunto.ENVIADA,
    dateTime: new Date('2026-01-01T00:00:00.000Z'),
    barrio: 'Centro',
    photos: [],
    residuos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as PuntoResiduo;

describe('SectoresService', () => {
  it('getPuntosEnSector incluye un punto dentro del sector con conteos correctos', async () => {
    const puntoDentro = makePunto({
      id: 'p-dentro',
      lat: 4.05,
      lng: -74.05,
      residuos: [
        { id: 'r1', tipoResiduo: 'ORDINARIOS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: true } as any,
        { id: 'r2', tipoResiduo: 'ORDINARIOS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: false } as any,
      ],
    });
    const repo = makePuntoRepoStub([puntoDentro]);
    const service = new SectoresService(repo, makeKmzParserStub());

    const resultado = await service.getPuntosEnSector('sector-1');

    expect(resultado.totalPuntos).toBe(1);
    expect(resultado.puntos[0].puntoId).toBe('p-dentro');
    expect(resultado.puntos[0].recogidos).toBe(1);
    expect(resultado.puntos[0].pendientes).toBe(1);
  });

  it('getPuntosEnSector excluye un punto fuera del sector', async () => {
    const puntoFuera = makePunto({ id: 'p-fuera', lat: 10.5, lng: -70.0 });
    const repo = makePuntoRepoStub([puntoFuera]);
    const service = new SectoresService(repo, makeKmzParserStub());

    const resultado = await service.getPuntosEnSector('sector-1');

    expect(resultado.totalPuntos).toBe(0);
    expect(resultado.puntos).toHaveLength(0);
  });

  it('marcarSectorComoRecogido marca solo los residuos ORDINARIOS del punto dentro del sector', async () => {
    const punto = makePunto({
      id: 'p-dentro',
      lat: 4.05,
      lng: -74.05,
      residuos: [
        { id: 'r1', tipoResiduo: 'ORDINARIOS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: false } as any,
        { id: 'r2', tipoResiduo: 'ESCOMBROS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: false } as any,
      ],
    });
    const repo = makePuntoRepoStub([punto]);
    const service = new SectoresService(repo, makeKmzParserStub());

    const resultado = await service.marcarSectorComoRecogido('sector-1', 'user-1', 'staff@ejemplo.com');

    expect(resultado.puntosAfectados).toBe(1);
    expect(resultado.residuosMarcados).toBe(1);

    const guardado: PuntoResiduo = repo.puntos.find((p: PuntoResiduo) => p.id === 'p-dentro')!;
    const ordinario = guardado.residuos.find((r: any) => r.id === 'r1')!;
    const escombro = guardado.residuos.find((r: any) => r.id === 'r2')!;

    expect(ordinario.recogido).toBe(true);
    expect(ordinario.recogidoByNombre).toBe('staff@ejemplo.com');
    expect(escombro.recogido).toBe(false);
    expect(escombro.recogidoByNombre).toBeUndefined();
  });

  it('marcarSectorComoRecogido lanza error cuando el sector no existe', async () => {
    const repo = makePuntoRepoStub([]);
    const service = new SectoresService(repo, makeKmzParserStub());

    await expect(service.marcarSectorComoRecogido('sector-desconocido', 'user-1', 'staff@ejemplo.com')).rejects.toThrow();
  });
});
