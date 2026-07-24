import { IsNumber, IsString } from 'class-validator';

export class CreatePuntoDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsString()
  barrio!: string;
}
