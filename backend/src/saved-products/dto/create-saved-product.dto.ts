import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSavedProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;
}
