import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
}

interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET no está configurado.');
  }

  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  /**
   * Además de la firma, se comprueba en la base de datos que el usuario
   * siga existiendo y activo, y se usa su rol actual (no el del token).
   * Así, desactivar a alguien o cambiarle el rol aplica de inmediato.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.username) {
      throw new UnauthorizedException('Token inválido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'La sesión ya no es válida. Inicia sesión de nuevo.',
      );
    }

    const role = user.role as UserRole;

    if (!Object.values(UserRole).includes(role)) {
      throw new UnauthorizedException('Token inválido.');
    }

    return {
      id: user.id,
      username: user.username,
      role,
    };
  }
}
