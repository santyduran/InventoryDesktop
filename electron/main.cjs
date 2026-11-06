
const { app, BrowserWindow, dialog } = require('electron');

const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

let mainWindow;
let staticServer;
let backendProcess;

const PORT = 3000;
const HOST = '127.0.0.1';

// En producción se utiliza el Node.js incluido en el instalador.
// En desarrollo se conserva la ruta de Node.js del equipo.
const NODE_EXECUTABLE = app.isPackaged
  ? path.join(process.resourcesPath, 'node', 'node.exe')
  : (
      process.env.INVENTORY_NODE_PATH ||
      'C:\\nvm4w\\nodejs\\node.exe'
    );

const isProductionPreview = () =>
  app.isPackaged || process.env.ELECTRON_LOAD_PRODUCTION === '1';

function getBackendPaths() {
  if (app.isPackaged) {
    const directory = path.join(process.resourcesPath, 'backend');

    return {
      directory,
      entry: path.join(directory, 'dist', 'main.js'),
    };
  }

  const directory = path.resolve(__dirname, '..', 'backend');

  return {
    directory,
    entry: path.join(directory, 'dist', 'main.js'),
  };
}

function getProductionPaths() {
  const applicationDirectory = path.join(
    app.getPath('appData'),
    'InventoryDesktop',
  );

  const dataDirectory = path.join(applicationDirectory, 'data');
  const configDirectory = path.join(applicationDirectory, 'config');

  return {
    applicationDirectory,
    dataDirectory,
    configDirectory,
    database: path.join(dataDirectory, 'inventory.db'),
    jwtSecret: path.join(configDirectory, 'jwt-secret'),
  };
}

function prepareProductionEnvironment() {
  const paths = getProductionPaths();

  fs.mkdirSync(paths.dataDirectory, { recursive: true });
  fs.mkdirSync(paths.configDirectory, { recursive: true });

  // Crear la base de datos únicamente en una instalación nueva.
  // Nunca sobrescribir una base de datos que ya tenga información.
  if (!fs.existsSync(paths.database)) {
    const templateDatabase = app.isPackaged
      ? path.join(
          process.resourcesPath,
          'database-template',
          'inventory.db',
        )
      : path.resolve(
          __dirname,
          '..',
          'release',
          'database-template',
          'inventory.db',
        );

    if (!fs.existsSync(templateDatabase)) {
      throw new Error(
        `No se encontró la plantilla inicial de la base de datos: ${templateDatabase}`,
      );
    }

    fs.copyFileSync(templateDatabase, paths.database);

    console.log('Base de datos inicial creada correctamente.');
  } else {
    console.log('Se conservará la base de datos existente.');
  }

  let jwtSecret;

  if (fs.existsSync(paths.jwtSecret)) {
    jwtSecret = fs.readFileSync(paths.jwtSecret, 'utf8').trim();
  } else {
    jwtSecret = crypto.randomBytes(48).toString('hex');

    try {
      fs.writeFileSync(paths.jwtSecret, jwtSecret, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }

      jwtSecret = fs.readFileSync(paths.jwtSecret, 'utf8').trim();
    }
  }

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('El secreto JWT de producción no es válido.');
  }

  return {
    ...paths,
    jwtSecret,
    databaseUrl: `file:${paths.database.replace(/\\/g, '/')}`,
  };
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const backend = getBackendPaths();

    if (!fs.existsSync(backend.entry)) {
      reject(
        new Error(
          `No se encontró el backend compilado: ${backend.entry}`,
        ),
      );
      return;
    }

    if (!fs.existsSync(NODE_EXECUTABLE)) {
      reject(
        new Error(
          `No se encontró Node.js en: ${NODE_EXECUTABLE}`,
        ),
      );
      return;
    }

    let production;

    try {
      production = prepareProductionEnvironment();
    } catch (error) {
      reject(error);
      return;
    }

    const environment = {
      ...process.env,
      DATABASE_URL: production.databaseUrl,
      JWT_SECRET: production.jwtSecret,
      PORT: String(PORT),
    };

    delete environment.ELECTRON_LOAD_PRODUCTION;
    delete environment.ELECTRON_RUN_AS_NODE;

    console.log('Iniciando backend de InventoryDesktop...');
    console.log(`Node.js: ${NODE_EXECUTABLE}`);
    console.log(`Backend: ${backend.entry}`);
    console.log(`Base de datos: ${production.database}`);

    backendProcess = spawn(
      NODE_EXECUTABLE,
      [backend.entry],
      {
        cwd: backend.directory,
        env: environment,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const currentProcess = backendProcess;

    currentProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    currentProcess.stderr.on('data', (data) => {
      console.error(`[Backend] ${data.toString().trim()}`);
    });

    currentProcess.once('error', (error) => {
      reject(
        new Error(`No se pudo iniciar el backend: ${error.message}`),
      );
    });

    currentProcess.once('exit', (code, signal) => {
      console.log(
        `Proceso backend finalizado. Código: ${code}; señal: ${signal}`,
      );
    });

    waitForBackend(currentProcess)
      .then(resolve)
      .catch(reject);
  });
}

function waitForBackend(processInstance) {
  return new Promise((resolve, reject) => {
    const timeout = Date.now() + 20000;
    let settled = false;

    function finish(error) {
      if (settled) return;
      settled = true;

      if (error) reject(error);
      else resolve();
    }

    function check() {
      if (backendProcess !== processInstance) {
        finish(new Error('El proceso del backend fue reemplazado.'));
        return;
      }

      if (processInstance.exitCode !== null) {
        finish(
          new Error(
            `El backend se cerró antes de estar disponible. Código: ${processInstance.exitCode}`,
          ),
        );
        return;
      }

      const request = http.get(
        `http://${HOST}:${PORT}/`,
        (response) => {
          response.resume();

          if (response.statusCode < 500) {
            console.log('Backend disponible.');
            finish();
          } else {
            retry();
          }
        },
      );

      request.setTimeout(2000, () => {
        request.destroy();
      });

      request.on('error', retry);

      function retry() {
        if (settled) return;

        if (Date.now() >= timeout) {
          finish(
            new Error(
              'El backend no respondió dentro del tiempo esperado.',
            ),
          );
          return;
        }

        setTimeout(check, 400);
      }
    }

    check();
  });
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const browserFolder = app.isPackaged
      ? path.join(process.resourcesPath, 'frontend', 'browser')
      : path.resolve(
          __dirname,
          '..',
          'frontend',
          'dist',
          'frontend',
          'browser',
        );

    const indexFile = path.join(browserFolder, 'index.csr.html');

    if (!fs.existsSync(indexFile)) {
      reject(
        new Error(`No se encontró el archivo: ${indexFile}`),
      );
      return;
    }

    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };

    staticServer = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(
          req.url || '/',
          `http://${HOST}`,
        );

        const pathname = decodeURIComponent(requestUrl.pathname);

        const requestedFile = path.resolve(
          browserFolder,
          `.${pathname}`,
        );

        if (
          requestedFile !== browserFolder &&
          !requestedFile.startsWith(browserFolder + path.sep)
        ) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        let filePath = requestedFile;

        if (
          fs.existsSync(filePath) &&
          fs.statSync(filePath).isDirectory()
        ) {
          filePath = path.join(filePath, 'index.html');

          if (!fs.existsSync(filePath)) {
            filePath = indexFile;
          }
        } else if (!fs.existsSync(filePath)) {
          if (path.extname(pathname)) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }

          filePath = indexFile;
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType =
          mimeTypes[extension] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
          if (error) {
            res.writeHead(500);
            res.end('Internal server error');
            return;
          }

          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
          });

          if (req.method === 'HEAD') {
            res.end();
            return;
          }

          res.end(content);
        });
      } catch {
        res.writeHead(400);
        res.end('Bad request');
      }
    });

    staticServer.once('error', reject);

    staticServer.listen(0, HOST, () => {
      const address = staticServer.address();

      if (!address || typeof address === 'string') {
        reject(new Error('No se pudo iniciar el servidor local.'));
        return;
      }

      resolve(`http://${HOST}:${address.port}`);
    });
  });
}

function stopBackend() {
  if (backendProcess) {
    console.log('Cerrando backend...');

    backendProcess.kill();
    backendProcess = null;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    title: 'InventoryDesktop',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (isProductionPreview()) {
    const localUrl = await startStaticServer();
    await mainWindow.loadURL(localUrl);
  } else {
    await mainWindow.loadURL('http://127.0.0.1:4200');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    if (isProductionPreview()) {
      await startBackend();
    }

    await createWindow();
  } catch (error) {
    console.error('Error al iniciar InventoryDesktop:', error);

    dialog.showErrorBox(
      'Error al iniciar InventoryDesktop',
      error.message || String(error),
    );

    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) => {
        console.error('Error al crear la ventana:', error);
      });
    }
  });
});

app.on('before-quit', () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }

  stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
