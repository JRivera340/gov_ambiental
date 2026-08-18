import { esResiduoVencido, esPuntoEnEmergencia, UMBRAL_EMERGENCIA_DIAS } from './emergencia.util';
import { PuntoResiduo } from '../entities/punto-residuo.entity';

describe('emergencia.util', () => {
  const ahora = new Date('2026-08-18T12:00:00Z');

  describe('esResiduoVencido', () => {
    it('umbral es 4 dias', () => {
      expect(UMBRAL_EMERGENCIA_DIAS).toBe(4);
    });

    it('false con menos de 4 dias', () => {
      const hace3Dias = new Date('2026-08-15T12:00:00Z').toISOString();
      expect(esResiduoVencido(hace3Dias, ahora)).toBe(false);
    });

    it('true con exactamente 4 dias', () => {
      const hace4Dias = new Date('2026-08-14T12:00:00Z').toISOString();
      expect(esResiduoVencido(hace4Dias, ahora)).toBe(true);
    });

    it('true con mas de 4 dias', () => {
      const hace10Dias = new Date('2026-08-08T12:00:00Z').toISOString();
      expect(esResiduoVencido(hace10Dias, ahora)).toBe(true);
    });
  });

  describe('esPuntoEnEmergencia', () => {
    const basePunto = (): PuntoResiduo => ({ residuos: [], dateTime: ahora } as any);

    it('false sin residuos', () => {
      expect(esPuntoEnEmergencia(basePunto(), ahora)).toBe(false);
    });

    it('false si el unico residuo vencido ya fue recogido', () => {
      const punto = basePunto();
      punto.residuos = [{ dateTime: new Date('2026-08-01T00:00:00Z').toISOString(), recogido: true } as any];
      expect(esPuntoEnEmergencia(punto, ahora)).toBe(false);
    });

    it('true si hay al menos un residuo pendiente vencido', () => {
      const punto = basePunto();
      punto.residuos = [
        { dateTime: new Date('2026-08-17T00:00:00Z').toISOString(), recogido: false } as any,
        { dateTime: new Date('2026-08-01T00:00:00Z').toISOString(), recogido: false } as any,
      ];
      expect(esPuntoEnEmergencia(punto, ahora)).toBe(true);
    });
  });
});
