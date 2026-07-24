// Catálogo único de tipos de residuo. Antes las opciones y labels estaban
// duplicadas en ~17 archivos; agregar un tipo obligaba a tocarlos todos. Este es
// ahora la fuente de verdad: los formularios (crear/editar residuo) toman las
// opciones de acá y las vistas resuelven el label con getTipoResiduoLabel.

export interface TipoResiduo {
  value: string;
  label: string;
  color: string;
}

export const RESIDUO_TIPOS: TipoResiduo[] = [
  { value: 'RESIDUOS_ORDINARIOS', label: 'Residuos ordinarios', color: '#3b82f6' },
  { value: 'RESIDUOS_VOLUMINOSOS', label: 'Residuos voluminosos', color: '#f97316' },
  { value: 'ESCOMBROS', label: 'Escombros', color: '#8b5cf6' },
  { value: 'ORGANICOS', label: 'Orgánicos', color: '#16a34a' },
  { value: 'ROPA', label: 'Ropa', color: '#db2777' },
  { value: 'DOMICILIARIOS', label: 'Domiciliarios', color: '#0891b2' },
  { value: 'PAPEL_CARTON', label: 'Papel/Cartón', color: '#ca8a04' },
  { value: 'PLASTICOS', label: 'Plásticos', color: '#dc2626' },
  { value: 'LLANTAS', label: 'Llantas', color: '#334155' },
  { value: 'ELECTRONICOS', label: 'Electrónicos', color: '#7c3aed' },
  { value: 'EXCRETAS', label: 'Excretas', color: '#a16207' },
  { value: 'PLANTAS', label: 'Plantas', color: '#65a30d' },
  { value: 'OTROS', label: 'Otros', color: '#6b7280' },
];

const BY_VALUE: Record<string, TipoResiduo> = Object.fromEntries(
  RESIDUO_TIPOS.map((t) => [t.value, t]),
);

// value (enum) → label legible. Tolera labels ya legibles y desconocidos.
export function getTipoResiduoLabel(value: string | null | undefined): string {
  if (!value) return '';
  return BY_VALUE[value]?.label ?? value;
}

// value (enum) → color de marcador/badge. Gris por defecto.
export function getTipoResiduoColor(value: string | null | undefined): string {
  if (!value) return '#6b7280';
  return BY_VALUE[value]?.color ?? '#6b7280';
}
