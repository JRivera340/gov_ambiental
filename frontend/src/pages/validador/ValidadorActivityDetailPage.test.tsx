/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('leaflet', () => ({ DivIcon: class { constructor(_opts: unknown) {} } }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
}));
vi.mock('../../hooks/useFileUrl', () => ({ useFileUrl: (k: string) => (k ? `https://files.test/${k}` : null) }));

const mockActivity = {
  id: 'p1',
  pointNumber: 7,
  status: 'ENVIADA',
  dateTime: '2026-07-01T10:00:00.000Z',
  barrio: 'Las Cruces',
  entidadResponsable: 'UAESP',
  lat: 4.6,
  lng: -74.08,
  createdByUserId: 'u1',
  residuos: [{ id: 'r1', tipoResiduo: 'ESCOMBROS', recogido: false, areaLinealMetros: 2, photos: [] }],
};

vi.mock('../../services/activity.service', () => ({
  activityService: {
    getById: vi.fn(() => Promise.resolve(mockActivity)),
    approve: vi.fn(() => Promise.resolve({ ...mockActivity, status: 'PUBLICADA' })),
    reject: vi.fn(() => Promise.resolve({ ...mockActivity, status: 'RECHAZADA' })),
  },
}));
vi.mock('../../services/users.service', () => ({
  usersService: { getUserById: vi.fn(() => Promise.resolve({ id: 'u1', name: 'Beatriz', lastname: 'Lopez' })) },
}));

import { ValidadorActivityDetailPage } from './ValidadorActivityDetailPage';
import { activityService } from '../../services/activity.service';
import { useAuthStore } from '../../store/authStore';

beforeEach(() => vi.clearAllMocks());
afterEach(() => { cleanup(); useAuthStore.setState({ user: null }); });

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/validador/actividad/p1']}>
      <Routes>
        <Route path="/validador/actividad/:id" element={<ValidadorActivityDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ValidadorActivityDetailPage', () => {
  it('carga el punto en /validador/actividad/:id, con acciones de validacion', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Punto #7')).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/Beatriz Lopez/)).toBeTruthy());
    expect(screen.getByText('Aprobar')).toBeTruthy();
    expect(screen.getByText('Rechazar')).toBeTruthy();
  });

  it('VALIDADOR_AMBIENTAL ve "Actualizar punto" con status ENVIADA, no con PUBLICADA (getActivityPermissions del hub)', async () => {
    useAuthStore.setState({ user: { role: 'VALIDADOR_AMBIENTAL' } as any });
    renderPage();
    await waitFor(() => expect(screen.getByText('Punto #7')).toBeTruthy());
    expect(screen.getByText('Actualizar punto')).toBeTruthy();
  });

  it('VALIDADOR_AMBIENTAL NO ve "Actualizar punto" ni Aprobar/Rechazar con status PUBLICADA', async () => {
    useAuthStore.setState({ user: { role: 'VALIDADOR_AMBIENTAL' } as any });
    vi.mocked(activityService.getById).mockResolvedValueOnce({ ...mockActivity, status: 'PUBLICADA' } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('Punto #7')).toBeTruthy());
    expect(screen.queryByText('Actualizar punto')).toBeNull();
    expect(screen.queryByText('Aprobar')).toBeNull();
  });
});
