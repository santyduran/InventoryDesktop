
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { IsOptionalNotNull } from '../../common/validators/is-optional-not-null.js';

export class UpdateProductDto {
  @IsOptionalNotNull()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string | null;

  @IsOptionalNotNull()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptionalNotNull()
  @IsString()
  categoryId?: string;

  @IsOptionalNotNull()
  @IsInt()
  @Min(0)
  purchasePrice?: number;

  @IsOptionalNotNull()
  @IsInt()
  @Min(0)
  salePrice?: number;

  @IsOptionalNotNull()
  @IsString()
  @IsIn(['GENERAL', 'EXENTO', 'EXCLUIDO'])
  taxType?: string;

  @IsOptionalNotNull()
  @IsInt()
  @Min(0)
  @Max(10000)
  taxRate?: number;

  // El stock no se edita aquí: solo cambia con movimientos de inventario.

  @IsOptionalNotNull()
  @IsInt()
  @Min(0)
  minimumStock?: number;

  @IsOptionalNotNull()
  @IsBoolean()
  isActive?: boolean;
}
