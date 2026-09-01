import { limitesQuincena, diaDeQuincena, diasDeQuincena, etiquetaRango } from './ciclo-quincenal.util';

// Medianoche de Bogota es 05:00 UTC.
const B = (iso: string) => new Date(iso);

describe('limitesQuincena', () => {
  it('del 1 al 15 cuando la fecha cae en la primera mitad', () => {
    const q = limitesQuincena(B('2026-08-07T15:00:00.000Z'));
    expect(q.inicioISO).toBe('2026-08-01T05:00:00.000Z');
    expect(q.finISO).toBe('2026-08-16T04:59:59.999Z');
    expect(q.etiqueta).toBe('Quincena del 1 al 15 de agosto');
  });

  it('del 16 al fin de mes cuando la fecha cae en la segunda mitad', () => {
    const q = limitesQuincena(B('2026-08-21T15:00:00.000Z'));
    expect(q.inicioISO).toBe('2026-08-16T05:00:00.000Z');
    expect(q.finISO).toBe('2026-09-01T04:59:59.999Z');
    expect(q.etiqueta).toBe('Quincena del 16 al 31 de agosto');
  });

  it('el dia 15 todavia es de la primera quincena y el 16 ya es de la segunda', () => {
    expect(limitesQuincena(B('2026-08-15T23:00:00.000Z')).etiqueta).toBe('Quincena del 1 al 15 de agosto');
    // 2026-08-16T04:00Z son las 23:00 del 15 en Bogota: sigue siendo la primera.
    expect(limitesQuincena(B('2026-08-16T04:00:00.000Z')).etiqueta).toBe('Quincena del 1 al 15 de agosto');
    // 2026-08-16T05:00Z es medianoche del 16 en Bogota: ya es la segunda.
    expect(limitesQuincena(B('2026-08-16T05:00:00.000Z')).etiqueta).toBe('Quincena del 16 al 31 de agosto');
  });

  it('ninguna quincena cruza de mes', () => {
    const q = limitesQuincena(B('2026-08-31T20:00:00.000Z'));
    const inicio = new Date(new Date(q.inicioISO).getTime() - 5 * 3600000);
    const fin = new Date(new Date(q.finISO).getTime() - 5 * 3600000);
    expect(inicio.getUTCMonth()).toBe(fin.getUTCMonth());
    expect(fin.getUTCDate()).toBe(31);
  });

  it('la segunda quincena se ajusta al largo del mes', () => {
    // Septiembre tiene 30.
    expect(limitesQuincena(B('2026-09-20T15:00:00.000Z')).etiqueta).toBe('Quincena del 16 al 30 de septiembre');
    // Febrero comun tiene 28.
    expect(limitesQuincena(B('2026-02-20T15:00:00.000Z')).etiqueta).toBe('Quincena del 16 al 28 de febrero');
    // Febrero bisiesto tiene 29.
    expect(limitesQuincena(B('2028-02-20T15:00:00.000Z')).etiqueta).toBe('Quincena del 16 al 29 de febrero');
  });

  it('la segunda quincena de diciembre no se pasa al año siguiente', () => {
    const q = limitesQuincena(B('2026-12-20T15:00:00.000Z'));
    expect(q.inicioISO).toBe('2026-12-16T05:00:00.000Z');
    expect(q.finISO).toBe('2027-01-01T04:59:59.999Z');
    expect(q.etiqueta).toBe('Quincena del 16 al 31 de diciembre');
  });

  it('el indice es monotono y consecutivo entre quincenas', () => {
    const primera = limitesQuincena(B('2026-08-07T15:00:00.000Z'));
    const segunda = limitesQuincena(B('2026-08-21T15:00:00.000Z'));
    const siguienteMes = limitesQuincena(B('2026-09-03T15:00:00.000Z'));
    expect(segunda.indice).toBe(primera.indice + 1);
    expect(siguienteMes.indice).toBe(segunda.indice + 1);
  });

  it('el indice cruza bien el cambio de año', () => {
    const diciembre = limitesQuincena(B('2026-12-20T15:00:00.000Z'));
    const enero = limitesQuincena(B('2027-01-05T15:00:00.000Z'));
    expect(enero.indice).toBe(diciembre.indice + 1);
  });

  it('dos fechas de la misma quincena dan el mismo rango', () => {
    const a = limitesQuincena(B('2026-08-16T12:00:00.000Z'));
    const b = limitesQuincena(B('2026-08-30T12:00:00.000Z'));
    expect(b.indice).toBe(a.indice);
    expect(b.inicioISO).toBe(a.inicioISO);
  });
});

describe('diasDeQuincena', () => {
  const dias = (fecha: string) => {
    const q = limitesQuincena(B(fecha));
    return diasDeQuincena(q.inicioISO, q.finISO);
  };

  it('la primera quincena siempre tiene 15 dias', () => {
    expect(dias('2026-02-05T15:00:00.000Z')).toBe(15);
    expect(dias('2026-08-05T15:00:00.000Z')).toBe(15);
  });

  it('la segunda depende del largo del mes', () => {
    expect(dias('2026-08-20T15:00:00.000Z')).toBe(16); // 31 dias
    expect(dias('2026-09-20T15:00:00.000Z')).toBe(15); // 30 dias
    expect(dias('2026-02-20T15:00:00.000Z')).toBe(13); // 28 dias
    expect(dias('2028-02-20T15:00:00.000Z')).toBe(14); // 29 dias
  });

  it('sin fechas da 0', () => {
    expect(diasDeQuincena('', '')).toBe(0);
  });
});

describe('diaDeQuincena', () => {
  const q = limitesQuincena(B('2026-08-07T15:00:00.000Z')); // 1..15 de agosto

  it('el primer dia es 1, no 0', () => {
    expect(diaDeQuincena(q.inicioISO, q.finISO, B('2026-08-01T06:00:00.000Z'))).toBe(1);
  });

  it('cuenta el dia corriente dentro de la quincena', () => {
    expect(diaDeQuincena(q.inicioISO, q.finISO, B('2026-08-10T12:00:00.000Z'))).toBe(10);
  });

  it('no pasa del largo real de la quincena', () => {
    expect(diaDeQuincena(q.inicioISO, q.finISO, B('2026-09-20T12:00:00.000Z'))).toBe(15);
    const segunda = limitesQuincena(B('2026-02-20T15:00:00.000Z')); // 13 dias
    expect(diaDeQuincena(segunda.inicioISO, segunda.finISO, B('2026-06-01T12:00:00.000Z'))).toBe(13);
  });

  it('da 0 antes de que la quincena arranque y sin fechas', () => {
    expect(diaDeQuincena(q.inicioISO, q.finISO, B('2026-07-30T12:00:00.000Z'))).toBe(0);
    expect(diaDeQuincena('', '', new Date())).toBe(0);
  });
});

describe('etiquetaRango', () => {
  it('nunca muestra el formato de semana ISO', () => {
    const q = limitesQuincena(B('2026-08-21T15:00:00.000Z'));
    expect(etiquetaRango(q.inicioISO, q.finISO)).not.toMatch(/W\d/);
  });
});
