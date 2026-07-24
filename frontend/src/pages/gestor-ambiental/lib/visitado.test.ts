import { describe, it, expect } from 'vitest';
import { visitadoEstaSemana, diasDesdeUltimoSeguimiento } from './visitado';

describe('visitadoEstaSemana', () => {
  it('false si nunca hubo seguimiento', () => {
    expect(visitadoEstaSemana(null, new Date('2026-07-15T12:00:00-05:00'))).toBe(false);
    expect(visitadoEstaSemana(undefined, new Date('2026-07-15T12:00:00-05:00'))).toBe(false);
  });

  it('true si el ultimo seguimiento cae dentro de la semana calendario actual (lunes-domingo Bogota)', () => {
    // 2026-07-15 es miercoles; la semana va del lunes 13 al domingo 19 de julio (hora Bogota).
    const ahora = new Date('2026-07-15T12:00:00-05:00');
    expect(visitadoEstaSemana('2026-07-13T08:00:00-05:00', ahora)).toBe(true);
    expect(visitadoEstaSemana('2026-07-19T23:00:00-05:00', ahora)).toBe(true);
  });

  it('false si el ultimo seguimiento fue la semana pasada', () => {
    const ahora = new Date('2026-07-15T12:00:00-05:00');
    expect(visitadoEstaSemana('2026-07-12T23:00:00-05:00', ahora)).toBe(false);
  });
});

describe('diasDesdeUltimoSeguimiento', () => {
  it('Infinity si nunca hubo seguimiento', () => {
    expect(diasDesdeUltimoSeguimiento(null, new Date())).toBe(Infinity);
  });

  it('calcula dias corridos desde el ultimo seguimiento', () => {
    const ahora = new Date('2026-07-15T12:00:00Z');
    const hace8dias = new Date('2026-07-07T12:00:00Z').toISOString();
    expect(diasDesdeUltimoSeguimiento(hace8dias, ahora)).toBe(8);
  });
});
