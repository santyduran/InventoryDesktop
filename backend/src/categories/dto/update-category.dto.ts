
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsOptionalNotNull } from '../../common/validators/is-optional-not-null.js';

export class UpdateCategoryDto {
  @IsOptionalNotNull()
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

  @IsOptionalNotNull()
  @IsBoolean()
  isActive?: boolean;
}
