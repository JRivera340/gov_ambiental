import { mitadDePunto, indiceCiclo, semanasDelCiclo, etiquetaRango } from './ciclo-semanal.util';

describe('mitadDePunto', () => {
  it('reparte por paridad del numero de punto', () => {
    expect(mitadDePunto({ id: 'a', pointNumber: 10 })).toBe(0);
    expect(mitadDePunto({ id: 'b', pointNumber: 11 })).toBe(1);
  });

  it('es estable: dar de alta puntos nuevos no cambia la mitad de los existentes', () => {
    const existentes = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, pointNumber: i + 1 }));
    const antes = existentes.map(mitadDePunto);
    // Entra un punto con numero bajo — con el split por corte esto movia a casi todos.
    const conNuevo = [{ id: 'nuevo', pointNumber: 0 }, ...existentes];
    const despues = conNuevo.slice(1).map(mitadDePunto);
    expect(despues).toEqual(antes);
  });

  it('usa un hash estable cuando el punto no tiene numero', () => {
    const sinNumero = { id: 'punto-migrado-sin-numero' };
    expect(mitadDePunto(sinNumero)).toBe(mitadDePunto(sinNumero));
    expect([0, 1]).toContain(mitadDePunto(sinNumero));
  });

  it('reparte de forma razonablemente pareja', () => {
    const puntos = Array.from({ length: 100 }, (_, i) => ({ id: `p${i}`, pointNumber: i + 1 }));
    const enCero = puntos.filter((p) => mitadDePunto(p) === 0).length;
    expect(enCero).toBe(50);
  });
});

describe('indiceCiclo', () => {
  it('alterna de una semana a la siguiente', () => {
    const unLunes = new Date('2026-08-17T12:00:00.000Z');
    const siguiente = new Date('2026-08-24T12:00:00.000Z');
    expect(indiceCiclo(unLunes)).not.toBe(indiceCiclo(siguiente));
  });

  it('no se rompe en el cambio de año (el bug de usar la paridad de la semana ISO)', () => {
    // 2026-W53 existe; con week % 2 daban W53 y W1 la misma paridad.
    const finDeAno = new Date('2026-12-28T12:00:00.000Z');
    const semanaSiguiente = new Date('2027-01-04T12:00:00.000Z');
    expect(indiceCiclo(finDeAno)).not.toBe(indiceCiclo(semanaSiguiente));
  });

  it('es el mismo para cualquier dia de la misma semana', () => {
    const lunes = new Date('2026-08-17T05:30:00.000Z');
    const domingo = new Date('2026-08-23T23:00:00.000Z');
    expect(indiceCiclo(lunes)).toBe(indiceCiclo(domingo));
  });
});

describe('semanasDelCiclo', () => {
  it('devuelve la semana en curso y la siguiente, con slots distintos', () => {
    const [actual, siguiente] = semanasDelCiclo(new Date('2026-08-21T15:00:00.000Z'));
    expect(actual.slot).not.toBe(siguiente.slot);
    expect(new Date(siguiente.inicioISO).getTime()).toBeGreaterThan(new Date(actual.inicioISO).getTime());
  });

  it('ambas ventanas de conteo arrancan el lunes de la semana en curso', () => {
    const [actual, siguiente] = semanasDelCiclo(new Date('2026-08-21T15:00:00.000Z'));
    expect(actual.ventanaDesdeISO).toBe(actual.inicioISO);
    expect(siguiente.ventanaDesdeISO).toBe(actual.inicioISO);
  });

  it('el fin de la semana en curso es justo antes del inicio de la siguiente', () => {
    const [actual, siguiente] = semanasDelCiclo(new Date('2026-08-21T15:00:00.000Z'));
    expect(new Date(actual.finISO).getTime() + 1).toBe(new Date(siguiente.inicioISO).getTime());
  });
});

describe('etiquetaRango', () => {
  it('usa un solo mes cuando la semana no lo cruza', () => {
    const [actual] = semanasDelCiclo(new Date('2026-08-21T15:00:00.000Z'));
    expect(actual.etiqueta).toBe('Semana del 17 al 23 de agosto');
  });

  it('nombra los dos meses cuando la semana los cruza', () => {
    const [actual] = semanasDelCiclo(new Date('2026-09-02T15:00:00.000Z'));
    expect(actual.etiqueta).toBe('Semana del 31 de agosto al 6 de septiembre');
  });

  it('agrega el año cuando la semana cruza de año', () => {
    const [actual] = semanasDelCiclo(new Date('2026-12-31T15:00:00.000Z'));
    expect(actual.etiqueta).toBe('Semana del 28 de diciembre de 2026 al 3 de enero de 2027');
  });

  it('nunca muestra el formato de semana ISO', () => {
    const [actual, siguiente] = semanasDelCiclo(new Date('2026-08-21T15:00:00.000Z'));
    expect(actual.etiqueta).not.toMatch(/W\d/);
    expect(siguiente.etiqueta).not.toMatch(/W\d/);
  });
});
