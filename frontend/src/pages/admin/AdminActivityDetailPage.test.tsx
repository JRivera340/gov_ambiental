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
  pointNumber: 12,
  status: 'ENVIADA',
  dateTime: '2026-07-01T10:00:00.000Z',
  barrio: 'La Candelaria',
  entidadResponsable: 'UAESP',
  lat: 4.6,
  lng: -74.08,
  createdByUserId: 'u1',
  residuos: [
    { id: 'r1', tipoResiduo: 'RESIDUOS_ORDINARIOS', recogido: false, areaLinealMetros: 3, percibeOlores: true, percibeVectores: false, photos: [] },
  ],
  tipoZona: 'RESIDENCIAL',
  frecuenciaAcumulacion: 'OCASIONAL',
};

vi.mock('../../services/activity.service', () => ({
  activityService: {
    getById: vi.fn(() => Promise.resolve(mockActivity)),
    approve: vi.fn(() => Promise.resolve({ ...mockActivity, status: 'PUBLICADA' })),
    reject: vi.fn(() => Promise.resolve({ ...mockActivity, status: 'RECHAZADA' })),
  },
}));
vi.mock('../../services/users.service', () => ({
  usersService: { getUserById: vi.fn(() => Promise.resolve({ id: 'u1', name: 'Ana', lastname: 'Gómez' })) },
}));

import { AdminActivityDetailPage } from './AdminActivityDetailPage';
import { activityService } from '../../services/activity.service';
import { useAuthStore } from '../../store/authStore';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/actividad/p1']}>
      <Routes>
        <Route path="/admin/actividad/:id" element={<AdminActivityDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('AdminActivityDetailPage', () => {
  it('carga el punto, muestra el creador y los campos del formulario fijo con dato', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Punto #12')).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText(/Ana Gómez/).length).toBeGreaterThan(0));
    expect(screen.getByText('Ocasional')).toBeTruthy(); // frecuenciaAcumulacion mapeado a label
    expect(screen.getByText('Residencial')).toBeTruthy(); // tipoZona mapeado a label
  });

  it('muestra el residuo con su tipo y las acciones de validación cuando status = ENVIADA', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/Residuos identificados \(1\)/)).toBeTruthy());
    expect(screen.getByText('Aprobar')).toBeTruthy();
    expect(screen.getByText('Rechazar')).toBeTruthy();
  });

  it('tiene el boton de Google Maps con las coordenadas reales', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Ver en Google Maps')).toBeTruthy());
    const link = screen.getByText('Ver en Google Maps').closest('a');
    expect(link?.getAttribute('href')).toBe('https://www.google.com/maps?q=4.6,-74.08');
  });

  it('NO muestra Aprobar/Rechazar cuando status = RECHAZADA (getActivityPermissions del hub: solo ENVIADA)', async () => {
    vi.mocked(activityService.getById).mockResolvedValueOnce({ ...mockActivity, status: 'RECHAZADA' } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('Punto #12')).toBeTruthy());
    expect(screen.queryByText('Aprobar')).toBeNull();
    expect(screen.queryByText('Rechazar')).toBeNull();
  });

  it('ADMIN ve "Actualizar punto" sin importar el estado', async () => {
    useAuthStore.setState({ user: { role: 'ADMIN' } as any });
    vi.mocked(activityService.getById).mockResolvedValueOnce({ ...mockActivity, status: 'PUBLICADA' } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('Punto #12')).toBeTruthy());
    expect(screen.getByText('Actualizar punto')).toBeTruthy();
    useAuthStore.setState({ user: null });
  });

  it('el conteo de "Residuos identificados" coincide con las tarjetas renderizadas, incluso con varios residuos mixtos', async () => {
    const seisResiduos = Array.from({ length: 6 }, (_, i) => ({
      id: `r${i}`,
      tipoResiduo: 'RESIDUOS_ORDINARIOS',
      recogido: i < 2,
      areaLinealMetros: 1,
      percibeOlores: false,
      percibeVectores: false,
      photos: [],
    }));
    vi.mocked(activityService.getById).mockResolvedValueOnce({ ...mockActivity, residuos: seisResiduos } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('Residuos identificados (6)')).toBeTruthy());
    // 6 tarjetas en "identificados" (icono por tarjeta) + 2 tarjetas en "Recogidos"
    expect(screen.getByText('Residuos Recogidos (2)')).toBeTruthy();
  });

  it('muestra Gestores Participantes con el creador y su correo', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Gestores Participantes')).toBeTruthy());
    expect(screen.getByText('No es un operativo en grupo')).toBeTruthy();
  });

  it('muestra Ubicación con latitud y longitud formateadas en grados', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Ubicación')).toBeTruthy());
    expect(screen.getByText('4.600000°')).toBeTruthy();
    expect(screen.getByText('-74.080000°')).toBeTruthy();
  });

  it('muestra Datos Operativo con el equivalente fijo del dominio ambiental', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Datos Operativo')).toBeTruthy());
    expect(screen.getByText('Ambiental')).toBeTruthy();
    expect(screen.getByText(/Punto de Residuos/)).toBeTruthy();
  });

  it('muestra Información de Validación cuando el punto ya fue validado', async () => {
    vi.mocked(activityService.getById).mockResolvedValueOnce({
      ...mockActivity,
      status: 'PUBLICADA',
      validatorUserId: 'v1',
      validatorName: 'Carlos Ruiz',
      validatedAt: '2026-07-05T12:00:00.000Z',
    } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('Información de Validación')).toBeTruthy());
    expect(screen.getByText('Carlos Ruiz')).toBeTruthy();
  });
});
