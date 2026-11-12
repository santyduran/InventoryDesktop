import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type BackupType = 'automatico' | 'manual' | 'pre-migracion';

export interface Backup {
  fileName: string;
  type: BackupType;
  sizeBytes: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:3000/backups';

  getBackups(): Observable<Backup[]> {
    return this.http.get<Backup[]>(this.apiUrl);
  }

  createBackup(): Observable<Backup> {
    return this.http.post<Backup>(this.apiUrl, {});
  }

  downloadBackup(fileName: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${encodeURIComponent(fileName)}/download`,
      { responseType: 'blob' },
    );
  }
}
