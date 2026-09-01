import { describe, it, expect } from 'vitest';
import { formatRango, formatRangoQuincena } from './rangoLabel';

// Lunes 17 de agosto 2026 00:00 Bogotá → domingo 23 de agosto 23:59:59.999
const LUNES = '2026-08-17T05:00:00.000Z';
const DOMINGO = '2026-08-24T04:59:59.999Z';
// Quincena del 10 al 23 de agosto (14 días desde el lunes 10).
const Q_INICIO = '2026-08-10T05:00:00.000Z';
const Q_FIN = '2026-08-24T04:59:59.999Z';

describe('formatRango', () => {
  it('usa un solo mes cuando no lo cruza', () => {
    expect(formatRango(LUNES, DOMINGO)).toBe('17 al 23 de agosto');
  });

  it('nombra los dos meses cuando los cruza', () => {
    expect(formatRango('2026-08-31T05:00:00.000Z', '2026-09-07T04:59:59.999Z'))
      .toBe('31 de agosto al 6 de septiembre');
  });

  it('agrega el año cuando cruza de año', () => {
    expect(formatRango('2026-12-28T05:00:00.000Z', '2027-01-04T04:59:59.999Z'))
      .toBe('28 de diciembre de 2026 al 3 de enero de 2027');
  });
});

describe('formatRangoQuincena', () => {
  it('coincide con el formato que arma el backend', () => {
    expect(formatRangoQuincena(Q_INICIO, Q_FIN)).toBe('Quincena del 10 al 23 de agosto');
  });

  it('nunca usa el formato de semana ISO', () => {
    expect(formatRangoQuincena(Q_INICIO, Q_FIN)).not.toMatch(/W\d/);
  });

  it('devuelve vacio si falta alguna fecha', () => {
    expect(formatRangoQuincena('', '')).toBe('');
  });
});
