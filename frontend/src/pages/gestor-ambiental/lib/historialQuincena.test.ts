import { describe, it, expect } from 'vitest';
import { rutaDesdeQuincena, rutasDesdeHistorial } from './historialQuincena';
import type { QuincenaHistorialDTO } from '../../../services/ambiental.service';

const parada = (puntoId: string, visitado: boolean, pointNumber: number | null = 1) => ({
  puntoId, lat: 4.6, lng: -74.07, barrio: 'SAMPER', visitado, pointNumber,
});

const ruta = (over: Partial<QuincenaHistorialDTO['rutas'][0]> = {}) => ({
  id: 'r1',
  estado: 'cerrada' as const,
  inicioISO: '2026-08-01T05:00:00.000Z',
  finISO: '2026-08-16T04:59:59.999Z',
  cerradaISO: '2026-08-16T04:59:59.999Z',
  ...over,
});

const quincena = (over: Partial<QuincenaHistorialDTO> = {}): QuincenaHistorialDTO => ({
  indice: 48638,
  inicioISO: '2026-08-01T05:00:00.000Z',
  finISO: '2026-08-16T04:59:59.999Z',
  etiqueta: 'Quincena del 1 al 15 de agosto',
  rutas: [ruta()],
  paradas: [parada('p1', true), parada('p2', false)],
  planificados: 2,
  visitados: 1,
  pendientes: 1,
  pct: 50,
  ...over,
});

describe('rutaDesdeQuincena', () => {
  // El bug que motivó el cambio: el historial local rehidrataba las rutas
  // viejas con los visitados de la quincena en curso, así que agosto aparecía
  // completado porque el gestor visitó esos puntos en septiembre.
  it('respeta el visitado que viene del servidor, sin recalcularlo', () => {
    const r = rutaDesdeQuincena(quincena());
    const paradas = r.segmentos.flatMap((s) => s.paradas);
    expect(paradas.find((p) => p.puntoId === 'p1')!.visitado).toBe(true);
    expect(paradas.find((p) => p.puntoId === 'p2')!.visitado).toBe(false);
  });

  it('usa la etiqueta de la quincena como label del bloque', () => {
    expect(rutaDesdeQuincena(quincena()).segmentos[0].label).toBe('Quincena del 1 al 15 de agosto');
  });

  it('marca completado solo cuando no quedan pendientes', () => {
    expect(rutaDesdeQuincena(quincena()).segmentos[0].estado).toBe('pendiente');
    const completa = quincena({
      paradas: [parada('p1', true)], planificados: 1, visitados: 1, pendientes: 0, pct: 100,
    });
    expect(rutaDesdeQuincena(completa).segmentos[0].estado).toBe('completado');
  });

  it('cancelada solo si todas sus rutas lo estan', () => {
    expect(rutaDesdeQuincena(quincena()).estado).toBe('finalizada');
    const cancelada = quincena({ rutas: [ruta({ estado: 'cancelada' })] });
    expect(rutaDesdeQuincena(cancelada).estado).toBe('cancelada');
    // Una cancelada y otra no: la quincena igual se trabajó.
    const parcial = quincena({ rutas: [ruta({ id: 'a', estado: 'cancelada' }), ruta({ id: 'b' })] });
    expect(rutaDesdeQuincena(parcial).estado).toBe('finalizada');
  });

  it('toma la fecha de cierre mas tardia de sus rutas', () => {
    const q = quincena({
      rutas: [
        ruta({ id: 'a', cerradaISO: '2026-08-10T10:00:00.000Z' }),
        ruta({ id: 'b', cerradaISO: '2026-08-15T18:00:00.000Z' }),
      ],
    });
    expect(rutaDesdeQuincena(q).fechaCierre).toBe('2026-08-15T18:00:00.000Z');
  });

  it('sin rutas cae al fin de la quincena', () => {
    const q = quincena({ rutas: [] });
    expect(rutaDesdeQuincena(q).fechaCierre).toBe(q.finISO);
  });

  it('una quincena sin paradas no arma segmentos', () => {
    const q = quincena({ paradas: [], planificados: 0, visitados: 0, pendientes: 0, pct: 0 });
    const r = rutaDesdeQuincena(q);
    expect(r.segmentos).toEqual([]);
    expect(r.totalPuntos).toBe(0);
  });

  it('el id es estable por quincena', () => {
    expect(rutaDesdeQuincena(quincena()).id).toBe('quincena-48638');
  });
});

describe('rutasDesdeHistorial', () => {
  it('mapea toda la lista conservando el orden', () => {
    const rutas = rutasDesdeHistorial([
      quincena({ indice: 48639 }),
      quincena({ indice: 48638 }),
    ]);
    expect(rutas.map((r) => r.id)).toEqual(['quincena-48639', 'quincena-48638']);
  });

  it('lista vacia da lista vacia', () => {
    expect(rutasDesdeHistorial([])).toEqual([]);
  });
});
