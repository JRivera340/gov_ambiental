import { IsArray, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePuntoDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  // Opcional a proposito: el barrio autoritativo lo resuelve el backend desde
  // lat/lng (ver BarriosService). Antes era @IsString() obligatorio, pero la
  // cadena vacia pasaba la validacion y se guardaban puntos sin barrio.
  @IsOptional()
  @IsString()
  barrio?: string;

  @IsOptional()
  @IsISO8601()
  dateTime?: string;

  @IsOptional()
  @IsArray()
  photos?: string[];

  @IsOptional()
  @IsString()
  actaPdfUrl?: string;

  @IsOptional()
  @IsArray()
  residuos?: unknown[];

  @IsOptional()
  @IsString()
  results?: string;

  @IsOptional()
  @IsString()
  entidadResponsable?: string;

  @IsOptional()
  @IsArray()
  entidadesAcompanantes?: string[];

  @IsOptional()
  isGroupOperativo?: boolean;

  @IsOptional()
  @IsArray()
  gestoresInvolucradosIds?: string[];

  @IsOptional()
  @IsString()
  processId?: string;

  // Respuestas de la encuesta dinámica (frecuenciaAcumulacion, tipoZona,
  // camarasPunto, identificacionGenerador, etc — ver punto-residuo.entity.ts).
  // Sin validación de forma: el set de preguntas lo define gov_encuestas_publico,
  // no este backend.
  @IsOptional()
  datosFormulario?: Record<string, unknown>;
}
