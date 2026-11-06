
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80, {
    message: 'El nombre no puede superar los 80 caracteres.',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250, {
    message: 'La descripción no puede superar los 250 caracteres.',
  })
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
