import { IsArray, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePuntoDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsString()
  barrio!: string;

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
}
