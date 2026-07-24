// Catálogo de Ambiental — mapea los subtipos de este repo a los nombres exactos
// de categoría/subcategoría en gov_encuestas_publico. Recortado del catálogo
// original del monolito (que también tenía IVC/Espacio Público/PYBA) porque
// este repo es un módulo independiente, solo Ambiental.

export type SubtipoAmbiental = 'AMBIENTAL' | 'AMBIENTAL_PUNTOS_ACUMULACION';

export interface SubtipoDef {
  enum: SubtipoAmbiental;
  /** Nombre exacto de la subcategoría en gov_encuestas_publico. */
  encuestasName: string;
  aliases?: string[];
}

export const CATEGORIA_ENCUESTAS_NAME = 'AMBIENTAL';

export const SUBTIPOS: SubtipoDef[] = [
  { enum: 'AMBIENTAL', encuestasName: 'Ambiental' },
  {
    enum: 'AMBIENTAL_PUNTOS_ACUMULACION',
    encuestasName: 'Puntos de Acumulación de Residuos',
    aliases: ['Puntos de acumulación'],
  },
];

// Compatibilidad con survey.service.ts: solo hay una categoría en este repo.
export const CATEGORY_MAPPING: Record<string, string> = {
  AMBIENTAL: CATEGORIA_ENCUESTAS_NAME,
};

// enum de subtipo → nombre en encuestas
export const SUBCATEGORY_MAPPING: Record<string, string> = Object.fromEntries(
  SUBTIPOS.map((s) => [s.enum, s.encuestasName]),
);

// nombre display / alias / enum de subtipo → enum de subtipo
export const SUBTYPE_MAPPING: Record<string, SubtipoAmbiental> = Object.fromEntries(
  SUBTIPOS.flatMap((s) => [
    [s.enum, s.enum],
    [s.encuestasName, s.enum],
    ...(s.aliases ?? []).map((alias) => [alias, s.enum]),
  ]),
);

export function resolveSubtipo(operativoSubtipo: string) {
  const technicalSubtipo = SUBTYPE_MAPPING[operativoSubtipo] || (operativoSubtipo as SubtipoAmbiental);
  return {
    technicalSubtipo,
    esPuntosAcumulacion: technicalSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION',
  };
}
