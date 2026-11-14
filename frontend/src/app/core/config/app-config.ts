/**
 * Configuración que cambia entre instalaciones (escritorio o web, y cada
 * cliente): dónde está la API y la marca del negocio.
 *
 * Se lee de `app-config.json` al arrancar, así que una instalación web puede
 * usar su propio archivo sin volver a compilar el frontend.
 */
export interface BrandConfig {
  /** Nombre del negocio, por ejemplo "El Marino". */
  name: string;
  /** Descripción corta, por ejemplo "Taller de Motos". */
  tagline: string;
  /** Ruta del logo, relativa a la raíz del sitio. */
  logo: string;
}

export interface AppConfig {
  /** URL base de la API: absoluta en escritorio, "/api" detrás de un proxy web. */
  apiUrl: string;
  brand: BrandConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  apiUrl: 'http://127.0.0.1:3000',
  brand: {
    name: 'El Marino',
    tagline: 'Taller de Motos',
    logo: 'logo-el-marino.svg',
  },
};

let current: AppConfig = DEFAULT_CONFIG;

export function getAppConfig(): AppConfig {
  return current;
}

/** "El Marino · Taller de Motos" */
export function brandFullName(brand: BrandConfig = current.brand): string {
  return brand.tagline ? `${brand.name} · ${brand.tagline}` : brand.name;
}

/** Carga `app-config.json`; si falta o no es válido, usa la configuración por defecto. */
export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('app-config.json', { cache: 'no-cache' });

    if (response.ok) {
      const data = (await response.json()) as Partial<AppConfig>;

      current = {
        apiUrl: (data.apiUrl || DEFAULT_CONFIG.apiUrl).replace(/\/+$/, ''),
        brand: { ...DEFAULT_CONFIG.brand, ...data.brand },
      };
    }
  } catch {
    console.warn('No se pudo leer app-config.json; se usa la configuración por defecto.');
  }

  return current;
}
