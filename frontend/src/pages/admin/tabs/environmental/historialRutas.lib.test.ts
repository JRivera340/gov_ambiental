import { describe, it, expect } from 'vitest';
import { estadoQuincena, cierreQuincena, totalesHistorial, agruparPorMes } from './historialRutas.lib';
import type { QuincenaHistorialDTO } from '../../../../services/ambiental.service';

const ruta = (over: Partial<QuincenaHistorialDTO['rutas'][0]> = {}): QuincenaHistorialDTO['rutas'][0] => ({
  id: 'r1',
  estado: 'cerrada',
  inicioISO: '2026-07-13T05:00:00.000Z',
  finISO: '2026-07-20T04:59:59.999Z',
  cerradaISO: '2026-07-20T04:59:59.999Z',
  ...over,
});

const quincena = (over: Partial<QuincenaHistorialDTO> = {}): QuincenaHistorialDTO => ({
  indice: 67,
  inicioISO: '2026-07-13T05:00:00.000Z',
  finISO: '2026-07-27T04:59:59.999Z',
  etiqueta: 'Quincena del 13 al 26 de julio',
  rutas: [ruta()],
  paradas: [],
  planificados: 3,
  visitados: 2,
  pendientes: 1,
  pct: 67,
  ...over,
});

describe('estadoQuincena', () => {
  it('cerrada cuando ninguna ruta fue cancelada', () => {
    expect(estadoQuincena(quincena())).toBe('cerrada');
  });

  it('cancelada solo si TODAS las rutas lo estan', () => {
    expect(estadoQuincena(quincena({ rutas: [ruta({ estado: 'cancelada' })] }))).toBe('cancelada');
  });

  // Con rutas semanales viejas, una quincena puede tener una cancelada y otra no.
  it('parcial cuando una ruta se cancelo y la otra no', () => {
    const q = quincena({ rutas: [ruta({ id: 'a', estado: 'cancelada' }), ruta({ id: 'b', estado: 'cerrada' })] });
    expect(estadoQuincena(q)).toBe('parcial');
  });

  it('sin_ruta cuando la quincena no tiene rutas', () => {
    expect(estadoQuincena(quincena({ rutas: [] }))).toBe('sin_ruta');
  });
});

describe('cierreQuincena', () => {
  it('toma la fecha de cierre mas tardia de las rutas', () => {
    const q = quincena({
      rutas: [
        ruta({ id: 'a', cerradaISO: '2026-07-20T10:00:00.000Z' }),
        ruta({ id: 'b', cerradaISO: '2026-07-26T18:00:00.000Z' }),
      ],
    });
    expect(cierreQuincena(q)).toBe('2026-07-26T18:00:00.000Z');
  });

  it('cae al fin de la quincena si no hay rutas', () => {
    const q = quincena({ rutas: [] });
    expect(cierreQuincena(q)).toBe(q.finISO);
  });
});

describe('totalesHistorial', () => {
  it('acumula sobre los totales, no promedia porcentajes', () => {
    const quincenas = [
      quincena({ planificados: 3, visitados: 2 }),
      quincena({ indice: 68, planificados: 1, visitados: 1 }),
    ];
    const t = totalesHistorial(quincenas);
    expect(t.quincenas).toBe(2);
    expect(t.planificados).toBe(4);
    expect(t.visitados).toBe(3);
    expect(t.pct).toBe(75);
  });

  it('cuenta las canceladas aparte', () => {
    const quincenas = [
      quincena(),
      quincena({ indice: 68, rutas: [ruta({ estado: 'cancelada' })] }),
    ];
    expect(totalesHistorial(quincenas).canceladas).toBe(1);
  });

  it('historial vacio no rompe', () => {
    expect(totalesHistorial([])).toEqual({
      quincenas: 0, planificados: 0, visitados: 0, pct: 0, canceladas: 0,
    });
  });
});

describe('agruparPorMes', () => {
  // (año*12 + mes)*2 + mitad. Agosto 2026 = (2026*12 + 7)*2 = 48638.
  const AGO_1 = 48638;
  const AGO_2 = 48639;
  const SEP_1 = 48640;

  const q = (indice: number, inicioISO: string, over: Partial<QuincenaHistorialDTO> = {}) =>
    quincena({ indice, inicioISO, planificados: 10, visitados: 5, ...over });

  it('junta las dos quincenas de un mes en una sola entrada', () => {
    const meses = agruparPorMes([
      q(AGO_2, '2026-08-16T05:00:00.000Z'),
      q(AGO_1, '2026-08-01T05:00:00.000Z'),
    ]);
    expect(meses).toHaveLength(1);
    expect(meses[0].quincenas).toHaveLength(2);
    expect(meses[0].planificados).toBe(20);
    expect(meses[0].visitados).toBe(10);
    expect(meses[0].pct).toBe(50);
  });

  it('separa meses distintos y los ordena del mas reciente al mas viejo', () => {
    const meses = agruparPorMes([
      q(SEP_1, '2026-09-01T05:00:00.000Z'),
      q(AGO_1, '2026-08-01T05:00:00.000Z'),
    ]);
    expect(meses.map((m) => m.clave)).toEqual([Math.floor(SEP_1 / 2), Math.floor(AGO_1 / 2)]);
  });

  it('dentro del mes deja la segunda quincena arriba', () => {
    const meses = agruparPorMes([
      q(AGO_1, '2026-08-01T05:00:00.000Z'),
      q(AGO_2, '2026-08-16T05:00:00.000Z'),
    ]);
    expect(meses[0].quincenas.map((x) => x.indice)).toEqual([AGO_2, AGO_1]);
  });

  // La segunda quincena termina a las 00:00 del 1 del mes siguiente: etiquetar
  // el mes con ella daria "Septiembre" para un mes que es agosto.
  it('etiqueta el mes con la quincena mas temprana', () => {
    const meses = agruparPorMes([
      q(AGO_2, '2026-08-16T05:00:00.000Z'),
      q(AGO_1, '2026-08-01T05:00:00.000Z'),
    ]);
    expect(meses[0].inicioISO).toBe('2026-08-01T05:00:00.000Z');
  });

  it('un mes con una sola quincena tambien agrupa', () => {
    const meses = agruparPorMes([q(AGO_2, '2026-08-16T05:00:00.000Z')]);
    expect(meses).toHaveLength(1);
    expect(meses[0].inicioISO).toBe('2026-08-16T05:00:00.000Z');
  });

  it('no divide por cero con un mes sin puntos planificados', () => {
    const meses = agruparPorMes([q(AGO_1, '2026-08-01T05:00:00.000Z', { planificados: 0, visitados: 0 })]);
    expect(meses[0].pct).toBe(0);
  });

  it('historial vacio da lista vacia', () => {
    expect(agruparPorMes([])).toEqual([]);
  });
});
