#!/usr/bin/env node
// Genera el instalador de Windows (release/installer/InventoryDesktop-Setup-<versión>.exe).
// Funciona desde Windows, macOS o Linux: los módulos nativos se descargan ya
// compilados para Windows x64, así que no hace falta Visual Studio ni Wine.
//
//   npm run build:win
//
// Pasos:
//   1. Compila el frontend (Angular) y el backend (NestJS + Prisma).
//   2. Arma release/backend con dist, migraciones y dependencias de producción.
//   3. Cambia los binarios nativos (better-sqlite3) por los de Windows x64.
//   4. Descarga node.exe (la misma versión de .nvmrc) si no está.
//   5. Ejecuta electron-builder para crear el instalador NSIS.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(root, 'backend');
const frontendDir = path.join(root, 'frontend');
const releaseBackend = path.join(root, 'release', 'backend');
const nodeExe = path.join(root, 'electron', 'runtime', 'node', 'node.exe');

const NODE_VERSION = (process.env.INVENTORY_NODE_VERSION || readNvmrc() || process.versions.node).replace(/^v/, '');

function readNvmrc() {
  const file = path.join(root, '.nvmrc');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
}

function run(command, cwd = root, extraEnv = {}) {
  console.log(`\n> ${command}  (${path.relative(root, cwd) || '.'})`);
  execSync(command, { cwd, stdio: 'inherit', env: { ...process.env, ...extraEnv } });
}

function step(title) {
  console.log(`\n=== ${title} ===`);
}

// 1. Compilar
step('1/5 Compilando frontend');
run('npm run build', frontendDir);

step('1/5 Compilando backend');
// prisma generate no se conecta a la base de datos; solo necesita una URL válida.
run('npx prisma generate', backendDir, { DATABASE_URL: 'file:./build.db' });
run('npm run build', backendDir);

// 2. Armar release/backend
step('2/5 Armando release/backend');
fs.rmSync(releaseBackend, { recursive: true, force: true });
fs.mkdirSync(releaseBackend, { recursive: true });
fs.cpSync(path.join(backendDir, 'dist'), path.join(releaseBackend, 'dist'), { recursive: true });
fs.cpSync(path.join(backendDir, 'prisma', 'migrations'), path.join(releaseBackend, 'prisma', 'migrations'), { recursive: true });
for (const file of ['package.json', 'package-lock.json']) {
  fs.copyFileSync(path.join(backendDir, file), path.join(releaseBackend, file));
}
// --ignore-scripts: evita compilar módulos nativos para el sistema actual.
run('npm ci --omit=dev --ignore-scripts --no-audit --no-fund', releaseBackend);

// 3. Binarios nativos para Windows
step('3/5 Descargando binarios nativos de Windows x64');
const sqliteDir = path.join(releaseBackend, 'node_modules', 'better-sqlite3');
fs.rmSync(path.join(sqliteDir, 'build'), { recursive: true, force: true });
run(
  `npx --yes prebuild-install --runtime node --target ${NODE_VERSION} --platform win32 --arch x64`,
  sqliteDir,
);
const sqliteBinary = path.join(sqliteDir, 'build', 'Release', 'better_sqlite3.node');
if (!fs.existsSync(sqliteBinary)) {
  throw new Error(`No se descargó el binario de better-sqlite3: ${sqliteBinary}`);
}
// argon2 ya trae sus binarios de Windows en prebuilds/win32-x64.
const argonPrebuild = path.join(releaseBackend, 'node_modules', 'argon2', 'prebuilds', 'win32-x64');
if (!fs.existsSync(argonPrebuild)) {
  throw new Error(`Falta el binario de Windows de argon2: ${argonPrebuild}`);
}

// 4. node.exe
step(`4/5 Node.js ${NODE_VERSION} para Windows`);
const versionFile = `${nodeExe}.version`;
const currentVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : '';
if (fs.existsSync(nodeExe) && currentVersion === NODE_VERSION) {
  console.log('node.exe ya está descargado.');
} else {
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/win-x64/node.exe`;
  console.log(`Descargando ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar node.exe (${response.status})`);
  fs.mkdirSync(path.dirname(nodeExe), { recursive: true });
  fs.writeFileSync(nodeExe, Buffer.from(await response.arrayBuffer()));
  fs.writeFileSync(versionFile, NODE_VERSION);
}

// 5. Instalador
step('5/5 Creando instalador');
// Fuera de Windows no se puede editar el .exe (necesitaría Wine): se omite.
const noEdit = process.platform === 'win32' ? '' : ' -c.win.signAndEditExecutable=false';
run(`npx electron-builder --win nsis --x64${noEdit}`);

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
console.log(`\nListo: release/installer/InventoryDesktop-Setup-${version}.exe`);
