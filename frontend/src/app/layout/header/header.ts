
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  get userName(): string {
    return this.authService.getUser()?.fullName ?? 'Usuario';
  }

  get userRole(): string {
    const role = this.authService.getUser()?.role;

    return role === 'ADMIN' ? 'Administrador' : 'Operador';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
