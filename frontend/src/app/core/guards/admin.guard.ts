import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Rutas de administración: solo para usuarios con rol ADMIN. */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getUser()?.role === 'ADMIN'
    ? true
    : router.createUrlTree(['/dashboard']);
};
