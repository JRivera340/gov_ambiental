import type { ViewMode } from './constants';

export type NavKey = 'mapa' | 'ruta' | 'puntos' | 'perfil';

export interface NavItem {
  key: NavKey | 'crear-punto';
  label: string;
  icon: 'map' | 'route' | 'pin' | 'user' | 'plus';
  /** Botón siempre verde, no participa del resaltado activo/inactivo normal. */
  highlight?: boolean;
  /** No es un tab con contenido propio — dispara una acción (navegación) y no cambia el tab activo. */
  action?: boolean;
}

export interface SecondaryAction {
  key: 'perfil' | 'volver-panel' | 'logout';
  label: string;
  icon: 'user' | 'home' | 'logout';
  variant?: 'success' | 'danger';
}

// "Registrar Punto" es la acción más frecuente en campo — vive siempre visible
// en la barra principal (resaltada en verde), no escondida en el menú "⋯".
// Perfil, al ser de uso ocasional, pasa al menú de acciones secundarias.
export const AMBIENTAL_NAV_ITEMS: NavItem[] = [
  { key: 'mapa', label: 'Mapa', icon: 'map' },
  { key: 'ruta', label: 'Ruta', icon: 'route' },
  { key: 'puntos', label: 'Puntos', icon: 'pin' },
  { key: 'crear-punto', label: 'Registrar', icon: 'plus', highlight: true, action: true },
];

export const AMBIENTAL_SECONDARY_ACTIONS: SecondaryAction[] = [
  { key: 'perfil', label: 'Perfil', icon: 'user' },
  { key: 'volver-panel', label: 'Volver al panel público', icon: 'home' },
  { key: 'logout', label: 'Cerrar sesión', icon: 'logout', variant: 'danger' },
];

const RUTA_VIEW_MODES = new Set<ViewMode>([
  'planificador-ruta',
  'ruta-activa',
  'ruta-segmento',
  'historial-rutas',
  'historial-ruta-detalle',
]);

export function getActiveNavKey(viewMode: ViewMode, previousNavKey: NavKey): NavKey {
  if (viewMode === 'general-map') return 'mapa';
  if (viewMode === 'perfil') return 'perfil';
  if (RUTA_VIEW_MODES.has(viewMode)) return 'ruta';
  return previousNavKey;
}
