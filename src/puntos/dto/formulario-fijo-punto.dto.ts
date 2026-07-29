import { IsArray, IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  CamarasPunto,
  FrecuenciaAcumulacion,
  IdentificacionGenerador,
  MetodoIdentificacion,
  TipoGenerador,
  TipoSuelo,
  TipoZona,
} from '../entities/punto-residuo.entity';

// Campos del formulario fijo de "Identificación de Puntos de Acumulación de
// Residuos" (ver ESTADO-EXTRACCION.md). Clase base compartida por
// CreatePuntoDto y UpdatePuntoDto para no duplicar las 26 validaciones.
export class FormularioFijoPuntoDto {
  @IsOptional()
  @IsEnum(FrecuenciaAcumulacion)
  frecuenciaAcumulacion?: FrecuenciaAcumulacion;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  entornoEscolar?: boolean;

  @IsOptional()
  @IsString()
  nombreEntornoEscolar?: string;

  @IsOptional()
  @IsString()
  especificarEntorno?: string;

  @IsOptional()
  @IsEnum(TipoZona)
  tipoZona?: TipoZona;

  @IsOptional()
  @IsEnum(TipoSuelo)
  tipoSuelo?: TipoSuelo;

  @IsOptional()
  @IsArray()
  condicionesZona?: string[];

  @IsOptional()
  @IsBoolean()
  poblacionHabitanteCalle?: boolean;

  @IsOptional()
  @IsArray()
  factoresAcumulacion?: string[];

  @IsOptional()
  @IsEnum(CamarasPunto)
  camarasPunto?: CamarasPunto;

  @IsOptional()
  @IsString()
  operadorAseo?: string;

  @IsOptional()
  @IsBoolean()
  recoleccionPuertaAPuerta?: boolean;

  @IsOptional()
  @IsNumber()
  m2Invasion?: number;

  @IsOptional()
  @IsString()
  actoresIndisciplina?: string;

  @IsOptional()
  @IsString()
  intervencionesPropuestas?: string;

  @IsOptional()
  @IsEnum(IdentificacionGenerador)
  identificacionGenerador?: IdentificacionGenerador;

  @IsOptional()
  @IsEnum(TipoGenerador)
  tipoGenerador?: TipoGenerador;

  /** DATO PERSONAL — ver ESTADO-EXTRACCION.md, sección de datos sensibles. */
  @IsOptional()
  @IsString()
  nombreResponsable?: string;

  /** DATO PERSONAL — ver ESTADO-EXTRACCION.md, sección de datos sensibles. */
  @IsOptional()
  @IsString()
  direccionResponsable?: string;

  @IsOptional()
  @IsBoolean()
  observoDisposicion?: boolean;

  @IsOptional()
  @IsISO8601()
  fechaObservacion?: string;

  @IsOptional()
  @IsEnum(MetodoIdentificacion)
  metodoIdentificacion?: MetodoIdentificacion;

  @IsOptional()
  @IsArray()
  actoresEstrategicos?: string[];

  /** DATO PERSONAL — ver ESTADO-EXTRACCION.md, sección de datos sensibles. */
  @IsOptional()
  @IsString()
  telefonoActor?: string;

  @IsOptional()
  @IsArray()
  intervencionesRecomendadas?: string[];
}
