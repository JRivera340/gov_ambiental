// Catálogos de opciones de los formularios ambientales (punto de acumulación y
// residuo). Fuente única para las opciones y sus labels legibles.

export interface Opcion {
  value: string;
  label: string;
}

// Pregunta de residuo: actores que generan indisciplina (selección múltiple).
export const ACTORES_INDISCIPLINA: Opcion[] = [
  { value: 'RESIDENTES', label: 'Residentes' },
  { value: 'COMERCIANTES', label: 'Comerciantes' },
  { value: 'HABITANTES_DE_CALLE', label: 'Habitantes de calle' },
  { value: 'RECICLADORES', label: 'Recicladores' },
  { value: 'VOLQUETEROS', label: 'Volqueteros' },
  { value: 'OTROS', label: 'Otros' },
];

export const ACTORES_ESTRATEGICOS: Opcion[] = [
  { value: 'JAC', label: 'Junta de Acción Comunal' },
  { value: 'ADMINISTRADOR_SECTOR', label: 'Administrador del sector' },
  { value: 'COMERCIANTE', label: 'Comerciante' },
  { value: 'EMPRESA', label: 'Empresa' },
  { value: 'ALCALDIA_LOCAL', label: 'Alcaldía Local' },
  { value: 'OTRO', label: 'Otro' },
];

export const TIPO_GENERADOR: Opcion[] = [
  { value: 'COMUNIDAD', label: 'Comunidad' },
  { value: 'VIVIENDA', label: 'Vivienda' },
  { value: 'RESTAURANTE', label: 'Restaurante' },
  { value: 'BAR', label: 'Bar' },
  { value: 'TIENDA', label: 'Tienda' },
  { value: 'SUPERMERCADO', label: 'Supermercado' },
  { value: 'PLAZA_MERCADO', label: 'Plaza de mercado' },
  { value: 'OBRA_CONSTRUCCION', label: 'Obra de construcción' },
  { value: 'EMPRESA', label: 'Empresa' },
  { value: 'TALLER', label: 'Taller' },
  { value: 'HABITANTE_CALLE', label: 'Habitante de calle' },
  { value: 'RECICLADOR', label: 'Reciclador' },
  { value: 'VOLQUETA', label: 'Volqueta' },
  { value: 'OTRO', label: 'Otro' },
];

export const METODO_IDENTIFICACION: Opcion[] = [
  { value: 'OBSERVACION_DIRECTA', label: 'Observación directa' },
  { value: 'INFO_COMUNIDAD', label: 'Información de la comunidad' },
  { value: 'CAMARAS', label: 'Cámaras de videovigilancia' },
  { value: 'FOTOGRAFIAS', label: 'Fotografías' },
  { value: 'DOCUMENTACION_RESIDUOS', label: 'Documentación encontrada entre los residuos' },
  { value: 'INFO_OPERADOR_ASEO', label: 'Información del operador de aseo' },
  { value: 'OTRO', label: 'Otro' },
];

export const FRECUENCIA_ACUMULACION: Opcion[] = [
  { value: 'PRIMERA_VEZ', label: 'Primera vez' },
  { value: 'OCASIONAL', label: 'Ocasional' },
  { value: 'FRECUENTE', label: 'Frecuente' },
  { value: 'PERMANENTE', label: 'Permanente' },
];

export const INTERVENCIONES_RECOMENDADAS: Opcion[] = [
  { value: 'LIMPIEZA_INMEDIATA', label: 'Limpieza inmediata' },
  { value: 'RECOLECCION_ESCOMBROS', label: 'Recolección de escombros' },
  { value: 'INSTALACION_CONTENEDOR', label: 'Instalación de contenedor' },
  { value: 'REUBICACION_CONTENEDOR', label: 'Reubicación de contenedor' },
  { value: 'SENSIBILIZACION', label: 'Sensibilización comunitaria' },
  { value: 'OPERATIVO_POLICIA', label: 'Operativo con Policía' },
  { value: 'COMPARENDO_AMBIENTAL', label: 'Comparendo ambiental' },
  { value: 'SEGUIMIENTO_CAMARAS_C4', label: 'Seguimiento con cámaras del C4' },
  { value: 'CONTROL_ESTABLECIMIENTOS', label: 'Control a establecimientos comerciales' },
  { value: 'CONTROL_OBRAS', label: 'Control a obras de construcción' },
  { value: 'OTRO', label: 'Otro' },
];

function labelResolver(opciones: Opcion[]): (value: string) => string {
  const byValue: Record<string, string> = Object.fromEntries(
    opciones.map((o) => [o.value, o.label]),
  );
  return (value: string) => byValue[value] ?? value;
}

// value(s) → label(s) legibles, tolerando desconocidos.
export const getActorIndisciplinaLabel = labelResolver(ACTORES_INDISCIPLINA);
export const getActorEstrategicoLabel = labelResolver(ACTORES_ESTRATEGICOS);
export const getTipoGeneradorLabel = labelResolver(TIPO_GENERADOR);
export const getMetodoIdentificacionLabel = labelResolver(METODO_IDENTIFICACION);
export const getFrecuenciaAcumulacionLabel = labelResolver(FRECUENCIA_ACUMULACION);
export const getIntervencionLabel = labelResolver(INTERVENCIONES_RECOMENDADAS);

// Une una lista de values en un texto legible con sus labels.
export function joinLabels(values: string[] | null | undefined, resolver: (v: string) => string): string {
  if (!Array.isArray(values) || values.length === 0) return '';
  return values.map(resolver).join(', ');
}
