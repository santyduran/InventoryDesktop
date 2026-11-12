
import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'setup',
    loadComponent: () =>
      import('./features/auth/setup/setup').then(
        (module) => module.Setup,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(
        (module) => module.Login,
      ),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(
            (module) => module.Dashboard,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products').then(
            (module) => module.Products,
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/categories').then(
            (module) => module.Categories,
          ),
      },
      {
        path: 'providers',
        loadComponent: () =>
          import('./features/providers/providers').then(
            (module) => module.Providers,
          ),
      },
      {
        path: 'inventory-movements',
        loadComponent: () =>
          import('./features/inventory-movements/inventory-movements').then(
            (module) => module.InventoryMovements,
          ),
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/users').then(
            (module) => module.Users,
          ),
      },
      {
        path: 'backups',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/backups/backups').then(
            (module) => module.Backups,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
