
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';
import { AppModule } from './app.module.js';
import { applyPendingMigrations } from './database/migrate.js';

/** Orígenes web adicionales permitidos, separados por coma (CORS_ORIGINS). */
function getExtraCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  // Antes de abrir la base de datos: aplicar actualizaciones pendientes
  // (con respaldo previo) o crearla desde cero en una instalación nueva.
  await applyPendingMigrations();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableShutdownHooks();

  // Detrás de un proxy (versión web) la IP real del cliente llega en
  // X-Forwarded-For; se necesita para limitar los intentos de login.
  if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  const extraOrigins = getExtraCorsOrigins();

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      const allowedOrigin =
        !origin ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        extraOrigins.includes(origin);

      if (allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error('Origen no autorizado por CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.enableCors(corsOptions);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  // En escritorio solo escucha en el propio equipo. En un servidor web
  // (contenedor detrás de un proxy) se usa HOST=0.0.0.0.
  const host = process.env.HOST?.trim() || '127.0.0.1';

  await app.listen(port, host);

  console.log(`Servidor iniciado en http://${host}:${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Error al iniciar la aplicación:', error);
  process.exit(1);
});
