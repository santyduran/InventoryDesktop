
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();

    const existingCategory = await this.prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      throw new ConflictException(
        'Ya existe una categoría con ese nombre.',
      );
    }

    return this.prisma.category.create({
      data: {
        name,
        description: dto.description?.trim() || null,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    const data: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (!name) {
        throw new ConflictException(
          'El nombre de la categoría no puede estar vacío.',
        );
      }

      const existingCategory = await this.prisma.category.findUnique({
        where: { name },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          'Ya existe una categoría con ese nombre.',
        );
      }

      data.name = name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    if (category._count.products > 0) {
      throw new ConflictException(
        'No se puede eliminar una categoría que tiene productos asociados.',
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
