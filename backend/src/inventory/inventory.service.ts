
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createMovement(
    dto: CreateInventoryMovementDto,
    userId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado.');
      }

      if (!product.isActive) {
        throw new BadRequestException(
          'No se pueden registrar movimientos de un producto inactivo.',
        );
      }

      const stockBefore = product.stock;

      const stockAfter =
        dto.movementType === 'ENTRY'
          ? stockBefore + dto.quantity
          : stockBefore - dto.quantity;

      if (stockAfter < 0) {
        throw new BadRequestException(
          `Existencias insuficientes. Stock disponible: ${stockBefore}.`,
        );
      }

      await transaction.product.update({
        where: { id: product.id },
        data: {
          stock: stockAfter,
        },
      });

      const movement = await transaction.inventoryMovement.create({
        data: {
          productId: product.id,
          userId,
          movementType: dto.movementType,
          quantity: dto.quantity,
          stockBefore,
          stockAfter,
          referenceType: dto.movementType === 'ENTRY' ? 'PURCHASE' : 'ADJUSTMENT',
          observations: dto.observations?.trim() || null,
        },
        include: {
          product: true,
        },
      });

      return movement;
    });
  }

  async findAll() {
    return this.prisma.inventoryMovement.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    });
  }

  async findByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    return this.prisma.inventoryMovement.findMany({
      where: {
        productId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    });
  }
}
