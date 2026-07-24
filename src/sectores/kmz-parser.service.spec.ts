import { KmzParserService } from './kmz-parser.service';

describe('KmzParserService', () => {
  it('devuelve array vacio si el KMZ no existe en la ruta configurada', async () => {
    const originalCwd = process.cwd();
    process.chdir(require('os').tmpdir()); // ruta sin boundaries/RecoleccionUrbana.kmz
    try {
      const service = new KmzParserService();
      const sectors = await service.getSectors();
      expect(sectors).toEqual([]);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('getSectorById devuelve null cuando no hay sectores cargados', async () => {
    const originalCwd = process.cwd();
    process.chdir(require('os').tmpdir());
    try {
      const service = new KmzParserService();
      expect(await service.getSectorById('no-existe')).toBeNull();
    } finally {
      process.chdir(originalCwd);
    }
  });
});
