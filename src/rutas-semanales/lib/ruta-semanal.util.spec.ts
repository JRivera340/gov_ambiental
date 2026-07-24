import { limitesSemana, semanaVencida, calcularArrastre } from './ruta-semanal.util';

describe('limitesSemana', () => {
  it('devuelve el lunes 00:00 y domingo 23:59:59.999 hora Bogota que contienen la fecha', () => {
    const { inicioISO, finISO } = limitesSemana(new Date('2026-07-24T15:00:00.000Z')); // viernes
    expect(new Date(inicioISO).toISOString()).toBe('2026-07-20T05:00:00.000Z'); // lunes 00:00 Bogota = 05:00 UTC
    expect(new Date(finISO).toISOString()).toBe('2026-07-27T04:59:59.999Z');
  });
});

describe('semanaVencida', () => {
  it('es true cuando ahora es posterior al fin de semana', () => {
    expect(semanaVencida('2026-07-20T00:00:00.000Z', new Date('2026-07-21T00:00:00.000Z'))).toBe(true);
  });
  it('es false cuando ahora es anterior al fin de semana', () => {
    expect(semanaVencida('2026-07-27T00:00:00.000Z', new Date('2026-07-21T00:00:00.000Z'))).toBe(false);
  });
});

describe('calcularArrastre', () => {
  it('devuelve solo los puntoId de paradas no visitadas', () => {
    const arrastre = calcularArrastre([
      { puntoId: 'a', lat: 0, lng: 0, barrio: 'X', visitado: true },
      { puntoId: 'b', lat: 0, lng: 0, barrio: 'X', visitado: false },
    ]);
    expect(arrastre).toEqual(['b']);
  });
});
