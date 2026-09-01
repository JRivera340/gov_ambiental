import { describe, it, expect } from 'vitest';
import { estadoQuincena, cierreQuincena, totalesHistorial } from './historialRutas.lib';
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
