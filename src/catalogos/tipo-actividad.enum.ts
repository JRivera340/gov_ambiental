// Tipos de actividades/operativos en espacio público
export enum TipoActividad {
  CONTROL_ESPACIO_PUBLICO = 'Control de espacio público',
  INCAUTACION_LICORES = 'Incautación de licores',
  INCAUTACION_ARMAS = 'Incautación de armas',
  LEVANTAMIENTO_CAMBUCHES = 'Levantamiento de cambuches',
  CONTROL_VENDEDORES_AMBULANTES = 'Control vendedores ambulantes',
  INSPECCION_ESTABLECIMIENTOS = 'Inspección de establecimientos',
  OPERATIVO_SEGURIDAD = 'Operativo de seguridad',
  SENSIBILIZACION_CIUDADANA = 'Sensibilización ciudadana',
  ATENCION_EMERGENCIAS = 'Atención de emergencias',
  CONTROL_RUIDO = 'Control de ruido',
  CONTROL_TRANSITO = 'Control de tránsito',
  VERIFICACION_LICENCIAS = 'Verificación de licencias',
  RESTABLECIMIENTO_DERECHOS = 'Restablecimiento de derechos',
  TRASLADO_PERSONAS = 'Traslado de personas',
  LIMPIEZA_ESPACIO_PUBLICO = 'Limpieza de espacio público',
  RECUPERACION_ESPACIO_PUBLICO = 'Recuperación de espacio público',
}

export const TIPOS_ACTIVIDAD = Object.values(TipoActividad);
