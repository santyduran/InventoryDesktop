
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const username = dto.username.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese correo.',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          fullName: dto.fullName.trim(),
          username,
          passwordHash,
          role: dto.role,
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
    } catch (error) {
      const databaseError = error as { code?: string };

      if (databaseError.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un usuario registrado con ese correo.',
        );
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: {
      fullName?: string;
      username?: string;
      passwordHash?: string;
      role?: string;
      isActive?: boolean;
    } = {};

    if (dto.fullName !== undefined) {
      const fullName = dto.fullName.trim();

      if (!fullName) {
        throw new ConflictException(
          'El nombre del usuario no puede estar vacío.',
        );
      }

      data.fullName = fullName;
    }

    if (dto.username !== undefined) {
      const username = dto.username.trim().toLowerCase();

      const existingUser = await this.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(
          'Ese correo ya está registrado por otro usuario.',
        );
      }

      data.username = username;
    }

    if (dto.password !== undefined) {
      data.passwordHash = await argon2.hash(dto.password);
    }

    if (dto.role !== undefined) {
      data.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      const databaseError = error as { code?: string };

      if (databaseError.code === 'P2002') {
        throw new ConflictException(
          'Ese correo ya está registrado por otro usuario.',
        );
      }

      throw error;
    }
  }
}
