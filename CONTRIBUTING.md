# Cómo trabajar en el repositorio

Este proyecto usa **Git Flow**.

## Ramas

| Rama | Para qué sirve | Quién escribe en ella |
|---|---|---|
| `main` | La versión instalada en el taller. Cada commit es una versión publicada y lleva su etiqueta (`v1.0.0`, `v1.1.0`…). | Solo merges de `release/*` y `hotfix/*` |
| `develop` | La próxima versión, en desarrollo. | Merges de `feature/*` y `bugfix/*` |
| `feature/<nombre>` | Una funcionalidad nueva (`feature/ventas`). Sale de `develop` y vuelve a `develop`. | Quien la desarrolla |
| `bugfix/<nombre>` | Un arreglo de algo que aún no se ha publicado. Sale de `develop` y vuelve a `develop`. | Quien lo arregla |
| `release/<versión>` | Preparar una versión (`release/1.1.0`): número de versión, pruebas e instalador. Sale de `develop` y va a `main` **y** a `develop`. | Quien publica |
| `hotfix/<versión>` | Arreglo urgente de la versión instalada (`hotfix/1.0.1`). Sale de `main` y va a `main` **y** a `develop`. | Quien lo arregla |

Nunca se hace commit directo en `main` ni en `develop`.

## Flujo diario

### Nueva funcionalidad

```bash
git switch develop && git pull
git switch -c feature/ventas
# ...commits...
git push -u origin feature/ventas
gh pr create --base develop
```

Con la extensión instalada (`brew install git-flow-avh`) es equivalente a
`git flow feature start ventas` y `git flow feature finish ventas`.

### Publicar una versión

```bash
git switch develop && git pull
git switch -c release/1.1.0
# subir la versión en package.json, probar y generar el instalador
git switch main && git merge --no-ff release/1.1.0
git tag -a v1.1.0 -m "Versión 1.1.0"
git switch develop && git merge --no-ff release/1.1.0
git branch -d release/1.1.0
git push origin main develop v1.1.0
```

Luego se crea el *release* en GitHub con el instalador adjunto.

### Arreglo urgente en producción

```bash
git switch main && git pull
git switch -c hotfix/1.0.1
# ...arreglo y versión 1.0.1 en package.json...
git switch main && git merge --no-ff hotfix/1.0.1 && git tag -a v1.0.1 -m "Versión 1.0.1"
git switch develop && git merge --no-ff hotfix/1.0.1
git push origin main develop v1.0.1
```

## Mensajes de commit

En español, con el formato `tipo(área): descripción`:

- `feat`: funcionalidad nueva
- `fix`: corrección
- `docs`: documentación
- `refactor`: cambio interno sin cambio de comportamiento
- `test`: pruebas
- `chore`: mantenimiento (dependencias, configuración)

Ejemplo: `feat(ventas): registrar ventas con descuento de inventario`.

## Versiones

Se usa versionado semántico (`MAYOR.MENOR.PARCHE`):

- **MENOR** para funcionalidades nuevas.
- **PARCHE** para arreglos.
- **MAYOR** si una actualización obliga a cambiar la forma de trabajar.

## Datos sensibles

El repositorio es **público**. Nunca se suben:

- contraseñas;
- archivos `.env`;
- bases de datos (`*.db`);
- respaldos;
- archivos `*.local.md`.
