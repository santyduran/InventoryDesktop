
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { brandFullName, getAppConfig } from '../../../core/config/app-config';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './setup.html',
  styleUrl: './setup.scss',
})
export class Setup implements OnInit {
  readonly brand = getAppConfig().brand;
  readonly brandName = brandFullName();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  fullName = '';
  username = '';
  password = '';
  confirmPassword = '';
  setupToken = '';
  /** Señal: la respuesta llega fuera de la detección de cambios. */
  readonly requiresSetupToken = signal(false);

  showPassword = false;
  showConfirmPassword = false;

  // Señales: las respuestas HTTP llegan fuera de la detección de cambios
  // (la app no usa zone.js), así que la pantalla solo se actualiza con señales.
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly completed = signal(false);

  ngOnInit(): void {
    // Evita realizar peticiones HTTP durante el prerenderizado.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Comprueba si todavía es necesario configurar el administrador.
    this.authService.getSetupStatus().subscribe({
      next: (status) => {
        if (!status.requiresSetup) {
          this.router.navigate(['/login']);
        }

        this.requiresSetupToken.set(!!status.requiresSetupToken);
      },
      error: () => {
        this.errorMessage.set('No se pudo verificar el estado de configuración. Verifica que el backend esté activo.');
      },
    });
  }

  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    const fullName = this.fullName.trim();
    const username = this.username.trim().toLowerCase();

    if (this.requiresSetupToken() && !this.setupToken.trim()) {
      this.errorMessage.set('Escribe el código de instalación.');
      return;
    }

    if (!fullName || !username || !this.password || !this.confirmPassword) {
      this.errorMessage.set('Completa todos los campos obligatorios.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      this.errorMessage.set('El usuario debe ser un correo electrónico, por ejemplo nombre@correo.com.');
      return;
    }

    if (username.length > 50) {
      this.errorMessage.set('El correo no puede superar 50 caracteres.');
      return;
    }

    if (this.password.length < 12) {
      this.errorMessage.set('La contraseña debe tener mínimo 12 caracteres.');
      return;
    }

    if (this.password.length > 128) {
      this.errorMessage.set('La contraseña no puede superar 128 caracteres.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);

    this.authService.setupAdmin({
      fullName,
      username,
      password: this.password,
      setupToken: this.setupToken,
    }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.completed.set(true);
        this.successMessage.set(response.message);
        this.password = '';
        this.confirmPassword = '';
      },
      error: (error) => {
        this.loading.set(false);

        if (error.status === 409) {
          this.errorMessage.set('La configuración inicial ya fue realizada. Inicia sesión.');
        } else if (error.status === 400) {
          const message = error.error?.message;

          this.errorMessage.set(Array.isArray(message)
            ? message.join(' ')
            : message || 'Verifica los datos ingresados.');
        } else if (error.status === 0) {
          this.errorMessage.set('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
        } else {
          this.errorMessage.set(error.error?.message ||
            'Ocurrió un error al crear el administrador.');
        }
      },
    });
  }
}
