import { describe, it, expect } from 'vitest';
import { getUltimaActualizacion } from './ultimaActualizacion';

describe('getUltimaActualizacion', () => {
  it('usa updatedAt si difiere de createdAt (esEdicion=true)', () => {
    const r = getUltimaActualizacion('2026-07-10T12:00:00Z', '2026-01-01T00:00:00Z');
    expect(r).toEqual({ iso: '2026-07-10T12:00:00Z', esEdicion: true });
  });
  it('cae a createdAt si updatedAt es igual a createdAt (nunca editado, esEdicion=false)', () => {
    const r = getUltimaActualizacion('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    expect(r).toEqual({ iso: '2026-01-01T00:00:00Z', esEdicion: false });
  });
  it('usa createdAt si no hay updatedAt', () => {
    const r = getUltimaActualizacion(undefined, '2026-01-01T00:00:00Z');
    expect(r).toEqual({ iso: '2026-01-01T00:00:00Z', esEdicion: false });
  });
  it('devuelve null si no hay ninguna fecha', () => {
    expect(getUltimaActualizacion(undefined, undefined)).toBeNull();
  });
});
