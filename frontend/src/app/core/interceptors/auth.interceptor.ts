import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      // Si la sesión venció o el usuario fue desactivado, se cierra la sesión
      // y se vuelve al login. Un 401 del propio login (clave incorrecta) no
      // lleva token, así que no entra aquí.
      if (
        token &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        authService.logout();
        void router.navigate(['/login'], {
          queryParams: { reason: 'session-expired' },
        });
      }

      return throwError(() => error);
    }),
  );
};
