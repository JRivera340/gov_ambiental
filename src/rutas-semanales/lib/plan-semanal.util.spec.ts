import { splitAlternado, isoWeekOf, isoWeekLabel, isoWeekParity } from './plan-semanal.util';

describe('plan-semanal.util', () => {
  describe('splitAlternado', () => {
    it('corta a la mitad, redondeando hacia arriba la primera mitad', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];
      expect(splitAlternado(items, 0)).toEqual(['a', 'b', 'c']);
      expect(splitAlternado(items, 1)).toEqual(['d', 'e']);
    });

    it('lista vacia da dos mitades vacias', () => {
      expect(splitAlternado([], 0)).toEqual([]);
      expect(splitAlternado([], 1)).toEqual([]);
    });

    it('no se reordena entre llamadas (deterministico)', () => {
      const items = ['1', '2', '3', '4'];
      expect(splitAlternado(items, 0)).toEqual(splitAlternado(items, 0));
    });
  });

  describe('isoWeekOf / isoWeekLabel / isoWeekParity', () => {
    it('semanas consecutivas tienen paridad distinta', () => {
      const semana1 = new Date('2026-08-10T12:00:00Z'); // lunes
      const semana2 = new Date('2026-08-17T12:00:00Z'); // lunes siguiente
      expect(isoWeekParity(semana1)).not.toBe(isoWeekParity(semana2));
    });

    it('label tiene formato YYYY-Www', () => {
      const fecha = new Date('2026-08-18T12:00:00Z');
      expect(isoWeekLabel(fecha)).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('fechas dentro de la misma semana Bogota dan la misma semana ISO', () => {
      const lunes = new Date('2026-08-17T06:00:00Z');
      const domingo = new Date('2026-08-23T20:00:00Z');
      expect(isoWeekOf(lunes)).toEqual(isoWeekOf(domingo));
    });
  });
});
