import { describe, it, expect } from 'vitest';
import { getActiveNavKey, AMBIENTAL_NAV_ITEMS, AMBIENTAL_SECONDARY_ACTIONS } from './navConfig';

describe('getActiveNavKey', () => {
  it('mapea general-map a mapa', () => {
    expect(getActiveNavKey('general-map', 'mapa')).toBe('mapa');
  });

  it('mapea las 5 variantes de ruta/historial a ruta', () => {
    const rutaViewModes = [
      'planificador-ruta',
      'ruta-activa',
      'ruta-segmento',
      'historial-rutas',
      'historial-ruta-detalle',
    ] as const;
    for (const vm of rutaViewModes) {
      expect(getActiveNavKey(vm, 'mapa')).toBe('ruta');
    }
  });

  it('mapea perfil a perfil', () => {
    expect(getActiveNavKey('perfil', 'ruta')).toBe('perfil');
  });

  it('activity-detail preserva el NavKey anterior', () => {
    expect(getActiveNavKey('activity-detail', 'puntos')).toBe('puntos');
    expect(getActiveNavKey('activity-detail', 'mapa')).toBe('mapa');
  });

  it('un viewMode desconocido preserva el NavKey anterior', () => {
    expect(getActiveNavKey('historial' as any, 'ruta')).toBe('ruta');
  });
});

describe('AMBIENTAL_NAV_ITEMS', () => {
  it('tiene exactamente 4 destinos primarios con keys únicas', () => {
    expect(AMBIENTAL_NAV_ITEMS).toHaveLength(4);
    const keys = AMBIENTAL_NAV_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(4);
    // "Registrar" vive en la barra principal (es la acción de campo más
    // frecuente) y Perfil pasó al menú de acciones secundarias.
    expect(keys).toEqual(['mapa', 'ruta', 'puntos', 'crear-punto']);
  });
});

describe('AMBIENTAL_SECONDARY_ACTIONS', () => {
  it('tiene las 3 acciones secundarias con keys únicas', () => {
    const keys = AMBIENTAL_SECONDARY_ACTIONS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(['perfil', 'volver-panel', 'logout']);
  });
});
