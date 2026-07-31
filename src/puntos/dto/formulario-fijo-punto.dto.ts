import { IsArray, IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  CamarasPunto,
  FrecuenciaAcumulacion,
  IdentificacionGenerador,
  MetodoIdentificacion,
  TipoGenerador,
  TipoOperativo,
  TipoSuelo,
  TipoZona,
} from '../entities/punto-residuo.entity';

// Campos del formulario fijo de "Identificación de Puntos de Acumulación de
// Residuos" (ver ESTADO-EXTRACCION.md). Clase base compartida por
// CreatePuntoDto y UpdatePuntoDto para no duplicar las 26 validaciones.
export class FormularioFijoPuntoDto {
  @IsOptional()
  @IsEnum(TipoOperativo)
  tipoOperativo?: TipoOperativo;

  // Contadores del subtipo GENERICO ("Ambiental" en el hub). Los campos que
  // ese subtipo comparte con el punto de acumulación (fecha, ubicación,
  // fotos, descripción, acta, entidad, grupo, gestores) ya están declarados
  // más abajo/en CreatePuntoDto — no se duplican acá.
  @IsOptional()
  @IsNumber()
  puntosCriticosEmergentesAtendidos?: number;

  @IsOptional()
  @IsNumber()
  comparendosPedagogicos?: number;

  @IsOptional()
  @IsNumber()
  comparendos?: number;

  @IsOptional()
  @IsNumber()
  personasSensibilizadas?: number;

  @IsOptional()
  @IsNumber()
  huertas?: number;

  @IsOptional()
  @IsNumber()
  kgMaterialResiduosRecolectados?: number;

  @IsOptional()
  @IsNumber()
  m2RecuperadosEspacioPublico?: number;

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
