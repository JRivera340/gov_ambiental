// Tipos y catálogos compartidos entre los dos subtipos de operativo ambiental
// ("Puntos de Acumulación de Residuos" y "Ambiental" genérico) — ver
// ESTADO-EXTRACCION.md, hallazgo del recorrido visual 2026-07-30.

export type CampoTipo =
  | 'RADIO'
  | 'SELECT'
  | 'MULTISELECT'
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'LOCATION'
  | 'FILE'
  | 'ENTITY_SELECT'
  | 'CHECKBOX'
  | 'SUBSECTION_HEADER';

export interface CampoOpcion {
  value: string;
  label: string;
}

export interface VisibleIf {
  name: string;
  value?: string;
  valueIn?: string[];
}

export interface CampoConfig {
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  minPages?: number;
  entityType?: 'GESTORES';
  multiple?: boolean;
}

export interface CampoDef {
  name: string;
  label: string;
  type: CampoTipo;
  required?: boolean;
  placeholder?: string;
  options?: CampoOpcion[];
  visibleIf?: VisibleIf;
  config?: CampoConfig;
}

export interface SeccionCampos {
  titulo: string;
  campos: CampoDef[];
}

// Mismas 20 entidades en ambos subtipos (verificado contra la encuesta viva).
export const ENTIDADES_RESPONSABLE: CampoOpcion[] = [
  { value: 'UAESP', label: 'UAESP' },
  { value: 'Promoambiental', label: 'Promoambiental' },
  { value: 'IVC', label: 'IVC' },
  { value: 'Alcaldía Local de Santa Fé', label: 'Alcaldía Local de Santa Fé' },
  { value: 'Policía Nacional', label: 'Policía Nacional' },
  { value: 'Ejército Nacional', label: 'Ejército Nacional' },
  { value: 'Secretaría de Gobierno', label: 'Secretaría de Gobierno' },
  { value: 'Secretaría de Seguridad', label: 'Secretaría de Seguridad' },
  { value: 'Inspección de Policía', label: 'Inspección de Policía' },
  { value: 'Personería', label: 'Personería' },
  { value: 'Defensoría del Pueblo', label: 'Defensoría del Pueblo' },
  { value: 'ICBF', label: 'ICBF' },
  { value: 'Fiscalía', label: 'Fiscalía' },
  { value: 'Tránsito', label: 'Tránsito' },
  { value: 'Bomberos', label: 'Bomberos' },
  { value: 'Cruz Roja', label: 'Cruz Roja' },
  { value: 'Defensa Civil', label: 'Defensa Civil' },
  { value: 'Integración Social', label: 'Integración Social' },
  { value: 'Policía de Transito', label: 'Policía de Transito' },
  { value: 'Secretaría de Movilidad', label: 'Secretaría de Movilidad' },
];
