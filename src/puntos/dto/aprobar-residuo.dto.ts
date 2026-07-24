import { IsArray } from 'class-validator';

export class AprobarResiduoDto {
  @IsArray()
  residuos!: unknown[];
}
