/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../lib/ruta', () => ({
  clearRutaActiva: vi.fn(),
  addToHistorial: vi.fn(),
  cancelarRutaAndAddToHistorial: vi.fn(),
  getHistorialRutas: vi.fn(() => []),
  deleteFromHistorial: vi.fn(),
  buildSegmentos: vi.fn(() => [
    { id: 'A', paradas: [{ puntoId: 'x', visitado: false }], estado: 'pendiente' },
  ]),
  getUnvisitedActivityIds: vi.fn(() => new Set<string>()),
}));
vi.mock('../lib/geo', () => ({
  nearestNeighborRoute: vi.fn((_o: any, pts: any[]) => pts),
}));
const candidatoDefault = { puntoId: 'x', lat: 4, lng: -74, barrio: 'B', diasVencido: 0, tiposResiduo: [], visitado: false, diasSinSeguimiento: 0 };
vi.mock('../lib/rutasCiclo', () => ({
  getParadasDeSemana: vi.fn(() => [candidatoDefault]),
}));
vi.mock('../lib/residuos', () => ({
  getResiduos: vi.fn(() => []),
  isPuntoEmergencia: vi.fn(() => false),
}));
vi.mock('../../../services/ambiental.service', () => ({
  ambientalService: {
    getMisPuntos: vi.fn().mockResolvedValue([]),
    getRutaSemanal: vi.fn().mockResolvedValue(null),
    crearRutaSemana: vi.fn().mockResolvedValue({
      id: 'rs1', gestorId: 'u1', semanaInicio: '2026-07-06', semanaFin: '2026-07-12',
      estado: 'en_progreso', paradas: [], segmentos: [], arrastre: [],
    }),
    cancelarRutaSemana: vi.fn().mockResolvedValue({
      id: 'rs1', gestorId: 'u1', semanaInicio: '2026-07-06', semanaFin: '2026-07-12',
      estado: 'cancelada', paradas: [], segmentos: [], arrastre: [],
    }),
    getArrastre: vi.fn().mockResolvedValue([]),
    getPlanCiclo: vi.fn().mockResolvedValue({
      gestorId: 'g1',
      asignados: 1,
      semanas: [
        {
          slot: 0, semanaISO: '2026-W28', inicioISO: '2026-07-06T05:00:00.000Z',
          finISO: '2026-07-13T04:59:59.999Z', etiqueta: 'Semana del 6 al 12 de julio',
          ventanaDesdeISO: '2026-07-06T05:00:00.000Z', esActual: true,
          emergencia: [], regular: ['x'], planificados: ['x'], visitados: [],
        },
        {
          slot: 1, semanaISO: '2026-W29', inicioISO: '2026-07-13T05:00:00.000Z',
          finISO: '2026-07-20T04:59:59.999Z', etiqueta: 'Semana del 13 al 19 de julio',
          ventanaDesdeISO: '2026-07-06T05:00:00.000Z', esActual: false,
          emergencia: [], regular: [], planificados: [], visitados: [],
        },
      ],
    }),
  },
}));

import * as ruta from '../lib/ruta';
import { useRutaAmbiental } from './useRutaAmbiental';
import { ambientalService } from '../../../services/ambiental.service';
import { waitFor } from '@testing-library/react';

const user = { id: 'g1', name: 'Ana', lastname: 'P' };

// La ruta activa ya no sale de localStorage: se deriva de la fila de la
// semana que devuelve el backend, y se rehidrata contra los puntos actuales.
const setup = (dtoInicial: any = null) => {
  if (dtoInicial) vi.mocked(ambientalService.getRutaSemanal).mockResolvedValueOnce(dtoInicial);
  const setViewMode = vi.fn();
  const { result } = renderHook(() => useRutaAmbiental([] as any, user, setViewMode));
  return { result, setViewMode };
};

const dtoConParada = (overrides: any = {}) => ({
  id: 'r1', gestorId: 'g1', semanaInicio: '2026-07-06', semanaFin: '2026-07-12',
  estado: 'en_progreso',
  paradas: [{ puntoId: 'x', lat: 4, lng: -74, barrio: 'B', visitado: false }],
  segmentos: [], arrastre: [],
  ...overrides,
});

describe('useRutaAmbiental', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ruta.getHistorialRutas as any).mockReturnValue([]);
    (ruta.buildSegmentos as any).mockReturnValue([
      { id: 'A', paradas: [{ puntoId: 'x', visitado: false }], estado: 'pendiente' },
    ]);
  });

  it('iniciarPlanificacion cambia la vista al planificador', () => {
    const { result, setViewMode } = setup();
    act(() => result.current.iniciarPlanificacion());
    expect(setViewMode).toHaveBeenCalledWith('planificador-ruta');
  });

  it('calcularRuta arma la ruta, la guarda y activa la vista', async () => {
    const { result, setViewMode } = setup();
    // La ruta se arma sobre la semana del ciclo, asi que hay que esperar a que
    // el plan llegue del backend antes de calcular.
    await waitFor(() => { expect(result.current.plan).not.toBeNull(); });
    await act(async () => { await result.current.calcularRuta(0); });
    expect(ruta.buildSegmentos).toHaveBeenCalled();
    expect(result.current.rutaActiva?.estado).toBe('en_progreso');
    expect(setViewMode).toHaveBeenCalledWith('ruta-activa');
  });

  it('finalizarRuta archiva, limpia y va al historial', async () => {
    const { result, setViewMode } = setup(dtoConParada());
    await waitFor(() => { expect(result.current.rutaActiva).not.toBeNull(); });
    act(() => result.current.finalizarRuta());
    expect(ruta.addToHistorial).toHaveBeenCalledWith(expect.objectContaining({ estado: 'finalizada' }));
    expect(ruta.clearRutaActiva).toHaveBeenCalledWith('g1');
    expect(result.current.rutaActiva).toBeNull();
    expect(setViewMode).toHaveBeenCalledWith('historial-rutas');
  });

  it('cancelarRuta sincroniza con el backend, usa el helper de cancelación y limpia', async () => {
    const { result, setViewMode } = setup(dtoConParada());
    await waitFor(() => { expect(result.current.rutaActiva).not.toBeNull(); });
    await act(async () => { await result.current.cancelarRuta(); });
    expect(ruta.cancelarRutaAndAddToHistorial).toHaveBeenCalled();
    expect(ruta.clearRutaActiva).toHaveBeenCalledWith('g1');
    expect(result.current.rutaActiva).toBeNull();
    expect(setViewMode).toHaveBeenCalledWith('historial-rutas');
  });

  it('cancelarRuta no toca el historial local si el backend falla', async () => {
    const { result } = setup();
    await waitFor(() => { expect(result.current.plan).not.toBeNull(); });
    await act(async () => { await result.current.calcularRuta(0); });
    expect(result.current.rutaSemanalId).toBe('rs1');
    vi.mocked(ambientalService.cancelarRutaSemana).mockRejectedValueOnce(new Error('fail'));

    await act(async () => { await result.current.cancelarRuta(); });

    expect(ruta.cancelarRutaAndAddToHistorial).not.toHaveBeenCalled();
    expect(result.current.rutaActiva).not.toBeNull();
  });

  it('eliminarRutaHistorial borra del historial y recarga', () => {
    const { result } = setup();
    act(() => result.current.eliminarRutaHistorial('r1'));
    expect(ruta.deleteFromHistorial).toHaveBeenCalledWith('g1', 'r1');
    expect(ruta.getHistorialRutas).toHaveBeenCalled();
  });

  it('hidrata la ruta activa desde el backend al montar', async () => {
    vi.mocked(ambientalService.getRutaSemanal).mockResolvedValueOnce({
      id: 'rs-hidratada', gestorId: 'g1', semanaInicio: '2026-07-06', semanaFin: '2026-07-12',
      estado: 'en_progreso',
      paradas: [{ puntoId: 'x', lat: 4, lng: -74, barrio: 'B', visitado: false }],
      segmentos: [], arrastre: [],
    });
    const { result } = setup();
    await waitFor(() => {
      expect(result.current.rutaSemanalId).toBe('rs-hidratada');
    });
    expect(result.current.rutaActiva).not.toBeNull();
  });

  it('una ruta cancelada en el backend no vuelve a mostrarse como activa', async () => {
    vi.mocked(ambientalService.getRutaSemanal).mockResolvedValueOnce({
      id: 'rs-cancelada', gestorId: 'g1', semanaInicio: '2026-07-06', semanaFin: '2026-07-12',
      estado: 'cancelada',
      paradas: [{ puntoId: 'x', lat: 4, lng: -74, barrio: 'B', visitado: false }],
      segmentos: [], arrastre: [],
    });
    const { result } = setup();
    await waitFor(() => {
      expect(result.current.rutaSemanalId).toBe('rs-cancelada');
    });
    expect(result.current.rutaActiva).toBeNull();
    expect(ruta.cancelarRutaAndAddToHistorial).toHaveBeenCalled();
  });

  it('reconstruye segmentos desde las paradas hidratadas, no desde dto.segmentos congelado', async () => {
    // El backend congela dto.segmentos al crear la ruta; el estado del segmento
    // ahora se deriva siempre de las paradas hidratadas. Si el hook prefiriera
    // dto.segmentos el checkmark quedaría en falso para siempre.
    (ruta.buildSegmentos as any).mockImplementation((paradas: any[]) => [
      { id: 'A', paradas, estado: paradas.every(p => p.visitado) ? 'completado' : 'pendiente' },
    ]);
    vi.mocked(ambientalService.getRutaSemanal).mockResolvedValueOnce({
      id: 'rs-stale-segmentos', gestorId: 'g1', semanaInicio: '2026-07-06', semanaFin: '2026-07-12',
      estado: 'en_progreso',
      paradas: [{ puntoId: 'x', lat: 4, lng: -74, barrio: 'B', visitado: true }],
      segmentos: [{ id: 'A', paradas: [{ puntoId: 'x', visitado: false }], estado: 'pendiente' }],
      arrastre: [],
    });
    const { result } = setup();
    await waitFor(() => {
      expect(result.current.rutaSemanalId).toBe('rs-stale-segmentos');
    });
    const parada = result.current.rutaActiva!.segmentos
      .flatMap(s => s.paradas)
      .find(p => p.puntoId === 'x');
    expect(parada?.visitado).toBe(true);
  });
});
