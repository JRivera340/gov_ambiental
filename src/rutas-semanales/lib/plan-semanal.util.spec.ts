import { isoWeekOf, isoWeekLabel } from './plan-semanal.util';

// `splitAlternado` e `isoWeekParity` se eliminaron con el ciclo de 2 semanas:
// el reparto ahora es por punto (mitadDePunto) y el índice del ciclo se cuenta
// desde un lunes ancla, porque la paridad de la semana ISO se rompía en los
// años de 53 semanas. Ver ciclo-semanal.util.spec.ts.
describe('plan-semanal.util', () => {
  describe('isoWeekOf / isoWeekLabel', () => {
    it('label tiene formato YYYY-Www', () => {
      const fecha = new Date('2026-08-18T12:00:00Z');
      expect(isoWeekLabel(fecha)).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('fechas dentro de la misma semana Bogota dan la misma semana ISO', () => {
      const lunes = new Date('2026-08-17T06:00:00Z');
      const domingo = new Date('2026-08-23T20:00:00Z');
      expect(isoWeekOf(lunes)).toEqual(isoWeekOf(domingo));
    });

    it('semanas consecutivas dan labels distintos', () => {
      expect(isoWeekLabel(new Date('2026-08-10T12:00:00Z')))
        .not.toBe(isoWeekLabel(new Date('2026-08-17T12:00:00Z')));
    });
  });
});
