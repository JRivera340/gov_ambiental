import { describe, it, expect } from 'vitest';
import { getUltimaActualizacion } from './ultimaActualizacion';

describe('getUltimaActualizacion', () => {
  it('usa infoActualizadaAt si existe (esEdicion=true)', () => {
    const r = getUltimaActualizacion({ infoActualizadaAt: '2026-07-10T12:00:00Z' }, '2026-01-01');
    expect(r).toEqual({ iso: '2026-07-10T12:00:00Z', esEdicion: true });
  });
  it('cae a createdAt si no hay infoActualizadaAt (esEdicion=false)', () => {
    const r = getUltimaActualizacion({}, '2026-01-01T00:00:00Z');
    expect(r).toEqual({ iso: '2026-01-01T00:00:00Z', esEdicion: false });
  });
  it('devuelve null si no hay ninguna fecha', () => {
    expect(getUltimaActualizacion({}, undefined)).toBeNull();
    expect(getUltimaActualizacion(null, undefined)).toBeNull();
  });
});
