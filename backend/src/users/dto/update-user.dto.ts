
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsOptionalNotNull } from '../../common/validators/is-optional-not-null.js';

export class UpdateUserDto {
  @IsOptionalNotNull()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptionalNotNull()
  @IsEmail()
  @MaxLength(50)
  username?: string;

  @IsOptionalNotNull()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password?: string;

  @IsOptionalNotNull()
  @IsIn(['ADMIN', 'OPERADOR'])
  role?: 'ADMIN' | 'OPERADOR';

  @IsOptionalNotNull()
  @IsBoolean()
  isActive?: boolean;
}
