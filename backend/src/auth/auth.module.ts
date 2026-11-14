import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { LoginThrottleService } from './login-throttle.service.js';

const DEFAULT_TOKEN_TTL_SECONDS = 15 * 60;

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

/**
 * Duración del token según JWT_EXPIRES_IN (por ejemplo "15m", "8h" o "30d").
 * Sin la variable, o con un valor no válido, se mantienen 15 minutos.
 */
function getTokenTtlSeconds(): number {
  const value = process.env.JWT_EXPIRES_IN?.trim();

  if (!value) {
    return DEFAULT_TOKEN_TTL_SECONDS;
  }

  const match = /^(\d+)\s*([smhd])$/i.exec(value);

  if (!match) {
    console.warn(
      `JWT_EXPIRES_IN="${value}" no es válido (usa por ejemplo 15m, 8h o 30d). Se usarán 15 minutos.`,
    );
    return DEFAULT_TOKEN_TTL_SECONDS;
  }

  return Number(match[1]) * UNIT_SECONDS[match[2].toLowerCase()];
}

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
          throw new Error('JWT_SECRET no está configurado.');
        }

        return {
          secret,
          signOptions: {
            expiresIn: getTokenTtlSeconds(),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginThrottleService],
  exports: [AuthService],
})
export class AuthModule {}