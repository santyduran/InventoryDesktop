import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { createBackup, getDatabaseFilePath } from './database-files.js';

/**
 * Aplica al arrancar las migraciones de prisma/migrations que falten.
 *
 * Usa la misma tabla `_prisma_migrations` y el mismo checksum (SHA-256 del
 * archivo) que `prisma migrate`, así que ambos conviven sin conflictos.
 * Sirve para que una instalación existente se actualice sola al instalar una
 * versión nueva, y para crear la base de datos desde cero si no existe.
 * Antes de modificar una base de datos con información se hace un respaldo.
 */
export async function applyPendingMigrations(): Promise<void> {
  const migrationsDirectory = path.resolve(
    process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'prisma', 'migrations'),
  );

  if (!fs.existsSync(migrationsDirectory)) {
    throw new Error(
      `No se encontró la carpeta de migraciones: ${migrationsDirectory}`,
    );
  }

  const migrations = fs
    .readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(
        path.join(migrationsDirectory, name, 'migration.sql'),
        'utf8',
      );

      return {
        name,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    });

  const databasePath = getDatabaseFilePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new Database(databasePath);

  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                  TEXT PRIMARY KEY NOT NULL,
        "checksum"            TEXT NOT NULL,
        "finished_at"         DATETIME,
        "migration_name"      TEXT NOT NULL,
        "logs"                TEXT,
        "rolled_back_at"      DATETIME,
        "started_at"          DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
      )
    `);

    const applied = database
      .prepare(
        `SELECT migration_name, checksum, finished_at
           FROM _prisma_migrations
          WHERE rolled_back_at IS NULL`,
      )
      .all() as {
      migration_name: string;
      checksum: string;
      finished_at: string | null;
    }[];

    const failed = applied.find((row) => row.finished_at === null);

    if (failed) {
      throw new Error(
        `La migración "${failed.migration_name}" quedó incompleta. ` +
          'Restaura el último respaldo antes de continuar.',
      );
    }

    const appliedByName = new Map(
      applied.map((row) => [row.migration_name, row.checksum]),
    );

    for (const migration of migrations) {
      const checksum = appliedByName.get(migration.name);

      if (checksum && checksum !== migration.checksum) {
        console.warn(
          `Aviso: la migración ${migration.name} cambió después de aplicarse.`,
        );
      }
    }

    const pending = migrations.filter(
      (migration) => !appliedByName.has(migration.name),
    );

    if (pending.length === 0) {
      return;
    }

    const hasData =
      (
        database
          .prepare(
            `SELECT COUNT(*) AS total FROM sqlite_master
              WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
                AND name <> '_prisma_migrations'`,
          )
          .get() as { total: number }
      ).total > 0;

    if (hasData) {
      database.close();
      const backup = await createBackup('pre-migracion');
      console.log(`Respaldo previo a la actualización: ${backup.fileName}`);
    }

    const target = hasData ? new Database(databasePath) : database;

    try {
      // Las migraciones de SQLite pueden reconstruir tablas; las claves
      // foráneas se comprueban al final en lugar de durante el proceso.
      target.pragma('foreign_keys = OFF');

      const insert = target.prepare(
        `INSERT INTO _prisma_migrations
           (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
         VALUES (?, ?, ?, ?, ?, 1)`,
      );

      for (const migration of pending) {
        const startedAt = new Date().toISOString();

        target.transaction(() => {
          target.exec(migration.sql);

          const violations = target.pragma('foreign_key_check') as unknown[];

          if (violations.length > 0) {
            throw new Error(
              `La migración ${migration.name} deja referencias inválidas.`,
            );
          }

          insert.run(
            randomUUID(),
            migration.checksum,
            new Date().toISOString(),
            migration.name,
            startedAt,
          );
        })();

        console.log(`Migración aplicada: ${migration.name}`);
      }
    } finally {
      target.pragma('foreign_keys = ON');

      if (target !== database) {
        target.close();
      }
    }
  } finally {
    if (database.open) {
      database.close();
    }
  }
}
