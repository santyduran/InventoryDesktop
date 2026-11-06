
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsInt()
  @Min(0)
  purchasePrice!: number;

  @IsInt()
  @Min(0)
  salePrice!: number;

  @IsOptional()
  @IsString()
  @IsIn(['GENERAL', 'EXENTO', 'EXCLUIDO'])
  taxType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  taxRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumStock?: number;
}
