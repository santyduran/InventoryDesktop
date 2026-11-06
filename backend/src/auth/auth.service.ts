
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SetupAdminDto } from './dto/setup-admin.dto.js';
import { UserRole } from '../common/enums/user-role.enum.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Indica si la instalación necesita crear su administrador inicial.
   */
  async getSetupStatus() {
    const userCount = await this.prisma.user.count();

    return {
      requiresSetup: userCount === 0,
    };
  }

  /**
   * Registra el primer administrador de la instalación.
   * No permite registrar usuarios adicionales mediante esta ruta.
   */
  async setupAdmin(dto: SetupAdminDto) {
    const username = dto.username.trim().toLowerCase();
    const fullName = dto.fullName.trim();

    if (!fullName) {
      throw new ConflictException(
        'El nombre del administrador no puede estar vacío.',
      );
    }

    const existingUsers = await this.prisma.user.count();

    if (existingUsers > 0) {
      throw new ConflictException(
        'La configuración inicial ya fue realizada.',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    try {
      const admin = await this.prisma.$transaction(async (transaction) => {
        const userCount = await transaction.user.count();

        if (userCount > 0) {
          throw new ConflictException(
            'La configuración inicial ya fue realizada.',
          );
        }

        return transaction.user.create({
          data: {
            fullName,
            username,
            passwordHash,
            role: UserRole.ADMIN,
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
      });

      return {
        message: 'Administrador inicial creado correctamente.',
        user: admin,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      const databaseError = error as { code?: string };

      if (databaseError.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un usuario registrado con ese correo.',
        );
      }

      throw error;
    }
  }

  /**
   * Inicio de sesión habitual.
   */
  async login(dto: LoginDto) {
    const username = dto.username.trim();

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Usuario o contraseña incorrectos.',
      );
    }

    const passwordIsValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException(
        'Usuario o contraseña incorrectos.',
      );
    }

    if (!Object.values(UserRole).includes(user.role as UserRole)) {
      throw new UnauthorizedException(
        'El usuario tiene un rol no válido.',
      );
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role as UserRole,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
      },
    };
  }
}
