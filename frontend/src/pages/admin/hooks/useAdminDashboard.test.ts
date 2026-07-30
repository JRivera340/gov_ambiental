import { describe, it, expect, vi } from 'vitest';

vi.mock('leaflet', () => ({ DivIcon: class { constructor(_opts: unknown) {} } }));

import { computeInsights } from './useAdminDashboard';
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
