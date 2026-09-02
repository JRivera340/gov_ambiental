/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../lib/ruta', () => ({
  clearRutaActiva: vi.fn(),
  buildSegmentos: vi.fn(() => [
    { id: 'A', paradas: [{ puntoId: 'x', visitado: false }], estado: 'pendiente' },
  ]),
  getUnvisitedActivityIds: vi.fn(() => new Set<string>()),
}));
vi.mock('../lib/geo', () => ({
  nearestNeighborRoute: vi.fn((_o: any, pts: any[]) => pts),
}));
const candidatoDefault = { puntoId: 'x', lat: 4, lng: -74, barrio: 'B', diasVencido: 0, tiposResiduo: [], visitado: false, diasSinSeguimiento: 0 };
vi.mock('../lib/rutasQuincena', () => ({
  getParadasDeQuincena: vi.fn(() => [candidatoDefault]),
}));
vi.mock('../lib/residuos', () => ({
  getResiduos: vi.fn(() => []),
  isPuntoEmergencia: vi.fn(() => false),
}));
vi.mock('../../../services/ambiental.service', () => ({
  ambientalService: {
    getMisPuntos: vi.fn().mockResolvedValue([]),
    getRutaQuincena: vi.fn().mockResolvedValue(null),
    crearRutaQuincena: vi.fn().mockResolvedValue({
      id: 'rs1', gestorId: 'u1', semanaInicio: '2026-07-06', semanaFin: '2026-07-20',
      estado: 'en_progreso', paradas: [], segmentos: [], arrastre: [],
    }),
    cancelarRutaQuincena: vi.fn().mockResolvedValue({
      id: 'rs1', gestorId: 'u1', semanaInicio: '2026-07-06', semanaFin: '2026-07-20',
      estado: 'cancelada', paradas: [], segmentos: [], arrastre: [],
    }),
    getArrastre: vi.fn().mockResolvedValue([]),
    getHistorialRutas: vi.fn().mockResolvedValue([]),
    getPlanQuincena: vi.fn().mockResolvedValue({
      gestorId: 'g1',
      asignados: 1,
      quincena: {
        indice: 65,
        inicioISO: '2026-07-06T05:00:00.000Z',
        finISO: '2026-07-20T04:59:59.999Z',
        etiqueta: 'Quincena del 6 al 19 de julio',
        emergencia: [], regular: ['x'], planificados: ['x'], visitados: [],
      },
    }),
  },
}));

import * as ruta from '../lib/ruta';
import { useRutaAmbiental } from './useRutaAmbiental';
import { ambientalService } from '../../../services/ambiental.service';
import { waitFor } from '@testing-library/react';

const user = { id: 'g1', name: 'Ana', lastname: 'P' };

// La ruta activa ya no sale de localStorage: se deriva de la fila de la
// quincena que devuelve el backend, y se rehidrata contra los puntos actuales.
const setup = (dtoInicial: any = null) => {
  if (dtoInicial) vi.mocked(ambientalService.getRutaQuincena).mockResolvedValueOnce(dtoInicial);
  const setViewMode = vi.fn();
  const { result } = renderHook(() => useRutaAmbiental([] as any, user, setViewMode));
  return { result, setViewMode };
};

const dtoConParada = (overrides: any = {}) => ({
  id: 'r1', gestorId: 'g1', semanaInicio: '2026-07-06', semanaFin: '2026-07-20',
  estado: 'en_progreso',
  paradas: [{ puntoId: 'x', lat: 4, lng: -74, barrio: 'B', visitado: false }],
  segmentos: [], arrastre: [],
  ...overrides,
});

describe('useRutaAmbiental', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    await act(async () => { await result.current.calcularRuta(); });
    expect(ruta.buildSegmentos).toHaveBeenCalled();
    expect(result.current.rutaActiva?.estado).toBe('en_progreso');
    expect(setViewMode).toHaveBeenCalledWith('ruta-activa');
  });

  it('finalizarRuta limpia y va al historial', async () => {
    const { result, setViewMode } = setup(dtoConParada());
    await waitFor(() => { expect(result.current.rutaActiva).not.toBeNull(); });
    act(() => result.current.finalizarRuta());
    expect(ruta.clearRutaActiva).toHaveBeenCalledWith('g1');
    expect(result.current.rutaActiva).toBeNull();
    expect(setViewMode).toHaveBeenCalledWith('historial-rutas');
  });

  it('cancelarRuta sincroniza con el backend y limpia', async () => {
    const { result, setViewMode } = setup(dtoConParada());
    await waitFor(() => { expect(result.current.rutaActiva).not.toBeNull(); });
    await act(async () => { await result.current.cancelarRuta(); });
    expect(ambientalService.cancelarRutaQuincena).toHaveBeenCalled();
    expect(ruta.clearRutaActiva).toHaveBeenCalledWith('g1');
    expect(result.current.rutaActiva).toBeNull();
    expect(setViewMode).toHaveBeenCalledWith('historial-rutas');
  });

  it('cancelarRuta no limpia la ruta activa si el backend falla', async () => {
    const { result } = setup();
    await waitFor(() => { expect(result.current.plan).not.toBeNull(); });
    await act(async () => { await result.current.calcularRuta(); });
    expect(result.current.rutaSemanalId).toBe('rs1');
    vi.mocked(ambientalService.cancelarRutaQuincena).mockRejectedValueOnce(new Error('fail'));

    await act(async () => { await result.current.cancelarRuta(); });

    expect(ruta.clearRutaActiva).not.toHaveBeenCalled();
    expect(result.current.rutaActiva).not.toBeNull();
  });

  // El historial ya no se arma en el cliente: sale de GET /visitas/historial,
  // el mismo endpoint que consume el panel del admin. Antes se guardaba en
  // localStorage y se rehidrataba con los visitados de la quincena en curso,
  // así que una quincena vieja podía figurar completada por trabajo hecho
  // despues — y no coincidia con lo que veia el supervisor.
  it('el historial sale del backend, no de localStorage', async () => {
    vi.mocked(ambientalService.getHistorialRutas).mockResolvedValueOnce([
      {
        indice: 48638,
        inicioISO: '2026-08-01T05:00:00.000Z',
        finISO: '2026-08-16T04:59:59.999Z',
        etiqueta: 'Quincena del 1 al 15 de agosto',
        rutas: [{
          id: 'r-ago', estado: 'cerrada',
          inicioISO: '2026-08-01T05:00:00.000Z',
          finISO: '2026-08-16T04:59:59.999Z',
          cerradaISO: '2026-08-16T04:59:59.999Z',
        }],
        paradas: [
          { puntoId: 'p1', lat: 4, lng: -74, barrio: 'B', visitado: true, pointNumber: 1 },
          { puntoId: 'p2', lat: 4, lng: -74, barrio: 'B', visitado: false, pointNumber: 2 },
        ],
        planificados: 2, visitados: 1, pendientes: 1, pct: 50,
      },
    ]);
    const { result } = setup();
    await waitFor(() => { expect(result.current.historialRutas).toHaveLength(1); });

    const [quincena] = result.current.historialRutas;
    expect(quincena.id).toBe('quincena-48638');
    expect(quincena.totalPuntos).toBe(2);
    // El punto no visitado en agosto sigue sin visitar, aunque el gestor lo
    // tenga visitado en la quincena en curso.
    const paradas = quincena.segmentos.flatMap((seg) => seg.paradas);
    expect(paradas.filter((pt) => pt.visitado)).toHaveLength(1);
  });


  it('hidrata la ruta activa desde el backend al montar', async () => {
    vi.mocked(ambientalService.getRutaQuincena).mockResolvedValueOnce({
      id: 'rs-hidratada', gestorId: 'g1', semanaInicio: '2026-07-06', semanaFin: '2026-07-20',
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
    vi.mocked(ambientalService.getRutaQuincena).mockResolvedValueOnce({
      id: 'rs-cancelada', gestorId: 'g1', semanaInicio: '2026-07-06', semanaFin: '2026-07-20',
      estado: 'cancelada',
      paradas: [{ puntoId: 'x', lat: 4, lng: -74, barrio: 'B', visitado: false }],
      segmentos: [], arrastre: [],
    });
    const { result } = setup();
    await waitFor(() => {
      expect(result.current.rutaSemanalId).toBe('rs-cancelada');
    });
    expect(result.current.rutaActiva).toBeNull();
  });

  it('reconstruye segmentos desde las paradas hidratadas, no desde dto.segmentos congelado', async () => {
    // El backend congela dto.segmentos al crear la ruta; el estado del segmento
    // ahora se deriva siempre de las paradas hidratadas. Si el hook prefiriera
    // dto.segmentos el checkmark quedaría en falso para siempre.
    (ruta.buildSegmentos as any).mockImplementation((paradas: any[]) => [
      { id: 'A', paradas, estado: paradas.every(p => p.visitado) ? 'completado' : 'pendiente' },
    ]);
    vi.mocked(ambientalService.getRutaQuincena).mockResolvedValueOnce({
      id: 'rs-stale-segmentos', gestorId: 'g1', semanaInicio: '2026-07-06', semanaFin: '2026-07-20',
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
