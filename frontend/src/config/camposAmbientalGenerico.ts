// Formulario fijo del subtipo "Ambiental" genérico (operativo, no punto de
// acumulación). Capturado 2026-07-30 desde la encuesta activa real en
// Postgres-Encuestas (categoría AMBIENTAL, subcategoría "Ambiental", encuesta
// "AMBIENTAL - Ambiental" v1) — ver ESTADO-EXTRACCION.md, hallazgo del
// recorrido visual: este subtipo se había descartado por error como código
// muerto, es alcanzable en el hub igual que "Puntos de Acumulación".
//
// Los campos que este subtipo comparte con el de puntos de acumulación
// (fecha/hora, ubicación, entidad responsable) usan los MISMOS `name` que
// camposPuntoAcumulacion.ts para poder reutilizar el mismo manejo de estado
// y envío en CreateActivity.tsx. Fotos de evidencia, acta PDF, operativo en
// grupo y gestores acompañantes se mapean a columnas ya existentes en
// PuntoResiduo (photos, actaPdfUrl, isGroupOperativo,
// gestoresInvolucradosIds) — no son campos nuevos, ver el DTO del backend.

import { ENTIDADES_RESPONSABLE, type SeccionCampos } from './camposAmbientalShared';

export const SECCIONES_AMBIENTAL_GENERICO: SeccionCampos[] = [
  {
    titulo: '2. Datos del Operativo',
    campos: [
      { name: 'puntosCriticosEmergentesAtendidos', label: 'Puntos de residuos emergentes atendidos', type: 'NUMBER' },
      { name: 'comparendosPedagogicos', label: 'Comparendos pedagógicos', type: 'NUMBER' },
      { name: 'comparendos', label: 'Comparendos', type: 'NUMBER' },
      { name: 'personasSensibilizadas', label: 'Personas sensibilizadas', type: 'NUMBER' },
      { name: 'huertas', label: 'Huertas', type: 'NUMBER' },
      { name: 'kgMaterialResiduosRecolectados', label: 'Kg de material de residuos recolectados', type: 'NUMBER' },
      { name: 'm2RecuperadosEspacioPublico', label: 'M2 recuperados de espacio público', type: 'NUMBER' },
    ],
  },
  {
    titulo: '3. Fecha y Hora',
    campos: [
      { name: 'fecha_operativo', label: 'Fecha y hora del operativo', type: 'DATE', required: true },
    ],
  },
  {
    titulo: '4. Ubicación',
    campos: [
      { name: 'ubicacion_mapa', label: 'Ubicación y Barrio', type: 'LOCATION', required: true },
    ],
  },
  {
    titulo: '5. Descripción',
    campos: [
      { name: 'descripcion_general', label: 'Descripción general', type: 'TEXTAREA', required: true },
    ],
  },
  {
    titulo: '6. Evidencia Fotográfica',
    campos: [
      {
        name: 'fotos_evidencia',
        label: 'Fotos de Evidencia',
        type: 'FILE',
        required: true,
        config: { maxFiles: 5, maxSizeMB: 10 },
      },
    ],
  },
  {
    titulo: '7. Entidades',
    campos: [
      {
        name: 'entidad_responsable',
        label: 'Entidad responsable',
        type: 'SELECT',
        required: true,
        options: ENTIDADES_RESPONSABLE,
      },
    ],
  },
  {
    titulo: '8. Operativo en Grupo',
    campos: [
      { name: 'en_grupo', label: '¿Este operativo fue realizado en grupo con otros gestores?', type: 'CHECKBOX' },
      {
        name: 'gestores_acompanantes',
        label: 'Gestores acompañantes',
        type: 'ENTITY_SELECT',
        config: { entityType: 'GESTORES', multiple: true },
        visibleIf: { name: 'en_grupo', value: 'true' },
      },
    ],
  },
  {
    titulo: '9. Acta del Operativo',
    campos: [
      {
        name: 'acta_pdf',
        label: 'Acta del Operativo (PDF)',
        type: 'FILE',
        required: true,
        config: { accept: 'application/pdf', minPages: 3, maxSizeMB: 10 },
      },
    ],
  },
];
