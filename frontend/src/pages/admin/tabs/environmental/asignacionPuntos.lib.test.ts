import { describe, it, expect } from 'vitest';
import { groupAsignacionesByGestor } from './asignacionPuntos.lib';

describe('groupAsignacionesByGestor', () => {
  it('agrupa activityIds por gestorId', () => {
    const rows = [
      { activityId: 'a1', gestorId: 'g1' },
      { activityId: 'a2', gestorId: 'g1' },
      { activityId: 'a3', gestorId: 'g2' },
    ];
    expect(groupAsignacionesByGestor(rows)).toEqual({
      g1: ['a1', 'a2'],
      g2: ['a3'],
    });
  });

  it('ignora filas sin gestor asignado', () => {
    const rows = [
      { activityId: 'a1', gestorId: null },
      { activityId: 'a2', gestorId: 'g1' },
    ];
    expect(groupAsignacionesByGestor(rows)).toEqual({ g1: ['a2'] });
  });

  it('retorna objeto vacío cuando no hay filas', () => {
    expect(groupAsignacionesByGestor([])).toEqual({});
  });
});
