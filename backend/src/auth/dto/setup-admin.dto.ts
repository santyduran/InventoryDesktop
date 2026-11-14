
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SetupAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName!: string;

  @IsEmail()
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  /** Código de instalación; obligatorio solo si el servidor define SETUP_TOKEN. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  setupToken?: string;
}
