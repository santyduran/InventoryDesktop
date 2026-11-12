import {
  ChangeDetectorRef,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import {
  Backup,
  BackupService,
  BackupType,
} from '../../core/services/backup.service';

const TYPE_LABELS: Record<BackupType, string> = {
  automatico: 'Automático',
  manual: 'Manual',
  'pre-migracion': 'Antes de actualizar',
};

@Component({
  selector: 'app-backups',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backups.html',
  styleUrl: './backups.scss',
})
export class Backups implements OnInit {
  private readonly backupService = inject(BackupService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  backups: Backup[] = [];
  loading = false;
  creating = false;
  downloading: string | null = null;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadBackups();
    }
  }

  get lastBackup(): Backup | undefined {
    return this.backups[0];
  }

  /** Más de 2 días sin respaldo: se muestra una advertencia. */
  get isLastBackupOld(): boolean {
    const last = this.lastBackup;

    return (
      !last ||
      Date.now() - new Date(last.createdAt).getTime() > 2 * 24 * 60 * 60 * 1000
    );
  }

  loadBackups(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.backupService.getBackups().subscribe({
      next: (backups) => {
        this.backups = backups;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'No fue posible cargar los respaldos.';
        this.cdr.detectChanges();
      },
    });
  }

  createBackup(): void {
    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.backupService.createBackup().subscribe({
      next: (backup) => {
        this.creating = false;
        this.successMessage = `Respaldo creado: ${backup.fileName}`;
        this.cdr.detectChanges();
        this.loadBackups();
      },
      error: (error) => {
        this.creating = false;
        this.errorMessage =
          error.error?.message || 'No fue posible crear el respaldo.';
        this.cdr.detectChanges();
      },
    });
  }

  download(backup: Backup): void {
    this.downloading = backup.fileName;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.backupService.downloadBackup(backup.fileName).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = backup.fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        this.downloading = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.downloading = null;
        this.errorMessage = 'No fue posible descargar el respaldo.';
        this.cdr.detectChanges();
      },
    });
  }

  typeLabel(type: BackupType): string {
    return TYPE_LABELS[type];
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
