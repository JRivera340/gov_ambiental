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

  // El frontend lo manda (nombre del gestor logueado), pero el backend
  // siempre usa el email del JWT como autoridad — este campo se acepta y se
  // ignora. Sin declararlo acá, el ValidationPipe global (whitelist +
  // forbidNonWhitelisted) rechazaba el request entero con 400 "property
  // recogidoByNombre should not exist", dejando al gestor sin poder
  // confirmar la recolección.
  @IsOptional()
  @IsString()
  recogidoByNombre?: string;

  @IsOptional()
  nuevoResiduo?: Record<string, unknown>;
}
