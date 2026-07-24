// Constantes y tipos compartidos del módulo Gestión Ambiental.
import { RESIDUO_TIPOS } from '../../../types/residuoTipos';

export const PUNTO_CRITICO_COLOR = '#16a34a'; // verde para puntos críticos
export const AMBIENTAL_COLOR = '#2563eb'; // azul para actividades ambientales

export const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Derivado del catálogo único (types/residuoTipos) para no duplicar labels.
export const tipoResiduoLabels: Record<string, string> = Object.fromEntries(
  RESIDUO_TIPOS.map((t) => [t.value, t.label]),
);

export type ViewMode =
  | 'general-map'
  | 'activity-detail'
  | 'historial'
  | 'planificador-ruta'
  | 'ruta-activa'
  | 'ruta-segmento'
  | 'historial-rutas'
  | 'historial-ruta-detalle'
  | 'perfil';
export type SidebarTab = 'puntos-criticos' | 'ambiental' | 'rechazadas';
