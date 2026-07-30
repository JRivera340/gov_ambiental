/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('leaflet', () => ({ DivIcon: class { constructor(_opts: unknown) {} } }));

const mockActivities: any[] = [];
vi.mock('../../../services/activity.service', () => ({
  activityService: { getAll: vi.fn(() => Promise.resolve(mockActivities)) },
}));
vi.mock('../../../services/catalog.service', () => ({
  catalogService: { getBarrios: vi.fn(() => Promise.resolve(['La Candelaria', 'Las Cruces'])) },
}));

import { computeInsights, useAdminDashboard } from './useAdminDashboard';
import type { Activity } from '../../../types';

function makeActivity(overrides: Partial<Activity> & { status: Activity['status'] }): Activity {
  return {
    id: 'id-' + Math.random(),
    createdByUserId: 'u1',
    dateTime: '2026-07-01T00:00:00.000Z',
    activityType: 'AMBIENTAL',
    lat: 4.6,
    lng: -74.08,
    barrio: 'La Candelaria',
    photos: [],
    results: '',
    incautacionLicores: 0,
    incautacionArmasBlancas: 0,
    personasTransladadas: 0,
    personasSensibilizadas: 0,
    entidadResponsable: 'UAESP',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    residuos: [],
    ...overrides,
  } as unknown as Activity;
}

describe('computeInsights — paridad con ambientalInsightsData del hub', () => {
  it('Ident./Recog. cuentan PUNTOS publicados, no entradas de residuo', () => {
    const activities = [
      makeActivity({ status: 'PUBLICADA', residuos: [{ tipoResiduo: 'RESIDUOS_ORDINARIOS', recogido: true }, { tipoResiduo: 'ESCOMBROS', recogido: false }] as any }),
      makeActivity({ status: 'PUBLICADA', residuos: [{ tipoResiduo: 'RESIDUOS_ORDINARIOS', recogido: false }] as any }),
      // no publicado: no debe contar aunque tenga residuos
      makeActivity({ status: 'ENVIADA', residuos: [{ tipoResiduo: 'RESIDUOS_ORDINARIOS', recogido: true }] as any }),
    ];
    const insights = computeInsights(activities);
    expect(insights.totalIdentified).toBe(2); // puntos PUBLICADA, no 3 entradas de residuo
    expect(insights.totalCollected).toBe(1); // solo el primero tiene >=1 residuo recogido
  });

  it('Val cuenta ENVIADA + APROBADA, no solo APROBADA', () => {
    const activities = [
      makeActivity({ status: 'ENVIADA' }),
      makeActivity({ status: 'ENVIADA' }),
      makeActivity({ status: 'APROBADA' }),
      makeActivity({ status: 'PUBLICADA' }),
      makeActivity({ status: 'RECHAZADA' }),
    ];
    const insights = computeInsights(activities);
    expect(insights.totalVal).toBe(3);
    expect(insights.totalRech).toBe(1);
    expect(insights.totalPub).toBe(1);
  });

  it('totalArea suma metros lineales de TODOS los residuos sin importar el estado del punto', () => {
    const activities = [
      makeActivity({ status: 'ENVIADA', residuos: [{ tipoResiduo: 'RESIDUOS_ORDINARIOS', areaLinealMetros: 10 }] as any }),
      makeActivity({ status: 'PUBLICADA', residuos: [{ tipoResiduo: 'RESIDUOS_ORDINARIOS', areaLinealMetros: 5 }] as any }),
    ];
    const insights = computeInsights(activities);
    expect(insights.totalArea.RESIDUOS_ORDINARIOS).toBe(15);
  });
});

describe('useAdminDashboard — filtros globales (Barrio, Desde/Hasta)', () => {
  it('filtra por barrio y por rango de fecha, y clearFilters los resetea', async () => {
    mockActivities.length = 0;
    mockActivities.push(
      makeActivity({ status: 'PUBLICADA', barrio: 'La Candelaria', dateTime: '2026-01-10T00:00:00.000Z' }),
      makeActivity({ status: 'PUBLICADA', barrio: 'Las Cruces', dateTime: '2026-06-15T00:00:00.000Z' }),
    );

    const { result } = renderHook(() => useAdminDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activities).toHaveLength(2);

    act(() => result.current.setBarrioFilter('La Candelaria'));
    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].barrio).toBe('La Candelaria');

    act(() => { result.current.setBarrioFilter(''); result.current.setDesdeFilter('2026-05-01'); });
    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].barrio).toBe('Las Cruces');

    act(() => result.current.clearFilters());
    expect(result.current.activities).toHaveLength(2);
    expect(result.current.barrioFilter).toBe('');
    expect(result.current.desdeFilter).toBe('');
  });

  it('barriosUnicos combina el catálogo con los barrios reales de los puntos', async () => {
    mockActivities.length = 0;
    mockActivities.push(makeActivity({ status: 'PUBLICADA', barrio: 'Barrio Fuera De Catálogo' }));

    const { result } = renderHook(() => useAdminDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.barriosUnicos).toContain('La Candelaria'));
    expect(result.current.barriosUnicos).toContain('Barrio Fuera De Catálogo');
  });
});

describe('useAdminDashboard — sidebar "Lista de Residuos"', () => {
  it('mapaEstadoRecoleccionFilter separa Recogidos de Pendientes', async () => {
    mockActivities.length = 0;
    mockActivities.push(
      makeActivity({ status: 'PUBLICADA', pointNumber: 1, residuos: [{ tipoResiduo: 'RESIDUOS_ORDINARIOS', recogido: true }] as any }),
      makeActivity({ status: 'PUBLICADA', pointNumber: 2, residuos: [{ tipoResiduo: 'RESIDUOS_ORDINARIOS', recogido: false }] as any }),
    );

    const { result } = renderHook(() => useAdminDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sidebarActivities).toHaveLength(2);

    act(() => result.current.setMapaEstadoRecoleccionFilter('RECOGIDOS'));
    expect(result.current.sidebarActivities.map(a => a.pointNumber)).toEqual([1]);

    act(() => result.current.setMapaEstadoRecoleccionFilter('NO_RECOGIDOS'));
    expect(result.current.sidebarActivities.map(a => a.pointNumber)).toEqual([2]);
  });

  it('busca por # exacto y ordena descendente por pointNumber', async () => {
    mockActivities.length = 0;
    mockActivities.push(
      makeActivity({ status: 'PUBLICADA', pointNumber: 5 }),
      makeActivity({ status: 'PUBLICADA', pointNumber: 12 }),
      makeActivity({ status: 'PUBLICADA', pointNumber: 1 }),
    );

    const { result } = renderHook(() => useAdminDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sidebarActivities.map(a => a.pointNumber)).toEqual([12, 5, 1]);

    act(() => result.current.setListSearchNumber('12'));
    expect(result.current.sidebarActivities.map(a => a.pointNumber)).toEqual([12]);
  });
});
