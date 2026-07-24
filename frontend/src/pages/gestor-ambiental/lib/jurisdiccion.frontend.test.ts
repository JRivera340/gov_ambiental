import { describe, it, expect } from 'vitest';
import { filtrarPuntosAsignados } from './jurisdiccion.frontend';

const P = (puntoId: string) => ({ puntoId });

describe('filtrarPuntosAsignados', () => {
  it('incluye los puntos cuyo puntoId está en la lista de asignados', () => {
    const out = filtrarPuntosAsignados([P('a1'), P('a2'), P('a3')], ['a1', 'a3']);
    expect(out.map(p => p.puntoId)).toEqual(['a1', 'a3']);
  });
  it('lista de asignados vacía → sin puntos', () => {
    expect(filtrarPuntosAsignados([P('a1')], [])).toEqual([]);
  });
  it('excluye los puntos que no están asignados', () => {
    const out = filtrarPuntosAsignados([P('a1'), P('a2')], ['a1']);
    expect(out.map(p => p.puntoId)).toEqual(['a1']);
    expect(out.some(p => p.puntoId === 'a2')).toBe(false);
  });
});
