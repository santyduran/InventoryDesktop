
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './setup.html',
  styleUrl: './setup.scss',
})
export class Setup implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  fullName = '';
  username = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirmPassword = false;

  loading = false;
  errorMessage = '';
  successMessage = '';
  completed = false;

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
      },
      error: () => {
        this.errorMessage =
          'No se pudo verificar el estado de configuración. Verifica que el backend esté activo.';
      },
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const fullName = this.fullName.trim();
    const username = this.username.trim().toLowerCase();

    if (!fullName || !username || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Completa todos los campos obligatorios.';
      return;
    }

    if (this.password.length < 12) {
      this.errorMessage = 'La contraseña debe tener mínimo 12 caracteres.';
      return;
    }

    if (this.password.length > 128) {
      this.errorMessage = 'La contraseña no puede superar 128 caracteres.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;

    this.authService.setupAdmin({
      fullName,
      username,
      password: this.password,
    }).subscribe({
      next: (response) => {
        this.loading = false;
        this.completed = true;
        this.successMessage = response.message;
        this.password = '';
        this.confirmPassword = '';
      },
      error: (error) => {
        this.loading = false;

        if (error.status === 409) {
          this.errorMessage =
            'La configuración inicial ya fue realizada. Inicia sesión.';
        } else if (error.status === 400) {
          const message = error.error?.message;

          this.errorMessage = Array.isArray(message)
            ? message.join(' ')
            : message || 'Verifica los datos ingresados.';
        } else if (error.status === 0) {
          this.errorMessage =
            'No se pudo conectar con el servidor. Verifica que el backend esté activo.';
        } else {
          this.errorMessage =
            error.error?.message ||
            'Ocurrió un error al crear el administrador.';
        }
      },
    });
  }
}
