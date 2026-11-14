import { createHash, timingSafeEqual } from 'node:crypto';

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SetupAdminDto } from './dto/setup-admin.dto.js';
import { LoginThrottleService } from './login-throttle.service.js';
import { UserRole } from '../common/enums/user-role.enum.js';

function getSetupToken(): string | undefined {
  return process.env.SETUP_TOKEN?.trim() || undefined;
}

function sameSecret(received: string, expected: string): boolean {
  const a = createHash('sha256').update(received).digest();
  const b = createHash('sha256').update(expected).digest();

  return timingSafeEqual(a, b);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly loginThrottle: LoginThrottleService,
  ) {}

  /**
   * Indica si la instalación necesita crear su administrador inicial.
   */
  async getSetupStatus() {
    const userCount = await this.prisma.user.count();

    return {
      requiresSetup: userCount === 0,
      requiresSetupToken: !!getSetupToken(),
    };
  }

  /**
   * Registra el primer administrador de la instalación.
   * No permite registrar usuarios adicionales mediante esta ruta.
   */
  async setupAdmin(dto: SetupAdminDto) {
    // En un servidor web la página de configuración inicial es pública:
    // con SETUP_TOKEN, solo quien conozca ese código puede crear el admin.
    const setupToken = getSetupToken();

    if (setupToken && !sameSecret(dto.setupToken ?? '', setupToken)) {
      throw new ForbiddenException('El código de instalación no es correcto.');
    }

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
  async login(dto: LoginDto, ip = 'local') {
    const username = dto.username.trim().toLowerCase();

    this.loginThrottle.assertAllowed(ip, username);

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    const passwordIsValid =
      !!user &&
      user.isActive &&
      (await argon2.verify(user.passwordHash, dto.password));

    if (!user || !passwordIsValid) {
      this.loginThrottle.registerFailure(ip, username);

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

    this.loginThrottle.registerSuccess(ip, username);

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
