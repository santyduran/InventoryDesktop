
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio.' })
  @MaxLength(80, {
    message: 'El nombre no puede superar los 80 caracteres.',
  })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250, {
    message: 'La descripción no puede superar los 250 caracteres.',
  })
  description?: string;
}
