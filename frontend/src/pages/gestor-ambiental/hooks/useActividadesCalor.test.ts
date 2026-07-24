/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../services/activity.service', () => ({
  activityService: { addSeguimiento: vi.fn(() => Promise.resolve()) },
}));
vi.mock('../lib/residuos', () => ({
  getResiduos: vi.fn((a: any) => a.__residuos || []),
}));

import { activityService } from '../../../services/activity.service';
import { useActividadesCalor } from './useActividadesCalor';

const acumul = (id: string, residuos: any[]) => ({
  id, operativoSubtipo: 'AMBIENTAL_PUNTOS_ACUMULACION', createdAt: '2026-01-01T00:00:00Z', __residuos: residuos,
});

const baseParams = (over: any = {}) => ({
  activities: [] as any[],
  user: { name: 'Ana', lastname: 'P' } as any,
  setToast: vi.fn(),
  loadActivities: vi.fn(() => Promise.resolve()),
  activeSectorIds: new Set<string>(),
  activitySectorMap: new Map<string, string[]>(),
  collectionDayName: 'LUNES',
  getSectorsCollectedToday: vi.fn(() => [] as any[]),
  ...over,
});

describe('useActividadesCalor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('actividadesEnCalor lista residuos pendientes, oldest first, e ignora recogidos/no-acumulación', () => {
    const activities = [
      acumul('a1', [
        { id: 'r1', recogido: false, dateTime: '2026-02-01T00:00:00Z', tipoResiduo: 'X' },
        { id: 'r2', recogido: true, dateTime: '2026-01-01T00:00:00Z', tipoResiduo: 'X' },
      ]),
      acumul('a2', [{ id: 'r3', recogido: false, dateTime: '2026-01-10T00:00:00Z', tipoResiduo: 'X' }]),
      { id: 'other', operativoSubtipo: 'IVC_PARQUEADEROS', __residuos: [{ id: 'z', recogido: false, dateTime: '2020-01-01T00:00:00Z' }] },
    ];
    const { result } = renderHook(() => useActividadesCalor(baseParams({ activities }) as any));
    const calor = result.current.actividadesEnCalor;
    expect(calor.map(c => c.residuo.id)).toEqual(['r3', 'r1']);
  });

  it('handleAutoMarkOrdinarios sin sectores hoy avisa y no marca', async () => {
    const p = baseParams({ getSectorsCollectedToday: vi.fn(() => []) });
    const { result } = renderHook(() => useActividadesCalor(p as any));
    await act(async () => { await result.current.handleAutoMarkOrdinarios(); });
    expect(activityService.addSeguimiento).not.toHaveBeenCalled();
    expect(p.setToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'info' }));
  });

  it('handleAutoMarkOrdinarios marca ordinarios pendientes del sector y recarga', async () => {
    const activities = [acumul('a1', [
      { id: 'r1', tipoResiduo: 'RESIDUOS_ORDINARIOS', recogido: false, dateTime: '2026-02-01T00:00:00Z' },
      { id: 'r2', tipoResiduo: 'RESIDUOS_ORDINARIOS', recogido: true, dateTime: '2026-02-01T00:00:00Z' },
    ])];
    const p = baseParams({
      activities,
      getSectorsCollectedToday: vi.fn(() => [{ id: 's1' }]),
      activitySectorMap: new Map([['a1', ['s1']]]),
    });
    const { result } = renderHook(() => useActividadesCalor(p as any));
    await act(async () => { await result.current.handleAutoMarkOrdinarios(); });
    expect(activityService.addSeguimiento).toHaveBeenCalledTimes(1);
    expect(activityService.addSeguimiento).toHaveBeenCalledWith('a1', expect.objectContaining({ action: 'MARCAR_RECOGIDO', residuoId: 'r1' }));
    expect(p.setToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    expect(p.loadActivities).toHaveBeenCalled();
  });

  it('handleAutoMarkOrdinarios respeta activeSectorIds (sector no seleccionado = no opera)', async () => {
    const activities = [acumul('a1', [{ id: 'r1', tipoResiduo: 'RESIDUOS_ORDINARIOS', recogido: false, dateTime: '2026-02-01T00:00:00Z' }])];
    const p = baseParams({
      activities,
      getSectorsCollectedToday: vi.fn(() => [{ id: 's1' }]),
      activeSectorIds: new Set(['s2']),
      activitySectorMap: new Map([['a1', ['s1']]]),
    });
    const { result } = renderHook(() => useActividadesCalor(p as any));
    await act(async () => { await result.current.handleAutoMarkOrdinarios(); });
    expect(activityService.addSeguimiento).not.toHaveBeenCalled();
    expect(p.setToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'info' }));
  });
});
