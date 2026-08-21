import { describe, it, expect } from 'vitest';
import { diasDesdeUltimoToque } from './visitado';

// `visitadoEstaSemana` se eliminó: ultimoSeguimientoAt no guarda autor, así
// que no podía responder si visitó ESTE gestor, que es lo que dice la regla de
// negocio. Ahora los puntos visitados los informa el backend en el plan del
// ciclo. Acá solo queda la antigüedad del último toque, que es un dato de
// visualización.
describe('diasDesdeUltimoToque', () => {
  it('Infinity si nunca hubo seguimiento', () => {
    expect(diasDesdeUltimoToque(null, new Date())).toBe(Infinity);
    expect(diasDesdeUltimoToque(undefined, new Date())).toBe(Infinity);
  });

  it('calcula dias corridos desde el ultimo seguimiento', () => {
    const ahora = new Date('2026-07-15T12:00:00Z');
    const hace8dias = new Date('2026-07-07T12:00:00Z').toISOString();
    expect(diasDesdeUltimoToque(hace8dias, ahora)).toBe(8);
  });

  it('no devuelve negativos si la fecha esta en el futuro', () => {
    const ahora = new Date('2026-07-15T12:00:00Z');
    expect(diasDesdeUltimoToque('2026-07-20T12:00:00Z', ahora)).toBe(0);
  });
});
