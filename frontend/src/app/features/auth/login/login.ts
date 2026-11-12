
import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

// Solo se recuerda el correo; la contraseña nunca se guarda.
const REMEMBERED_USERNAME_KEY = 'inventory_remembered_username';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  username = '';
  password = '';
  showPassword = false;
  rememberUser = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    // La consulta solo debe ejecutarse en el navegador.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.route.snapshot.queryParamMap.get('reason') === 'session-expired') {
      this.errorMessage = 'Tu sesión terminó. Vuelve a iniciar sesión.';
    }

    const rememberedUsername = this.readRememberedUsername();

    if (rememberedUsername) {
      this.username = rememberedUsername;
      this.rememberUser = true;
    }

    this.authService.getSetupStatus().subscribe({
      next: (status) => {
        if (status.requiresSetup) {
          this.router.navigate(['/setup']);
        }
      },
      error: () => {
        // Si el backend no responde, se conserva el login.
        // El error de conexión se mostrará al intentar ingresar.
      },
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const username = this.username.trim().toLowerCase();
    const password = this.password;

    if (!username || !password) {
      this.errorMessage = 'Ingresa tu correo y contraseña.';
      return;
    }

    this.loading = true;

    this.authService.login(username, password).subscribe({
      next: () => {
        this.loading = false;
        this.saveRememberedUsername(username);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading = false;

        if (error.status === 401) {
          this.errorMessage = 'Correo o contraseña incorrectos.';
        } else if (error.status === 0) {
          this.errorMessage =
            'No se pudo conectar con el servidor. Verifica que el backend esté activo.';
        } else {
          this.errorMessage =
            error.error?.message || 'Ocurrió un error al iniciar sesión.';
        }
      },
    });
  }

  private readRememberedUsername(): string {
    try {
      return localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? '';
    } catch {
      return '';
    }
  }

  private saveRememberedUsername(username: string): void {
    try {
      if (this.rememberUser) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }
    } catch {
      // Si el almacenamiento no está disponible, el login sigue funcionando.
    }
  }
}
