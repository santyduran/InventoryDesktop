import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

export type BackupType = 'automatico' | 'manual' | 'pre-migracion';

export interface BackupFile {
  fileName: string;
  type: BackupType;
  sizeBytes: number;
  createdAt: Date;
}

const BACKUP_FILE_PATTERN =
  /^inventario-(\d{8}-\d{6})-(automatico|manual|pre-migracion)\.db$/;

/** Cuántos respaldos de cada tipo se conservan; los más antiguos se borran. */
const BACKUPS_TO_KEEP: Record<BackupType, number> = {
  automatico: 14,
  manual: 30,
  'pre-migracion': 5,
};

/**
 * Ruta del archivo SQLite a partir de DATABASE_URL ("file:./dev.db",
 * "file:/ruta/absoluta.db" o "file:C:/ruta/en/windows.db").
 */
export function getDatabaseFilePath(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl?.startsWith('file:')) {
    throw new Error(
      'DATABASE_URL debe apuntar a un archivo SQLite (file:...).',
    );
  }

  return path.resolve(databaseUrl.slice('file:'.length));
}

/** Carpeta de respaldos: BACKUP_DIR o "backups" junto a la base de datos. */
export function getBackupDirectory(): string {
  const configured = process.env.BACKUP_DIR?.trim();

  return configured
    ? path.resolve(configured)
    : path.join(path.dirname(getDatabaseFilePath()), 'backups');
}

function timestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function parseTimestamp(value: string): Date {
  const [day, time] = value.split('-');

  return new Date(
    Number(day.slice(0, 4)),
    Number(day.slice(4, 6)) - 1,
    Number(day.slice(6, 8)),
    Number(time.slice(0, 2)),
    Number(time.slice(2, 4)),
    Number(time.slice(4, 6)),
  );
}

export function listBackups(): BackupFile[] {
  const directory = getBackupDirectory();

  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory)
    .flatMap((fileName) => {
      const match = BACKUP_FILE_PATTERN.exec(fileName);

      if (!match) {
        return [];
      }

      return [
        {
          fileName,
          type: match[2] as BackupType,
          sizeBytes: fs.statSync(path.join(directory, fileName)).size,
          createdAt: parseTimestamp(match[1]),
        },
      ];
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Devuelve la ruta de un respaldo solo si el nombre es válido y existe. */
export function resolveBackupFile(fileName: string): string | null {
  if (!BACKUP_FILE_PATTERN.test(fileName)) {
    return null;
  }

  const filePath = path.join(getBackupDirectory(), fileName);

  return fs.existsSync(filePath) ? filePath : null;
}

function pruneBackups(type: BackupType): void {
  const directory = getBackupDirectory();

  listBackups()
    .filter((backup) => backup.type === type)
    .slice(BACKUPS_TO_KEEP[type])
    .forEach((backup) => {
      fs.rmSync(path.join(directory, backup.fileName), { force: true });
    });
}

/**
 * Copia consistente de la base de datos (API de respaldo de SQLite),
 * segura aunque la aplicación esté escribiendo en ese momento.
 */
export async function createBackup(type: BackupType): Promise<BackupFile> {
  const databasePath = getDatabaseFilePath();
  const directory = getBackupDirectory();

  fs.mkdirSync(directory, { recursive: true });

  let createdAt = new Date();
  let fileName = `inventario-${timestamp(createdAt)}-${type}.db`;

  // Dos respaldos en el mismo segundo: se espera al siguiente.
  while (fs.existsSync(path.join(directory, fileName))) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    createdAt = new Date();
    fileName = `inventario-${timestamp(createdAt)}-${type}.db`;
  }

  const filePath = path.join(directory, fileName);
  const temporaryPath = `${filePath}.tmp`;
  const database = new Database(databasePath, { fileMustExist: true });

  try {
    await database.backup(temporaryPath);
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    throw error;
  } finally {
    database.close();
  }

  pruneBackups(type);

  return {
    fileName,
    type,
    sizeBytes: fs.statSync(filePath).size,
    createdAt: parseTimestamp(timestamp(createdAt)),
  };
}
