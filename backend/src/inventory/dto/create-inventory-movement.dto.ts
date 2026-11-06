
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInventoryMovementDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsIn(['ENTRY', 'EXIT'])
  movementType!: 'ENTRY' | 'EXIT';

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  observations?: string;
}
