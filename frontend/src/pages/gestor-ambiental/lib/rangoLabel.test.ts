import { describe, it, expect } from 'vitest';
import { formatRango, formatRangoQuincena, formatRangoCorto, formatMes } from './rangoLabel';

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

describe('formatRangoCorto', () => {
  it('resume el rango para captions chicos', () => {
    expect(formatRangoCorto('2026-09-01T05:00:00.000Z', '2026-09-16T04:59:59.999Z')).toBe('1 – 15 sep');
    expect(formatRangoCorto('2026-08-16T05:00:00.000Z', '2026-09-01T04:59:59.999Z')).toBe('16 – 31 ago');
  });

  it('devuelve vacio si falta alguna fecha', () => {
    expect(formatRangoCorto('', '')).toBe('');
  });
});

describe('formatMes', () => {
  it('nombra el mes con su año, capitalizado', () => {
    expect(formatMes('2026-08-16T05:00:00.000Z')).toBe('Agosto 2026');
  });

  // El fin de la segunda quincena cae a las 00:00 del 1 del mes siguiente en
  // UTC; en Bogota sigue siendo el ultimo dia del mes correcto.
  it('usa la hora de Bogota, no UTC', () => {
    expect(formatMes('2026-09-01T05:00:00.000Z')).toBe('Septiembre 2026');
  });

  it('devuelve vacio sin fecha', () => {
    expect(formatMes('')).toBe('');
  });
});
