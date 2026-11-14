import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { brandFullName, loadAppConfig } from './app/core/config/app-config';

// La configuración (API y marca) se carga antes de arrancar la aplicación.
loadAppConfig()
  .then(() => {
    document.title = brandFullName();
    return bootstrapApplication(App, appConfig);
  })
  .catch((err) => console.error(err));
