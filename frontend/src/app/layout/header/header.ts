
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

const SECTION_TITLES: Record<string, string> = {
  dashboard: 'Panel de control',
  products: 'Productos',
  categories: 'Categorías',
  providers: 'Proveedores',
  'inventory-movements': 'Movimientos',
  users: 'Usuarios',
  backups: 'Respaldos',
};

function titleFor(url: string): string {
  const section = url.split(/[?#]/)[0].split('/').find(Boolean) ?? 'dashboard';

  return SECTION_TITLES[section] ?? 'Panel de control';
}

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Título de la sección actual, según la ruta. */
  readonly title = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => titleFor(event.urlAfterRedirects)),
      startWith(titleFor(this.router.url)),
    ),
    { initialValue: 'Panel de control' },
  );

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
