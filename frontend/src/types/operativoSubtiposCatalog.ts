import type { OperativoSubtipo } from './index';

export interface SubtipoOption {
  value: OperativoSubtipo;
  label: string;
}

export const operativoSubtiposCatalog: SubtipoOption[] = [
  {
    value: 'IVC_ESTABLECIMIENTO_COMERCIO',
    label: 'Establecimientos de Comercio',
  },
  {
    value: 'IVC_PARQUEADEROS',
    label: 'Parqueaderos',
  },
  {
    value: 'IVC_PAGADIARIOS',
    label: 'Pagadiarios',
  },
  {
    value: 'ESPACIO_PUBLICO_1801',
    label: '1801 - Espacio Público',
  },
  {
    value: 'AMBIENTAL',
    label: 'Ambiental',
  },
  {
    value: 'AMBIENTAL_PUNTOS_ACUMULACION',
    label: 'Identificación de Puntos de Acumulación de Residuos',
  },
];
