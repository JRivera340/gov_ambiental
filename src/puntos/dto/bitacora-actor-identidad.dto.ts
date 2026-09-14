import { IsIn, IsOptional, IsString } from 'class-validator';

// Edición de solo la identificación del actor (sin tocar ningún evento) —
// para cuando el admin necesita corregir nombre/cédula/etc sin pasar por el
// formulario completo de un evento puntual.
export class BitacoraActorIdentidadDto {
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

  @IsIn(['IDENTIFICADO', 'EN_SEGUIMIENTO', 'REINCIDENTE', 'INTERVENIDO', 'CASO_CERRADO'])
  estado!: 'IDENTIFICADO' | 'EN_SEGUIMIENTO' | 'REINCIDENTE' | 'INTERVENIDO' | 'CASO_CERRADO';
}
