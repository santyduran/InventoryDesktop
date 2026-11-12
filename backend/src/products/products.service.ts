
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateCategory(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('La categoría no existe.');
    }

    if (!category.isActive) {
      throw new ConflictException(
        'No se pueden registrar productos en una categoría inactiva.',
      );
    }
  }

  /**
   * Los productos exentos o excluidos de IVA no llevan tarifa:
   * en ese caso la tarifa siempre se guarda en 0.
   */
  private resolveTaxRate(taxType: string, taxRate: number): number {
    return taxType === 'GENERAL' ? taxRate : 0;
  }

  private handleDatabaseError(error: unknown): never {
    const databaseError = error as { code?: string };

    if (databaseError.code === 'P2002') {
      throw new ConflictException(
        'El código o código de barras ya está registrado.',
      );
    }

    throw error;
  }

  async create(dto: CreateProductDto, userId: string) {
    const code = dto.code.trim();
    const name = dto.name.trim();

    if (!code || !name) {
      throw new ConflictException(
        'El código y el nombre del producto son obligatorios.',
      );
    }

    await this.validateCategory(dto.categoryId);

    const barcode = dto.barcode?.trim() || null;

    const initialStock = dto.stock ?? 0;

    try {
      // El producto y su stock inicial se guardan juntos: si hay existencias
      // iniciales, quedan registradas como un movimiento de entrada.
      return await this.prisma.$transaction(async (transaction) => {
        const product = await transaction.product.create({
          data: {
            code,
            barcode,
            name,
            description: dto.description?.trim() || null,
            categoryId: dto.categoryId,
            purchasePrice: dto.purchasePrice,
            salePrice: dto.salePrice,
            taxType: dto.taxType ?? 'GENERAL',
            taxRate: this.resolveTaxRate(
              dto.taxType ?? 'GENERAL',
              dto.taxRate ?? 1900,
            ),
            stock: initialStock,
            minimumStock: dto.minimumStock ?? 0,
          },
          include: {
            category: true,
          },
        });

        if (initialStock > 0) {
          await transaction.inventoryMovement.create({
            data: {
              productId: product.id,
              userId,
              movementType: 'ENTRY',
              quantity: initialStock,
              stockBefore: 0,
              stockAfter: initialStock,
              referenceType: 'ADJUSTMENT',
              observations: 'Stock inicial al crear el producto',
            },
          });
        }

        return product;
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        category: true,
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.findOne(id);

    const data: {
      code?: string;
      barcode?: string | null;
      name?: string;
      description?: string | null;
      categoryId?: string;
      purchasePrice?: number;
      salePrice?: number;
      taxType?: string;
      taxRate?: number;
      minimumStock?: number;
      isActive?: boolean;
    } = {};

    if (dto.code !== undefined) {
      const code = dto.code.trim();

      if (!code) {
        throw new ConflictException(
          'El código del producto no puede estar vacío.',
        );
      }

      data.code = code;
    }

    if (dto.barcode !== undefined) {
      data.barcode = dto.barcode?.trim() || null;
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (!name) {
        throw new ConflictException(
          'El nombre del producto no puede estar vacío.',
        );
      }

      data.name = name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    // Solo se valida si la categoría cambia; así se puede seguir editando
    // un producto cuya categoría se desactivó después.
    if (dto.categoryId !== undefined && dto.categoryId !== current.categoryId) {
      await this.validateCategory(dto.categoryId);
      data.categoryId = dto.categoryId;
    }

    if (dto.purchasePrice !== undefined) {
      data.purchasePrice = dto.purchasePrice;
    }

    if (dto.salePrice !== undefined) {
      data.salePrice = dto.salePrice;
    }

    if (dto.taxType !== undefined) {
      data.taxType = dto.taxType;
    }

    if (dto.taxRate !== undefined) {
      data.taxRate = dto.taxRate;
    }

    const effectiveTaxType = data.taxType ?? current.taxType;

    if (effectiveTaxType !== 'GENERAL') {
      data.taxRate = 0;
    }

    if (dto.minimumStock !== undefined) {
      data.minimumStock = dto.minimumStock;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.product.update({
        where: { id },
        data,
        include: {
          category: true,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }
}
