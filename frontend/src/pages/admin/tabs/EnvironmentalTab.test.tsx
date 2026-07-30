/** @vitest-environment happy-dom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('leaflet', () => ({ DivIcon: class { constructor(_opts: unknown) {} } }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => null,
}));
vi.mock('../../../components/MapLayerControl', () => ({ MapLayerControl: () => null }));
vi.mock('../../../components/BoundaryLayer', () => ({ BoundaryLayer: () => null }));
vi.mock('../../../components/BarriosLayer', () => ({ BarriosLayer: () => null }));
vi.mock('../components/shared/ClickableMarker', () => ({ ClickableMarker: () => null }));
vi.mock('../components/shared/PieChart', () => ({ PieChart: () => null }));
vi.mock('./environmental/AsignacionPuntosPanel', () => ({
  AsignacionPuntosPanel: () => <div>Panel de Asignación</div>,
}));
vi.mock('./environmental/IndicadoresAmbientalPanel', () => ({
  IndicadoresAmbientalPanel: () => <div>Panel de Indicadores</div>,
}));

import { EnvironmentalTab } from './EnvironmentalTab';

const baseProps = {
  filteredMapActivities: [],
  getGlobalActivityIndex: () => undefined,
  layerVisibility: {} as any,
  setLayerVisibility: () => {},
  tipoResiduoFilter: '',
  setTipoResiduoFilter: () => {},
  statusFilter: '',
  setStatusFilter: () => {},
  emergencyFilter: false,
  setEmergencyFilter: () => {},
  listSearchNumber: '',
  setListSearchNumber: () => {},
  setPointsSidebarOpen: () => {},
  ambientalInsightsData: {
    totalIdentified: 0, totalCollected: 0, totalAct: 0, totalPub: 0,
    totalVal: 0, totalRech: 0, avgCollectionTimes: {}, totalArea: {},
  },
  globalSubtipo: '',
  setSelectedActivity: () => {},
  setShowDetailModal: () => {},
};

afterEach(() => cleanup());

describe('EnvironmentalTab — comportamiento de pestañas (divergencia deliberada del hub)', () => {
  it('solo una sección visible a la vez: abrir Indicadores cierra Asignación', () => {
    render(<EnvironmentalTab {...baseProps} />);

    fireEvent.click(screen.getByText('Asignación de Puntos'));
    expect(screen.getByText('Panel de Asignación')).toBeTruthy();
    expect(screen.queryByText('Panel de Indicadores')).toBeNull();

    fireEvent.click(screen.getByText('Indicadores'));
    expect(screen.getByText('Panel de Indicadores')).toBeTruthy();
    expect(screen.queryByText('Panel de Asignación')).toBeNull();
  });

  it('presionar la pestaña activa la cierra (toggle-off)', () => {
    render(<EnvironmentalTab {...baseProps} />);

    fireEvent.click(screen.getByText('Asignación de Puntos'));
    expect(screen.getByText('Panel de Asignación')).toBeTruthy();

    fireEvent.click(screen.getByText('Ocultar Asignación de Puntos'));
    expect(screen.queryByText('Panel de Asignación')).toBeNull();
  });

  it('el boton activo indica visualmente su estado con aria-pressed', () => {
    render(<EnvironmentalTab {...baseProps} />);
    const btn = screen.getByText('Asignación de Puntos');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(btn);
    expect(screen.getByText('Ocultar Asignación de Puntos').getAttribute('aria-pressed')).toBe('true');
  });
});
