import { describe, it, expect } from 'vitest';
import { groupAsignacionesByGestor } from './asignacionPuntos.lib';

describe('groupAsignacionesByGestor', () => {
  it('agrupa puntoResiduoIds por gestorId', () => {
    const rows = [
      { puntoResiduoId: 'a1', gestorId: 'g1' },
      { puntoResiduoId: 'a2', gestorId: 'g1' },
      { puntoResiduoId: 'a3', gestorId: 'g2' },
    ];
    expect(groupAsignacionesByGestor(rows)).toEqual({
      g1: ['a1', 'a2'],
      g2: ['a3'],
    });
  });

  it('ignora filas sin gestor asignado', () => {
    const rows = [
      { puntoResiduoId: 'a1', gestorId: null },
      { puntoResiduoId: 'a2', gestorId: 'g1' },
    ];
    expect(groupAsignacionesByGestor(rows)).toEqual({ g1: ['a2'] });
  });

  it('retorna objeto vacío cuando no hay filas', () => {
    expect(groupAsignacionesByGestor([])).toEqual({});
  });
});
