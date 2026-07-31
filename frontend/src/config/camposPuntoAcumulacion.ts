// Formulario fijo de "Identificación de Puntos de Acumulación de Residuos".
// Reemplaza al formulario dinámico que antes se traía de gov_encuestas_publico
// (mismos campos, mismas secciones, mismas opciones — capturado el 2026-07-29
// desde la encuesta activa real antes de convertirla a fijo, ver
// ESTADO-EXTRACCION.md). Este módulo se entrega como código fuente y no debe
// depender de otro sistema para poder registrar un punto.
//
// Los 4 campos que ya se capturan por cada residuo individual (tipoResiduo,
// percibeOlores, percibeVectores, areaLinealMetros) NO están acá — viven en el
// sub-formulario de residuo dentro de CreateActivity.tsx.

export type CampoTipo = 'RADIO' | 'SELECT' | 'MULTISELECT' | 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'LOCATION' | 'SUBSECTION_HEADER';

export interface CampoOpcion {
  value: string;
  label: string;
}

export interface VisibleIf {
  name: string;
  value?: string;
  valueIn?: string[];
}

export interface CampoDef {
  name: string;
  label: string;
  type: CampoTipo;
  required?: boolean;
  placeholder?: string;
  options?: CampoOpcion[];
  visibleIf?: VisibleIf;
}

export interface SeccionCampos {
  titulo: string;
  campos: CampoDef[];
}

export const SECCIONES_PUNTO_ACUMULACION: SeccionCampos[] = [
  {
    titulo: '2. Datos del punto',
    campos: [
      {
        name: 'frecuenciaAcumulacion',
        label: 'Frecuencia de acumulación',
        type: 'RADIO',
        options: [
          { value: 'PRIMERA_VEZ', label: 'Primera vez' },
          { value: 'OCASIONAL', label: 'Ocasional' },
          { value: 'FRECUENTE', label: 'Frecuente' },
          { value: 'PERMANENTE', label: 'Permanente' },
        ],
      },
      {
        name: 'observaciones',
        label: 'Observaciones',
        type: 'TEXTAREA',
        placeholder: 'Observaciones adicionales sobre el punto de acumulación...',
      },
      {
        name: 'entornoEscolar',
        label: '¿Es un entorno escolar y/o universitario?',
        type: 'RADIO',
        options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }],
      },
      {
        name: 'nombreEntornoEscolar',
        label: 'Nombre del colegio / universidad',
        type: 'TEXT',
        placeholder: 'Nombre de la institución',
        visibleIf: { name: 'entornoEscolar', value: 'true' },
      },
      {
        name: 'especificarEntorno',
        label: 'Especificar',
        type: 'TEXT',
      },
      {
        name: 'tipoZona',
        label: 'Tipo de zona',
        type: 'RADIO',
        options: [
          { value: 'RESIDENCIAL', label: 'Residencial' },
          { value: 'COMERCIAL', label: 'Comercial' },
          { value: 'INDUSTRIAL', label: 'Industrial' },
          { value: 'MIXTA', label: 'Mixta' },
          { value: 'OTRA', label: 'Otra' },
        ],
      },
      {
        name: 'tipoSuelo',
        label: 'Tipo de suelo',
        type: 'RADIO',
        options: [
          { value: 'ANDEN', label: 'Andén' },
          { value: 'CALLE', label: 'Calle' },
          { value: 'SEPARADOR', label: 'Separador' },
          { value: 'PARQUE', label: 'Parque' },
          { value: 'OTRO', label: 'Otro' },
        ],
      },
      {
        name: 'condicionesZona',
        label: 'Condiciones de la zona',
        type: 'MULTISELECT',
        options: [
          { value: 'MAL_ESTADO_VIA', label: 'Mal estado de la vía' },
          { value: 'DETERIORO_ANDEN', label: 'Deterioro del andén' },
          { value: 'PRESENCIA_CAMBUCHES', label: 'Presencia de cambuches' },
          { value: 'FALTA_ILUMINACION', label: 'Falta de iluminación' },
          { value: 'OTRAS', label: 'Otras' },
        ],
      },
      {
        name: 'poblacionHabitanteCalle',
        label: '¿Hay población habitante de calle?',
        type: 'RADIO',
        options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }],
      },
      {
        name: 'factoresAcumulacion',
        label: 'Factores que propician la acumulación',
        type: 'MULTISELECT',
        options: [
          { value: 'CONTENEDOR_MAL_UBICADO', label: 'Contenedor mal ubicado' },
          { value: 'CONTENEDOR_DANADO', label: 'Contenedor dañado' },
          { value: 'AUSENCIA_CONTENEDOR', label: 'Ausencia de contenedor' },
          { value: 'MAL_USO_CONTENEDOR', label: 'Mal uso del contenedor' },
          { value: 'SIN_ACCESO_RECOLECCION', label: 'Punto sin acceso de recolección' },
          { value: 'INCONVENIENTES_SERVICIO', label: 'Inconvenientes con la prestación del servicio' },
          { value: 'OTROS', label: 'Otros' },
        ],
      },
      {
        name: 'camarasPunto',
        label: '¿Hay cámaras en el punto? (información del C4)',
        type: 'RADIO',
        options: [
          { value: 'NO_HAY', label: 'No hay cámaras' },
          { value: 'FUNCIONAMIENTO', label: 'En funcionamiento' },
          { value: 'MANTENIMIENTO', label: 'En mantenimiento' },
          { value: 'FUERA_DE_SERVICIO', label: 'Fuera de servicio' },
        ],
      },
      {
        name: 'operadorAseo',
        label: 'Operador de aseo',
        type: 'SELECT',
        options: [
          { value: 'UAESP', label: 'UAESP' },
          { value: 'Promoambiental', label: 'Promoambiental' },
          { value: 'Bogotá Limpia', label: 'Bogotá Limpia' },
          { value: 'Otro', label: 'Otro' },
        ],
      },
      {
        name: 'recoleccionPuertaAPuerta',
        label: '¿Hay recolección puerta a puerta?',
        type: 'RADIO',
        options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }],
      },
      {
        name: 'm2Invasion',
        label: 'Metros cuadrados de invasión',
        type: 'NUMBER',
      },
      {
        // Mismo nombre que el campo del sub-formulario de residuo
        // (checklist de ACTORES_INDISCIPLINA), pero es un campo distinto:
        // este es texto libre a nivel del punto general, no del residuo
        // individual. No colisionan porque viven en objetos de estado
        // separados (operativoDataValues vs nuevoResiduoValues).
        name: 'actoresIndisciplina',
        label: 'Actores que generan indisciplina',
        type: 'TEXTAREA',
      },
      {
        name: 'intervencionesPropuestas',
        label: 'Intervenciones propuestas',
        type: 'TEXTAREA',
      },
      // Sub-bloque dentro de "2. Datos del punto" (no es una sección propia
      // en el hub, es un grupo dentro de la misma). Ver "Cadena de evidencia
      // para comparendos" en ESTADO-EXTRACCION.md para por qué estos 7 campos
      // van juntos.
      {
        name: 'identificacionGeneradorHeader',
        label: 'Identificación del presunto generador',
        type: 'SUBSECTION_HEADER',
      },
      {
        name: 'identificacionGenerador',
        label: '¿Se logró identificar quién dispone los residuos?',
        type: 'RADIO',
        required: true,
        options: [
          { value: 'SI', label: 'Sí' },
          { value: 'NO', label: 'No' },
          { value: 'PARCIALMENTE', label: 'Parcialmente' },
        ],
      },
      {
        name: 'tipoGenerador',
        label: 'Tipo de generador',
        type: 'RADIO',
        visibleIf: { name: 'identificacionGenerador', valueIn: ['SI', 'PARCIALMENTE'] },
        options: [
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
        ],
      },
      {
        name: 'nombreResponsable',
        label: 'Nombre del establecimiento o responsable',
        type: 'TEXT',
        visibleIf: { name: 'identificacionGenerador', valueIn: ['SI', 'PARCIALMENTE'] },
      },
      {
        name: 'direccionResponsable',
        label: 'Dirección del establecimiento o responsable',
        type: 'TEXT',
        visibleIf: { name: 'identificacionGenerador', valueIn: ['SI', 'PARCIALMENTE'] },
      },
      {
        name: 'observoDisposicion',
        label: '¿Se observó directamente la disposición de residuos?',
        type: 'RADIO',
        options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }],
      },
      {
        name: 'fechaObservacion',
        label: 'Fecha y hora en que se observó la disposición',
        type: 'DATE',
      },
      {
        name: 'metodoIdentificacion',
        label: '¿Cómo se identificó al presunto responsable?',
        type: 'RADIO',
        options: [
          { value: 'OBSERVACION_DIRECTA', label: 'Observación directa' },
          { value: 'INFO_COMUNIDAD', label: 'Información de la comunidad' },
          { value: 'CAMARAS', label: 'Cámaras de videovigilancia' },
          { value: 'FOTOGRAFIAS', label: 'Fotografías' },
          { value: 'DOCUMENTACION_RESIDUOS', label: 'Documentación encontrada entre los residuos' },
          { value: 'INFO_OPERADOR_ASEO', label: 'Información del operador de aseo' },
          { value: 'OTRO', label: 'Otro' },
        ],
      },
      {
        name: 'actoresEstrategicos',
        label: 'Actores estratégicos (JAC, asociaciones, gremios, otros — nombre y contacto)',
        type: 'MULTISELECT',
        placeholder: 'Ej: JAC Barrio X - Presidente Juan Pérez - 3001234567',
        options: [
          { value: 'JAC', label: 'Junta de Acción Comunal' },
          { value: 'ADMINISTRADOR_SECTOR', label: 'Administrador del sector' },
          { value: 'COMERCIANTE', label: 'Comerciante' },
          { value: 'EMPRESA', label: 'Empresa' },
          { value: 'ALCALDIA_LOCAL', label: 'Alcaldía Local' },
          { value: 'OTRO', label: 'Otro' },
        ],
      },
      {
        name: 'telefonoActor',
        label: 'Teléfono del actor',
        type: 'TEXT',
        placeholder: 'Ej: 3001234567',
      },
      {
        name: 'intervencionesRecomendadas',
        label: 'Intervenciones recomendadas',
        type: 'MULTISELECT',
        options: [
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
        ],
      },
    ],
  },
  {
    titulo: '3. Fecha y Hora',
    campos: [
      { name: 'fecha_operativo', label: 'Fecha y hora del reporte', type: 'DATE', required: true },
    ],
  },
  {
    titulo: '4. Ubicación',
    campos: [
      { name: 'ubicacion_mapa', label: 'Ubicación del punto de acumulación', type: 'LOCATION', required: true },
    ],
  },
  {
    titulo: '5. Entidades',
    campos: [
      {
        name: 'entidad_responsable',
        label: 'Entidad responsable',
        type: 'SELECT',
        required: true,
        options: [
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
        ],
      },
    ],
  },
];
