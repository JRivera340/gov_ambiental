import { CatalogosController } from './catalogos.controller';

describe('CatalogosController', () => {
  const controller = new CatalogosController();

  it('getBarrios devuelve un array no vacio', () => {
    const result = controller.getBarrios();
    expect(Array.isArray(result.barrios)).toBe(true);
    expect(result.barrios.length).toBeGreaterThan(0);
  });

  it('getAllCatalogos devuelve barrios, tiposActividad y entidades', () => {
    const result = controller.getAllCatalogos();
    expect(result).toHaveProperty('barrios');
    expect(result).toHaveProperty('tiposActividad');
    expect(result).toHaveProperty('entidades');
  });
});
