import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class BitacoraActorDto {
  // Identificación del actor
  @IsIn(['PERSONA', 'ESTABLECIMIENTO', 'EMPRESA', 'VEHICULO', 'OTRO'])
  tipoActor!: 'PERSONA' | 'ESTABLECIMIENTO' | 'EMPRESA' | 'VEHICULO' | 'OTRO';

  @IsString()
  nombre!: string;

  @IsString()
  cedulaNit!: string;

  @IsOptional()
  @IsString()
  placa?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  // Registro del evento
  @IsString()
  fecha!: string;

  @IsString()
  tipoResiduo!: string;

  @IsIn(['DISPOSICION', 'ABANDONO', 'TRANSPORTE', 'DESCARGUE', 'OTRO'])
  actividadObservada!: string;

  @IsString()
  cantidadAproximada!: string;

  @IsString()
  descripcion!: string;

  // Evidencia
  @IsArray()
  @IsString({ each: true })
  evidenciaTipos!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenciaArchivos?: string[];

  @IsInt()
  @Min(0)
  numeroEvidencias!: number;

  // Seguimiento del actor
  @IsIn(['IDENTIFICADO', 'EN_SEGUIMIENTO', 'REINCIDENTE', 'INTERVENIDO', 'CASO_CERRADO'])
  estado!: 'IDENTIFICADO' | 'EN_SEGUIMIENTO' | 'REINCIDENTE' | 'INTERVENIDO' | 'CASO_CERRADO';
}
