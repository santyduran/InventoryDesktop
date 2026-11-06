import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../common/enums/user-role.enum.js';

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
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (
      !payload.sub ||
      !payload.username ||
      !Object.values(UserRole).includes(payload.role)
    ) {
      throw new UnauthorizedException('Token inválido.');
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}