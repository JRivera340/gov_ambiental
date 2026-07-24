/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../lib/ruta', () => ({
  getRutaActiva: vi.fn(() => null),
  saveRutaActiva: vi.fn(),
  clearRutaActiva: vi.fn(),
  addToHistorial: vi.fn(),
  cancelarRutaAndAddToHistorial: vi.fn(),
  getHistorialRutas: vi.fn(() => []),
  deleteFromHistorial: vi.fn(),
  buildSegmentos: vi.fn(() => [
    { id: 'A', paradas: [{ activityId: 'x', visitado: false }], estado: 'pendiente' },
  ]),
  getUnvisitedActivityIds: vi.fn(() => new Set<string>()),
}));
vi.mock('../lib/geo', () => ({
  nearestNeighborRoute: vi.fn((_o: any, pts: any[]) => pts),
}));
const candidatoDefault = { activityId: 'x', lat: 4, lng: -74, barrio: 'B', diasVencido: 0, tiposResiduo: [], visitado: false, diasSinSeguimiento: 0 };
vi.mock('../lib/rutaModos', () => ({
  getPuntosPorModo: vi.fn(() => [candidatoDefault]),
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
  },
}));

import * as ruta from '../lib/ruta';
import { useRutaAmbiental } from './useRutaAmbiental';
import { ambientalService } from '../../../services/ambiental.service';
import { waitFor } from '@testing-library/react';

const user = { id: 'g1', name: 'Ana', lastname: 'P' };

const setup = (initialRuta: any = null) => {
  (ruta.getRutaActiva as any).mockReturnValue(initialRuta);
  const setViewMode = vi.fn();
  const { result } = renderHook(() => useRutaAmbiental([] as any, user, setViewMode));
  return { result, setViewMode };
};

const rutaConParada = () => ({
  id: 'r1', gestorId: 'g1', estado: 'en_progreso',
  segmentos: [{ id: 'A', paradas: [{ activityId: 'x', visitado: false }], estado: 'pendiente' }],
});

describe('useRutaAmbiental', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ruta.getRutaActiva as any).mockReturnValue(null);
    (ruta.getHistorialRutas as any).mockReturnValue([]);
    (ruta.buildSegmentos as any).mockReturnValue([
      { id: 'A', paradas: [{ activityId: 'x', visitado: false }], estado: 'pendiente' },
    ]);
  });

  it('iniciarPlanificacion cambia la vista al planificador', () => {
    const { result, setViewMode } = setup();
    act(() => result.current.iniciarPlanificacion());
    expect(setViewMode).toHaveBeenCalledWith('planificador-ruta');
  });

  it('calcularRuta arma la ruta, la guarda y activa la vista', async () => {
    const { result, setViewMode } = setup();
    await act(async () => { await result.current.calcularRuta('completa'); });
    expect(ruta.buildSegmentos).toHaveBeenCalled();
    expect(ruta.saveRutaActiva).toHaveBeenCalled();
    expect(result.current.rutaActiva?.estado).toBe('en_progreso');
    expect(setViewMode).toHaveBeenCalledWith('ruta-activa');
  });

  it('finalizarRuta archiva, limpia y va al historial', () => {
    const { result, setViewMode } = setup(rutaConParada());
    act(() => result.current.finalizarRuta());
    expect(ruta.addToHistorial).toHaveBeenCalledWith(expect.objectContaining({ estado: 'finalizada' }));
    expect(ruta.clearRutaActiva).toHaveBeenCalledWith('g1');
    expect(result.current.rutaActiva).toBeNull();
    expect(setViewMode).toHaveBeenCalledWith('historial-rutas');
  });

  it('cancelarRuta sincroniza con el backend, usa el helper de cancelación y limpia', async () => {
    const { result, setViewMode } = setup(rutaConParada());
    await act(async () => { await result.current.cancelarRuta(); });
    expect(ruta.cancelarRutaAndAddToHistorial).toHaveBeenCalled();
    expect(ruta.clearRutaActiva).toHaveBeenCalledWith('g1');
    expect(result.current.rutaActiva).toBeNull();
    expect(setViewMode).toHaveBeenCalledWith('historial-rutas');
  });

  it('cancelarRuta no toca el historial local si el backend falla', async () => {
    const { result } = setup();
    await act(async () => { await result.current.calcularRuta('completa'); });
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
      paradas: [{ activityId: 'x', lat: 4, lng: -74, barrio: 'B', visitado: false }],
      segmentos: [], arrastre: [],
    });
    const { result } = setup();
    await waitFor(() => {
      expect(result.current.rutaSemanalId).toBe('rs-hidratada');
    });
    expect(result.current.rutaActiva).not.toBeNull();
  });

  it('mapea el estado cancelada del backend al reconstruir la ruta activa', async () => {
    vi.mocked(ambientalService.getRutaSemanal).mockResolvedValueOnce({
      id: 'rs-cancelada', gestorId: 'g1', semanaInicio: '2026-07-06', semanaFin: '2026-07-12',
      estado: 'cancelada',
      paradas: [{ activityId: 'x', lat: 4, lng: -74, barrio: 'B', visitado: false }],
      segmentos: [], arrastre: [],
    });
    const { result } = setup();
    await waitFor(() => {
      expect(result.current.rutaSemanalId).toBe('rs-cancelada');
    });
    expect(result.current.rutaActiva?.estado).toBe('cancelada');
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
      paradas: [{ activityId: 'x', lat: 4, lng: -74, barrio: 'B', visitado: true }],
      segmentos: [{ id: 'A', paradas: [{ activityId: 'x', visitado: false }], estado: 'pendiente' }],
      arrastre: [],
    });
    const { result } = setup();
    await waitFor(() => {
      expect(result.current.rutaSemanalId).toBe('rs-stale-segmentos');
    });
    const parada = result.current.rutaActiva!.segmentos
      .flatMap(s => s.paradas)
      .find(p => p.activityId === 'x');
    expect(parada?.visitado).toBe(true);
  });
});
