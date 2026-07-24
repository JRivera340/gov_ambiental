import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class SeguimientoDto {
  @IsIn(['MARCAR_RECOGIDO', 'AGREGAR_RESIDUO'])
  action!: 'MARCAR_RECOGIDO' | 'AGREGAR_RESIDUO';

  @IsOptional()
  @IsString()
  residuoId?: string;

  @IsOptional()
  @IsString()
  fechaRecogida?: string;

  @IsOptional()
  @IsArray()
  photosRecogida?: string[];

  @IsOptional()
  nuevoResiduo?: Record<string, unknown>;
}
