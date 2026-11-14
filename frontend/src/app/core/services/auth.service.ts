
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { getAppConfig } from '../config/app-config';

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  role: 'ADMIN' | 'OPERADOR';
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

export interface SetupStatusResponse {
  requiresSetup: boolean;
  /** El servidor pide un código de instalación (versión web). */
  requiresSetupToken?: boolean;
}

export interface SetupAdminRequest {
  fullName: string;
  username: string;
  password: string;
  setupToken?: string;
}

export interface SetupAdminResponse {
  message: string;
  user: AuthUser & {
    isActive: boolean;
    createdAt: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly apiUrl = `${getAppConfig().apiUrl}/auth`;

  private readonly tokenKey = 'inventory_access_token';
  private readonly userKey = 'inventory_user';

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Consulta si la instalación necesita crear
   * el administrador inicial.
   */
  getSetupStatus(): Observable<SetupStatusResponse> {
    return this.http.get<SetupStatusResponse>(
      `${this.apiUrl}/setup-status`,
    );
  }

  /**
   * Registra el primer administrador.
   */
  setupAdmin(
    data: SetupAdminRequest,
  ): Observable<SetupAdminResponse> {
    return this.http.post<SetupAdminResponse>(
      `${this.apiUrl}/setup`,
      {
        fullName: data.fullName.trim(),
        username: data.username.trim().toLowerCase(),
        password: data.password,
        ...(data.setupToken ? { setupToken: data.setupToken.trim() } : {}),
      },
    );
  }

  /**
   * Inicio de sesión habitual.
   */
  login(
    username: string,
    password: string,
  ): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, {
        username,
        password,
      })
      .pipe(
        tap((response) => {
          if (!this.isBrowser) {
            return;
          }

          localStorage.setItem(
            this.tokenKey,
            response.accessToken,
          );

          localStorage.setItem(
            this.userKey,
            JSON.stringify(response.user),
          );
        }),
      );
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    return localStorage.getItem(this.tokenKey);
  }

  getUser(): AuthUser | null {
    if (!this.isBrowser) {
      return null;
    }

    const user = localStorage.getItem(this.userKey);

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user) as AuthUser;
    } catch {
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}

