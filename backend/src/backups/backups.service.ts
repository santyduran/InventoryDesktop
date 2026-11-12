import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import {
  BackupFile,
  createBackup,
  listBackups,
  resolveBackupFile,
} from '../database/database-files.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 60 * 1000;

@Injectable()
export class BackupsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // Respaldo automático diario: se revisa al arrancar y cada hora,
    // porque el equipo del taller puede quedar encendido varios días.
    void this.runDailyBackupIfDue();
    this.timer = setInterval(() => void this.runDailyBackupIfDue(), CHECK_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  findAll(): BackupFile[] {
    return listBackups();
  }

  async createManual(userId: string): Promise<BackupFile> {
    return this.create('manual', userId);
  }

  getFilePath(fileName: string): string {
    const filePath = resolveBackupFile(fileName);

    if (!filePath) {
      throw new NotFoundException('Respaldo no encontrado.');
    }

    return filePath;
  }

  private async runDailyBackupIfDue(): Promise<void> {
    if (this.running) {
      return;
    }

    const lastAutomatic = listBackups().find(
      (backup) => backup.type === 'automatico',
    );

    if (lastAutomatic && Date.now() - lastAutomatic.createdAt.getTime() < DAY_MS) {
      return;
    }

    try {
      const backup = await this.create('automatico');
      console.log(`Respaldo automático creado: ${backup.fileName}`);
    } catch (error) {
      console.error('No fue posible crear el respaldo automático:', error);
    }
  }

  private async create(
    type: 'automatico' | 'manual',
    userId?: string,
  ): Promise<BackupFile> {
    this.running = true;

    try {
      const backup = await createBackup(type);

      await this.prisma.backupRecord.create({
        data: {
          userId: userId ?? null,
          filePath: backup.fileName,
          backupType: type,
          status: 'COMPLETED',
        },
      });

      return backup;
    } finally {
      this.running = false;
    }
  }
}
