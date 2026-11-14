# Versión web: instalación para un cliente

Cada cliente tiene **su propio servidor**, con su base de datos y su dominio.
Se usa el mismo código que la versión de escritorio.

```
Internet ──HTTPS──▶ web (Caddy) ──▶ /api ──▶ backend (NestJS + SQLite)
                     │                          │
                     ├─ la aplicación           └─ volumen "datos": base de datos y respaldos
                     └─ marca/ (logo y nombre del cliente)
```

## Requisitos

- Un servidor Linux con Docker y Docker Compose. Alcanza con 1 GB de RAM; un VPS básico sirve.
- Un dominio o subdominio, por ejemplo `inventario.cliente.com`, con un registro DNS **tipo A** que apunte a la IP del servidor.
- Los puertos **80 y 443** abiertos. Caddy los necesita para obtener el certificado HTTPS.

## Instalación

```bash
git clone https://github.com/santyduran/InventoryDesktop.git
cd InventoryDesktop/deploy/web

cp .env.example .env
nano .env        # completar CLIENTE, DOMAIN, JWT_SECRET y SETUP_TOKEN
```

Genera los secretos con:

```bash
openssl rand -hex 48   # JWT_SECRET
openssl rand -hex 12   # SETUP_TOKEN
```

### Marca del cliente

Pon en la carpeta `marca/`:

1. `app-config.json`: copia `app-config.example.json` y cambia el nombre y la descripción.
2. El logo del cliente, preferiblemente `logo.svg`. Puede ser `logo.png`; en ese caso cambia la ruta en `app-config.json`.

No hace falta volver a compilar para cambiar la marca: basta con recargar la página.

### Arrancar

```bash
docker compose up -d --build
docker compose logs -f backend     # debe decir "Servidor iniciado"
```

Abre `https://<DOMAIN>`. La primera vez aparece la pantalla **Configuración inicial**:

- Pide el **código de instalación**, que es el `SETUP_TOKEN`. Sin él, nadie más puede crear el administrador.
- Entrégale el código al cliente por un canal privado, o crea tú el administrador y luego entrégale la cuenta.

## Respaldos

- **Automáticos:** uno al día; se guardan los últimos 14.
- **Antes de cada actualización:** se hace un respaldo cuando se aplican migraciones.
- **Manual:** el administrador puede crear y descargar respaldos desde **Administración → Respaldos**.

Los respaldos quedan en el **mismo servidor**. Para protegerte de que el servidor falle, copia los respaldos a otro lugar con regularidad:

```bash
docker compose cp backend:/data/backups ./respaldos-$(date +%F)
```

### Restaurar un respaldo

```bash
docker compose stop backend
docker compose cp ./inventario-AAAAMMDD-HHMMSS-manual.db backend:/data/inventario.db
docker compose start backend
```

## Actualizar a una versión nueva

```bash
git pull
docker compose up -d --build
```

Al arrancar, el backend aplica solo las migraciones pendientes y antes hace un respaldo.

## Variables (`.env`)

| Variable | Para qué |
|---|---|
| `CLIENTE` | Nombre corto. Identifica los contenedores y volúmenes |
| `DOMAIN` | Dominio público. Caddy obtiene el certificado HTTPS |
| `JWT_SECRET` | Firma las sesiones. Si se cambia, todos deben volver a iniciar sesión |
| `SETUP_TOKEN` | Código para crear el primer administrador |
| `JWT_EXPIRES_IN` | Duración de la sesión. Por defecto `12h` |
| `APP_CONFIG_PATH` | Configuración de marca: `/marca/app-config.json` |
| `HTTP_PORT` / `HTTPS_PORT` | Puertos publicados. Por defecto 80 y 443 |

## Seguridad incluida

- HTTPS automático con renovación del certificado y cabeceras de seguridad (HSTS, no-iframe).
- Límite de intentos de inicio de sesión: 5 fallos por cuenta o 20 por IP bloquean durante 15 minutos.
- El primer administrador solo se crea con el código de instalación.
- El backend no se expone directamente: solo es accesible a través de Caddy.

## Probar en local

```bash
cp .env.example .env
# DOMAIN=localhost, HTTP_PORT=8080, HTTPS_PORT=8443 y secretos cualquiera
docker compose up -d --build
```

Abre `https://localhost:8443`. El navegador avisará del certificado local; acepta el aviso.

Para borrar todo, incluidos los datos:

```bash
docker compose down -v
```
