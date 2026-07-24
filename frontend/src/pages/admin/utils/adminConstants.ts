// ============================================================
// adminConstants.ts — Constantes compartidas del AdminDashboard
// ============================================================

// Colores institucionales
export const INST_RED = '#DC2626';
export const IVC_BLUE = '#3B82F6';
export const EP_ORANGE = '#F97316';
export const AMB_GREEN = '#10B981';

// Colores por categoría de marcador
export const markerColors: Record<string, string> = {
  IVC: IVC_BLUE,
  ESPACIO_PUBLICO: EP_ORANGE,
  AMBIENTAL: '#7c2d12', // Marrón - Estado Inicial
  DEFAULT: '#6B7280',
};

// Keys técnicos de tipos de residuo
export const technicalResidueKeys = [
  'RESIDUOS_ORDINARIOS',
  'RESIDUOS_VOLUMINOSOS',
  'ESCOMBROS',
  'PLANTAS',
];

// Paleta de colores por tipo de residuo
export const tipoResiduoColors: Record<string, string> = {
  IVC: '#3b82f6',
  ESPACIO_PUBLICO: '#f97316',
  AMBIENTAL: '#10b981',
  RESIDUOS_ORDINARIOS: '#3b82f6',
  'Residuos ordinarios': '#3b82f6',
  Ordinarios: '#3b82f6',
  RESIDUOS_VOLUMINOSOS: '#f97316',
  'Residuos voluminosos': '#f97316',
  Voluminosos: '#f97316',
  ESCOMBROS: '#8b5cf6',
  Escombros: '#8b5cf6',
  PLANTAS: '#10b981',
  Plantas: '#10b981',
  Ambiental: '#10b981',
  DEFAULT: '#6b7280',
};

// Etiquetas legibles para tipos de residuo
export const residuoLabels: Record<string, string> = {
  IVC: 'IVC',
  ESPACIO_PUBLICO: 'Espacio Publico',
  AMBIENTAL: 'Ambiental',
  RESIDUOS_ORDINARIOS: 'Ordinarios',
  'Residuos ordinarios': 'Ordinarios',
  RESIDUOS_VOLUMINOSOS: 'Voluminosos',
  'Residuos voluminosos': 'Voluminosos',
  ESCOMBROS: 'Escombros',
  Escombros: 'Escombros',
  PLANTAS: 'Ambiental',
  Plantas: 'Ambiental',
};

// Mapeo de valores de tipo de residuo a etiquetas legibles (para exportación)
export const tipoResiduoLabels: Record<string, string> = {
  RESIDUOS_ORDINARIOS: 'Residuos ordinarios',
  RESIDUOS_VOLUMINOSOS: 'Residuos voluminosos',
  ESCOMBROS: 'Escombros',
};

// Labels de campos de operativoData para mostrar en UI y exportaciones
export const fieldLabels: Record<string, string> = {
  establecimientosVisitados: 'Establecimientos visitados',
  sellamientos: 'Establecimientos sellados',
  incautaciones: 'Incautaciones',
  licoresAdulterados: 'Licores adulterados incautados',
  armasCortopunzantes: 'Armas cortopunzantes incautadas',
  armasFuegoMunicionTraumaticas: 'Armas de fuego / municion / traumáticas incautadas',
  personasSensibilizadas: 'Personas sensibilizadas',
  menoresEdad: 'Menores de edad',
  kgAproximadoPolvora: 'Kg aproximados de polvora incautados',
  gramosSpa: 'Gramos de SPA incautados',
  personasTrasladadasCtp: 'Personas trasladadas a CTP',
  personasCapturadas: 'Personas capturadas',
  vendedoresInformalesRetirados: 'Vendedores informales retirados',
  vendedoresInformalesIntervenidos: 'Vendedores informales intervenidos',
  vehiculosReceptados: 'Vehiculos receptados',
  estructurasNoConvencionales: 'Estructuras no convencionales intervenidas',
  cambuches: 'Cambuches intervenidos',
  cachivacherosIntervenidos: 'Cachivacheros intervenidos',
  comparendos: 'Comparendos impuestos',
  trasladadosCtp: 'Trasladados a CTP',
  capturados: 'Capturados',
  armasFuego: 'Armas de Fuego Incautadas',
  kgMercanciaIncautada: 'Kg de mercancia incautada',
  pipetasIncautadas: 'Pipetas incautadas',
  bicicletasRecuperadas: 'Bicicletas recuperadas',
  celularesRecuperados: 'Celulares recuperados',
  carretasIncautadas: 'Carretas incautadas',
  mendicidad: 'Personas en situacion de mendicidad identificadas',
  puntosCriticosEmergentesAtendidos: 'Puntos de residuos emergentes atendidos',
  comparendosPedagogicos: 'Comparendos pedagogicos',
  huertas: 'Huertas',
  // Puntos de Acumulacion
  quienDispuso: 'Quien dispuso los residuos?',
  tipoResiduo: 'Que tipo de residuo fue dispuesto?',
  percibeOlores: 'Se perciben olores?',
  percibeVectores: 'Se perciben vectores?',
  areaLinealMetros: 'Area lineal estimada (metros)',
  observaciones: 'Observaciones',
};

// Tipo para las pestañas del dashboard
export type TabType =
  | 'overview'
  | 'gestores'
  | 'actividades'
  | 'mapa'
  | 'usuarios'
  | 'ivc'
  | 'espacio_publico'
  | 'sector_ambiental'
  | 'pyba'
  | 'deportes';

export type GestoresTabType = 'reporte' | 'rechazadas';
