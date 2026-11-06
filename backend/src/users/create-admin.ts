
import 'dotenv/config';

import * as argon2 from 'argon2';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('No se encontró DATABASE_URL.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: databaseUrl,
    }),
  });

  try {
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      throw new Error(
        'Ya existen usuarios. No se puede ejecutar la creación inicial del administrador.',
      );
    }

    const fullName = process.env.ADMIN_FULL_NAME?.trim();
    const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!fullName || !username || !password) {
      throw new Error(
        'Configura ADMIN_FULL_NAME, ADMIN_USERNAME y ADMIN_PASSWORD en el archivo .env.',
      );
    }

    if (password.length < 12) {
      throw new Error(
        'La contraseña inicial debe tener al menos 12 caracteres.',
      );
    }

    const passwordHash = await argon2.hash(password);

    const admin = await prisma.user.create({
      data: {
        fullName,
        username,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
      },
    });

    console.log('Administrador inicial creado correctamente.');
    console.log(`Nombre: ${admin.fullName}`);
    console.log(`Usuario: ${admin.username}`);
    console.log(`Rol: ${admin.role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('No fue posible crear el administrador:', error);
  process.exitCode = 1;
});
