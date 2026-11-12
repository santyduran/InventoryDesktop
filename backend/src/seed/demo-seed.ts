/**
 * Llena la base de datos local con datos de prueba de un taller de motos:
 * categorías, proveedores, productos, un operador y ~2 meses de movimientos.
 *
 * Uso:  npm run seed:demo
 *
 * - Requiere que ya exista un administrador (el creado en la configuración inicial).
 * - Solo se ejecuta sobre un inventario vacío: nunca borra ni sobrescribe datos.
 * - Los movimientos son coherentes: el stock final de cada producto es
 *   exactamente el resultado de sus entradas y salidas.
 */
import 'dotenv/config';

import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

import {
  DEMO_CATEGORIES,
  DEMO_LOW_STOCK,
  DEMO_PRODUCTS,
  DEMO_PROVIDERS,
} from './demo-data.js';

const DAY = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 60;

// Generador pseudoaleatorio con semilla fija: los datos salen iguales en cada ejecución.
function createRandom(seed: number) {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: T[]): T => items[Math.floor(next() * items.length)],
  };
}

interface PlannedMovement {
  movementType: 'ENTRY' | 'EXIT';
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceType: 'PURCHASE' | 'ADJUSTMENT';
  observations: string;
  createdAt: Date;
  byOperator: boolean;
}

const EXIT_REASONS = [
  'Venta de mostrador',
  'Venta de mostrador',
  'Servicio de taller',
  'Servicio de taller',
  'Mantenimiento preventivo',
  'Garantía a cliente',
];

function randomPlate(random: ReturnType<typeof createRandom>): string {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const pickLetter = () => letters[random.int(0, letters.length - 1)];
  return `${pickLetter()}${pickLetter()}${pickLetter()}${random.int(10, 99)}${pickLetter()}`;
}

/** Fecha dentro del horario del taller (8:00 a 18:00). */
function workingTime(base: Date, random: ReturnType<typeof createRandom>): Date {
  const date = new Date(base);
  date.setHours(random.int(8, 17), random.int(0, 59), random.int(0, 59), 0);
  return date;
}

function planMovements(
  product: (typeof DEMO_PRODUCTS)[number],
  random: ReturnType<typeof createRandom>,
  now: Date,
): PlannedMovement[] {
  const movements: PlannedMovement[] = [];
  let stock = 0;
  let invoice = random.int(1000, 9000);
  let lastTime = 0;

  const add = (
    movementType: 'ENTRY' | 'EXIT',
    quantity: number,
    requestedAt: Date,
    observations: string,
    referenceType: 'PURCHASE' | 'ADJUSTMENT',
    byOperator: boolean,
  ) => {
    // Siempre después del movimiento anterior: el historial queda en orden
    // cronológico y el stock antes/después es coherente.
    const createdAt = new Date(
      Math.max(requestedAt.getTime(), lastTime + random.int(20, 90) * 60 * 1000),
    );
    lastTime = createdAt.getTime();

    const stockBefore = stock;
    stock = movementType === 'ENTRY' ? stock + quantity : stock - quantity;
    movements.push({
      movementType,
      quantity,
      stockBefore,
      stockAfter: stock,
      referenceType,
      observations,
      createdAt,
      byOperator,
    });
  };

  const purchase = (quantity: number, createdAt: Date) => {
    invoice += random.int(3, 40);
    add('ENTRY', quantity, createdAt, `Compra a proveedor · Factura FV-${invoice}`, 'PURCHASE', false);
  };

  const historyStart = new Date(now.getTime() - HISTORY_DAYS * DAY);

  // Compra inicial en la primera semana del periodo.
  purchase(
    product.minimumStock * random.int(2, 4) + random.int(0, 3),
    workingTime(new Date(historyStart.getTime() + random.int(0, 5) * DAY), random),
  );

  // Productos inactivos: solo la compra inicial.
  if (product.isActive === false) {
    return movements;
  }

  // Salidas durante el periodo, más frecuentes en productos de alta rotación.
  const exitEvents = Math.min(14, 3 + Math.round(product.minimumStock / 2) + random.int(0, 3));
  const days = Array.from({ length: exitEvents }, () => random.int(7, HISTORY_DAYS - 3)).sort(
    (a, b) => a - b,
  );

  for (const day of days) {
    const createdAt = workingTime(new Date(historyStart.getTime() + day * DAY), random);
    const quantity = Math.min(stock, random.int(1, Math.max(1, Math.ceil(product.minimumStock / 3))));

    if (quantity > 0) {
      const reason = random.pick(EXIT_REASONS);
      const detail = reason === 'Venta de mostrador' ? reason : `${reason} · placa ${randomPlate(random)}`;
      add('EXIT', quantity, createdAt, detail, 'ADJUSTMENT', random.next() < 0.75);
    }

    // Reposición cuando se llega al mínimo.
    if (stock <= product.minimumStock && random.next() < 0.6) {
      purchase(product.minimumStock * 2, new Date(createdAt.getTime() + random.int(1, 3) * DAY));
    }
  }

  // Ajuste final de los últimos días para dejar el escenario de prueba deseado.
  const lastWeek = () =>
    workingTime(new Date(now.getTime() - random.int(1, 2) * DAY), random);
  const target = DEMO_LOW_STOCK[product.code];

  if (target !== undefined) {
    if (stock < target) {
      purchase(target - stock + product.minimumStock, lastWeek());
    }
    // Bajar hasta el objetivo con varias salidas pequeñas y creíbles en los
    // últimos días, en lugar de una sola salida enorme.
    const maxPerExit = Math.max(2, Math.ceil(product.minimumStock / 3));
    let day = random.int(8, 12);

    while (stock > target) {
      const quantity = Math.min(stock - target, random.int(1, maxPerExit));
      const reason = random.pick(EXIT_REASONS);
      const detail = reason === 'Venta de mostrador' ? reason : `${reason} · placa ${randomPlate(random)}`;
      add('EXIT', quantity, workingTime(new Date(now.getTime() - day * DAY), random), detail, 'ADJUSTMENT', random.next() < 0.75);
      day = Math.max(1, day - random.int(0, 1));
    }
  } else if (stock <= product.minimumStock) {
    purchase(product.minimumStock * 2, lastWeek());
  }

  // Comprobaciones de coherencia antes de guardar nada.
  for (const [i, movement] of movements.entries()) {
    if (movement.stockAfter < 0) {
      throw new Error(`Simulación inválida: stock negativo en ${product.code}.`);
    }
    if (movement.createdAt > now) {
      throw new Error(`Simulación inválida: movimiento en el futuro en ${product.code}.`);
    }
    if (i > 0 && movement.stockBefore !== movements[i - 1].stockAfter) {
      throw new Error(`Simulación inválida: historial incoherente en ${product.code}.`);
    }
  }

  return movements;
}

function barcodeFor(index: number): string {
  // EAN-13 ficticio con prefijo de Colombia (770) y dígito de control válido.
  const base = `770${String(1234500 + index * 37).padStart(9, '0')}`.slice(0, 12);
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    sum += Number(base.charAt(i)) * (i % 2 === 0 ? 1 : 3);
  }
  return base + String((10 - (sum % 10)) % 10);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('No se encontró DATABASE_URL. Ejecuta el script desde la carpeta backend.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });

  try {
    const [productCount, categoryCount, providerCount, movementCount] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.provider.count(),
      prisma.inventoryMovement.count(),
    ]);

    if (productCount + categoryCount + providerCount + movementCount > 0) {
      throw new Error(
        'El inventario ya tiene datos. Este script solo llena una base vacía y nunca borra información.',
      );
    }

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!admin) {
      throw new Error('No hay un administrador activo. Crea el administrador inicial primero.');
    }

    const random = createRandom(2026);
    const now = new Date();

    // Usuarios operadores de prueba (contraseñas aleatorias, se muestran al final).
    const operatorsToCreate = [
      { fullName: 'Carlos Ramírez', username: 'operador@inventory.local', isActive: true },
      { fullName: 'Luis Gómez', username: 'operador.inactivo@inventory.local', isActive: false },
    ];
    const createdOperators: { username: string; password: string; isActive: boolean }[] = [];

    const operatorIds: string[] = [];
    for (const operator of operatorsToCreate) {
      const existing = await prisma.user.findUnique({ where: { username: operator.username } });

      if (existing) {
        if (existing.isActive) operatorIds.push(existing.id);
        continue;
      }

      const password = randomBytes(12).toString('base64url');
      const user = await prisma.user.create({
        data: {
          fullName: operator.fullName,
          username: operator.username,
          passwordHash: await argon2.hash(password),
          role: 'OPERADOR',
          isActive: operator.isActive,
        },
      });

      createdOperators.push({ username: operator.username, password, isActive: operator.isActive });
      if (operator.isActive) operatorIds.push(user.id);
    }

    const operatorId = operatorIds[0] ?? admin.id;

    const summary = await prisma.$transaction(async (tx) => {
      const categoryIds = new Map<string, string>();

      for (const category of DEMO_CATEGORIES) {
        const created = await tx.category.create({
          data: {
            name: category.name,
            description: category.description,
            isActive: category.isActive ?? true,
            createdAt: new Date(now.getTime() - (HISTORY_DAYS + 2) * DAY),
          },
        });
        categoryIds.set(category.name, created.id);
      }

      for (const provider of DEMO_PROVIDERS) {
        await tx.provider.create({
          data: {
            ...provider,
            isActive: provider.isActive ?? true,
            createdAt: new Date(now.getTime() - (HISTORY_DAYS + 1) * DAY),
          },
        });
      }

      let movementsCreated = 0;

      for (const [index, product] of DEMO_PRODUCTS.entries()) {
        const categoryId = categoryIds.get(product.category);

        if (!categoryId) {
          throw new Error(`La categoría "${product.category}" no existe en los datos de ejemplo.`);
        }

        const movements = planMovements(product, random, now);
        const finalStock = movements.at(-1)?.stockAfter ?? 0;

        const created = await tx.product.create({
          data: {
            code: product.code,
            barcode: index % 3 === 2 ? null : barcodeFor(index),
            name: product.name,
            description: product.description,
            categoryId,
            purchasePrice: product.purchasePrice,
            salePrice: product.salePrice,
            taxType: 'GENERAL',
            taxRate: 1900,
            stock: finalStock,
            minimumStock: product.minimumStock,
            isActive: product.isActive ?? true,
            createdAt: movements[0]?.createdAt ?? now,
          },
        });

        await tx.inventoryMovement.createMany({
          data: movements.map((movement) => ({
            productId: created.id,
            userId: movement.byOperator ? operatorId : admin.id,
            movementType: movement.movementType,
            quantity: movement.quantity,
            stockBefore: movement.stockBefore,
            stockAfter: movement.stockAfter,
            referenceType: movement.referenceType,
            observations: movement.observations,
            createdAt: movement.createdAt,
          })),
        });

        movementsCreated += movements.length;
      }

      return { movementsCreated };
    });

    console.log('Datos de prueba creados correctamente:');
    console.log(`  Categorías:  ${DEMO_CATEGORIES.length}`);
    console.log(`  Proveedores: ${DEMO_PROVIDERS.length}`);
    console.log(`  Productos:   ${DEMO_PRODUCTS.length}`);
    console.log(`  Movimientos: ${summary.movementsCreated}`);

    for (const operator of createdOperators) {
      console.log(
        `  Operador${operator.isActive ? '' : ' (inactivo)'}: ${operator.username} / ${operator.password}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('No fue posible crear los datos de prueba:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
