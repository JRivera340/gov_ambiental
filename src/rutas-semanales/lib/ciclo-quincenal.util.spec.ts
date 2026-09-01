import { limitesQuincena, diaDeQuincena, etiquetaRango, DIAS_QUINCENA } from './ciclo-quincenal.util';

describe('limitesQuincena', () => {
  it('siempre arranca un lunes a las 00:00 de Bogota', () => {
    const q = limitesQuincena(new Date('2026-08-21T15:00:00.000Z'));
    // 00:00 Bogota es 05:00 UTC.
    expect(q.inicioISO.endsWith('T05:00:00.000Z')).toBe(true);
    expect(new Date(q.inicioISO).getUTCDay()).toBe(1);
  });

  it('dura exactamente 14 dias', () => {
    const q = limitesQuincena(new Date('2026-08-21T15:00:00.000Z'));
    const ms = new Date(q.finISO).getTime() - new Date(q.inicioISO).getTime() + 1;
    expect(ms).toBe(DIAS_QUINCENA * 86400000);
  });

  it('las dos semanas de la quincena caen en la misma quincena', () => {
    const primeraSemana = limitesQuincena(new Date('2026-08-12T15:00:00.000Z'));
    const segundaSemana = limitesQuincena(new Date('2026-08-19T15:00:00.000Z'));
    expect(segundaSemana.indice).toBe(primeraSemana.indice);
    expect(segundaSemana.inicioISO).toBe(primeraSemana.inicioISO);
  });

  it('la quincena siguiente empieza justo cuando termina la anterior', () => {
    const actual = limitesQuincena(new Date('2026-08-21T15:00:00.000Z'));
    const siguiente = limitesQuincena(new Date('2026-08-31T15:00:00.000Z'));
    expect(siguiente.indice).toBe(actual.indice + 1);
    expect(new Date(actual.finISO).getTime() + 1).toBe(new Date(siguiente.inicioISO).getTime());
  });

  it('no se rompe en el cambio de año (el bug de derivar el ciclo de la semana ISO)', () => {
    // 2026 tiene 53 semanas: con aritmetica sobre el numero de semana, W53 y W1
    // caian en la misma mitad y una quincena quedaba de 7 dias.
    const finDeAno = limitesQuincena(new Date('2026-12-31T15:00:00.000Z'));
    const enero = limitesQuincena(new Date('2027-01-04T12:00:00.000Z'));
    expect(enero.indice).toBe(finDeAno.indice);
    const ms = new Date(finDeAno.finISO).getTime() - new Date(finDeAno.inicioISO).getTime() + 1;
    expect(ms).toBe(DIAS_QUINCENA * 86400000);
  });
});

describe('etiquetaRango', () => {
  it('usa un solo mes cuando la quincena no lo cruza', () => {
    expect(limitesQuincena(new Date('2026-08-21T15:00:00.000Z')).etiqueta)
      .toBe('Quincena del 10 al 23 de agosto');
  });

  it('nombra los dos meses cuando la quincena los cruza', () => {
    expect(limitesQuincena(new Date('2026-09-02T15:00:00.000Z')).etiqueta)
      .toBe('Quincena del 24 de agosto al 6 de septiembre');
  });

  it('agrega el año cuando la quincena cruza de año', () => {
    expect(limitesQuincena(new Date('2026-12-31T15:00:00.000Z')).etiqueta)
      .toBe('Quincena del 28 de diciembre de 2026 al 10 de enero de 2027');
  });

  it('nunca muestra el formato de semana ISO', () => {
    expect(etiquetaRango('2026-08-10T05:00:00.000Z', '2026-08-24T04:59:59.999Z')).not.toMatch(/W\d/);
  });
});

describe('diaDeQuincena', () => {
  const inicioISO = '2026-08-10T05:00:00.000Z';

  it('el primer dia es 1, no 0', () => {
    expect(diaDeQuincena(inicioISO, new Date('2026-08-10T06:00:00.000Z'))).toBe(1);
  });

  it('el ultimo dia es 14', () => {
    expect(diaDeQuincena(inicioISO, new Date('2026-08-23T23:00:00.000Z'))).toBe(14);
  });

  it('no pasa de 14 aunque la fecha se vaya de la quincena', () => {
    expect(diaDeQuincena(inicioISO, new Date('2026-09-15T12:00:00.000Z'))).toBe(14);
  });

  it('da 0 antes de que la quincena arranque', () => {
    expect(diaDeQuincena(inicioISO, new Date('2026-08-09T12:00:00.000Z'))).toBe(0);
  });

  it('da 0 sin fecha de inicio', () => {
    expect(diaDeQuincena('', new Date())).toBe(0);
  });
});
