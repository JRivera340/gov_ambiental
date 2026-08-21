import { BarriosService } from './barrios.service';
import { BARRIOS } from './barrio.enum';

// Corre contra el KML real (boundaries/doc.kml) — si ese archivo vuelve a
// faltar, estos tests fallan en vez de que el sistema empiece a guardar
// puntos sin barrio en silencio, que fue justamente el bug.
describe('BarriosService', () => {
  const service = new BarriosService();

  it('resuelve un punto del centro de la localidad a un barrio del catalogo', () => {
    const barrio = service.resolverPorCoordenada(4.6097, -74.0717);
    expect(barrio).toBeTruthy();
    expect(BARRIOS).toContain(barrio as string);
  });

  it('devuelve null para una coordenada fuera de la localidad', () => {
    expect(service.resolverPorCoordenada(0, 0)).toBeNull();
  });

  it('devuelve null si la coordenada es invalida', () => {
    expect(service.resolverPorCoordenada(NaN, NaN)).toBeNull();
  });

  it('esBarrioValido acepta solo nombres del catalogo', () => {
    expect(service.esBarrioValido('VERACRUZ')).toBe(true);
    expect(service.esBarrioValido('veracruz')).toBe(true);
    expect(service.esBarrioValido('')).toBe(false);
    expect(service.esBarrioValido(undefined)).toBe(false);
    expect(service.esBarrioValido('BARRIO QUE NO EXISTE')).toBe(false);
  });

  it('resolver respeta el barrio sugerido cuando es del catalogo', () => {
    expect(service.resolver('LAS NIEVES', 4.6097, -74.0717)).toBe('LAS NIEVES');
  });

  it('resolver ignora un barrio sugerido invalido y lo deriva de la coordenada', () => {
    const resuelto = service.resolver('', 4.6097, -74.0717);
    expect(BARRIOS).toContain(resuelto);
  });
});
