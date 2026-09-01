import { describe, it, expect } from 'vitest';
import { resumirRuta, totalesHistorial } from './historialRutas.lib';
import type { RutaSemanalDTO } from '../../../../services/ambiental.service';

const parada = (puntoId: string, visitado: boolean) => ({
  puntoId, lat: 0, lng: 0, barrio: 'X', visitado,
});

const dto = (over: Partial<RutaSemanalDTO> = {}): RutaSemanalDTO => ({
  id: 'r1',
  gestorId: 'g1',
  semanaInicio: '2026-07-13T05:00:00.000Z',
  semanaFin: '2026-07-27T04:59:59.999Z',
  estado: 'cerrada',
  paradas: [parada('p1', true), parada('p2', true), parada('p3', false)],
  segmentos: [],
  arrastre: ['p3'],
  ...over,
});

describe('resumirRuta', () => {
  it('cuenta visitados y porcentaje sobre las paradas de la ruta', () => {
    const r = resumirRuta(dto());
    expect(r.planificados).toBe(3);
    expect(r.visitados).toBe(2);
    expect(r.pct).toBe(67);
  });

  it('usa el arrastre como pendientes cuando la quincena se cerro sola', () => {
    expect(resumirRuta(dto()).pendientes).toBe(1);
  });

  it('deriva los pendientes de las paradas cuando no hay arrastre (ruta cancelada)', () => {
    const r = resumirRuta(dto({ estado: 'cancelada', arrastre: [] }));
    expect(r.pendientes).toBe(1);
  });

  it('usa updatedAt como fecha de cierre y cae al fin de la quincena si falta', () => {
    expect(resumirRuta(dto({ updatedAt: '2026-07-25T18:00:00.000Z' })).cerradaISO)
      .toBe('2026-07-25T18:00:00.000Z');
    expect(resumirRuta(dto()).cerradaISO).toBe('2026-07-27T04:59:59.999Z');
  });

  it('no divide por cero en una ruta sin paradas', () => {
    const r = resumirRuta(dto({ paradas: [], arrastre: [] }));
    expect(r.pct).toBe(0);
    expect(r.pendientes).toBe(0);
  });
});

describe('totalesHistorial', () => {
  it('acumula sobre todas las quincenas, no promedia porcentajes', () => {
    const rutas = [
      resumirRuta(dto()),
      resumirRuta(dto({ id: 'r2', paradas: [parada('p4', true)], arrastre: [] })),
    ];
    const t = totalesHistorial(rutas);
    expect(t.quincenas).toBe(2);
    expect(t.planificados).toBe(4);
    expect(t.visitados).toBe(3);
    expect(t.pct).toBe(75);
  });

  it('cuenta las canceladas aparte', () => {
    const rutas = [resumirRuta(dto()), resumirRuta(dto({ id: 'r2', estado: 'cancelada' }))];
    expect(totalesHistorial(rutas).canceladas).toBe(1);
  });

  it('historial vacio no rompe', () => {
    expect(totalesHistorial([])).toEqual({
      quincenas: 0, planificados: 0, visitados: 0, pct: 0, canceladas: 0,
    });
  });
});
