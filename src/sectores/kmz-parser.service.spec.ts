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

  // Regresión: el import de @mapbox/togeojson (CommonJS puro, sin export
  // default) compilaba con `.default` accedido en tiempo de ejecución sobre
  // un objeto que nunca lo tuvo — tsc lo dejaba pasar por el @ts-ignore, y
  // los dos tests de arriba nunca llegaban a este código porque el archivo
  // no existía en esa ruta. En producción reventaba con "Cannot read
  // properties of undefined (reading 'kml')" apenas el KMZ SÍ estaba
  // presente. Este test corre contra el KMZ real del repo (raíz del
  // proyecto, no tmpdir) para que un regreso a ese bug rompa la suite.
  it('parsea el KMZ real del repo y devuelve sectores con geometría válida', async () => {
    const service = new KmzParserService();
    const sectors = await service.getSectors();
    expect(sectors.length).toBeGreaterThan(0);
    for (const s of sectors) {
      expect(['Polygon', 'MultiPolygon']).toContain(s.geometry.type);
      expect(s.id).toEqual(expect.any(String));
    }
  });
});
