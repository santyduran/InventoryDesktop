
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { IsOptionalNotNull } from '../../common/validators/is-optional-not-null.js';

export class UpdateProviderDto {
  @IsOptionalNotNull()
  @IsString()
  @MaxLength(150)
  businessName?: string;

  @IsOptionalNotNull()
  @IsString()
  @MaxLength(30)
  nit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  verificationDigit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observations?: string;

  @IsOptionalNotNull()
  @IsBoolean()
  isActive?: boolean;
}
