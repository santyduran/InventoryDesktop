import { RenderMode, ServerRoute } from '@angular/ssr';

// Toda la aplicación requiere sesión y vive en el navegador (o en Electron):
// se renderiza en el cliente. Prerenderizar guardaba las rutas protegidas con
// la pantalla de login dentro, y al recargar la página se volvía al login.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
