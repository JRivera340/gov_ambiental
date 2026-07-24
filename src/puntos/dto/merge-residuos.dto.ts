import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class MergeResiduosDto {
  @IsString()
  parentId!: string;

  @IsArray()
  @ArrayMinSize(1)
  childIds!: string[];
}
