const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, clipboard } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PREFERRED_PORT = 3210;
const LAST_PORT = 3230;
const TRAY_ICON_PNG = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB4ElEQVR4nOWXz2vTYBjHP0kL9rKLquiYmxsT/wZBdhp0pWHFsI4VhYmn/R0exnCCm+winoZbOhZb2/1CFLx6cHguevDkwbE2TQr1MBrabHFrurwr+IVc8obn8+Ehyfu8UqgnWucCE3RbuJ8tnSvoa/zmifclZwfOG3yaSItAM9zN2Gvcassi4M6azSz5Xw/6KdEi0DDyE+6UaDCPdUB0ul9AScap/PllX6HQJXtNkiQWF57bawe/f6Ik420JuP6ITossy7x6Oc+UOgmAZVmkM0/Jbuj+CwQCAVaWXzCpJAAwTQs1/Rg9V2i7VtsCwUCQlaVFEhPjABhGlZQ6Q2Frt224J4G3b14z9vABAJWKgZKaZmfvoye4J4EG/LBcZiKp8unzF89w6OAzLJV+8G3/e0dwTwL1+tHeNXx3kA/6GuHwZbECs8/mqNVqANwbHaHwfp1I5Io4gdV3GunMrC0xMjxEMacRjV4VIwCgZXUepZ9gmhYAQ4MDFHMavb3XxAgAbOp5UuoM1aoJwJ2BfrbyGrFYnxgBgHxhGyU1jWFUAei/fYtiTuPG9diZa0ihnmhd5DwArfNH92/H/4eAc07zM8737VgH/JQ4qbYt4Da3+wFvZnXX0cxPkTMfTkXnL0gTs9aFmNKeAAAAAElFTkSuQmCC';

let controlWindow = null;
let tray = null;
let localServer = null;
let localPort = null;
let isQuitting = false;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function getDistDirectory() {
  return path.join(app.getAppPath(), 'dist');
}

function createLocalServer() {
  const distDirectory = path.resolve(getDistDirectory());

  return http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    } catch {
      response.writeHead(400);
      response.end('Bad request');
      return;
    }

    if (pathname === '/api/health') {
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(JSON.stringify({ ok: true, service: 'kabaddi-scoreboard-overlay' }));
      return;
    }

    const relativePath =
      pathname === '/' || pathname === '/overlay' || pathname === '/overlay/'
        ? 'index.html'
        : pathname.replace(/^\/+/, '');

    const targetPath = path.resolve(distDirectory, relativePath);
    if (targetPath !== distDirectory && !targetPath.startsWith(distDirectory + path.sep)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    fs.readFile(targetPath, (error, contents) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        response.end(error.code === 'ENOENT' ? 'Not found' : 'Unable to read overlay file');
        return;
      }

      const extension = path.extname(targetPath).toLowerCase();
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
        'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      });
      response.end(contents);
    });
  });
}

function listenOnPort(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.removeListener('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.removeListener('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

async function ensureLocalServer() {
  if (localServer?.listening && localPort) return localPort;

  const distIndex = path.join(getDistDirectory(), 'index.html');
  if (!fs.existsSync(distIndex)) {
    throw new Error('Overlay files are missing. Reinstall the application or rebuild it.');
  }

  let lastError = null;
  for (let port = PREFERRED_PORT; port <= LAST_PORT; port += 1) {
    const candidate = createLocalServer();
    try {
      await listenOnPort(candidate, port);
      localServer = candidate;
      localPort = port;
      localServer.on('error', (error) => {
        console.error('Local overlay server error:', error);
      });
      return localPort;
    } catch (error) {
      lastError = error;
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }

  throw new Error(
    `Could not start the local overlay server on ports ${PREFERRED_PORT}-${LAST_PORT}. ${lastError?.message || ''}`,
  );
}

function stopLocalServer() {
  if (localServer) {
    localServer.close();
    localServer = null;
    localPort = null;
  }
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 620,
    height: 790,
    minWidth: 560,
    minHeight: 700,
    title: 'Kabaddi Scoreboard Overlay',
    backgroundColor: '#090b10',
    autoHideMenuBar: true,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  controlWindow.once('ready-to-show', () => controlWindow?.show());
  controlWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      controlWindow?.hide();
    }
  });
  controlWindow.on('closed', () => {
    controlWindow = null;
  });

  const page = app.isPackaged
    ? controlWindow.loadFile(path.join(getDistDirectory(), 'index.html'))
    : controlWindow.loadURL('http://127.0.0.1:3000/');

  page.catch((error) => {
    console.error('Failed to load overlay setup window:', error);
  });
}

function showControlWindow() {
  if (!controlWindow || controlWindow.isDestroyed()) {
    createControlWindow();
    return;
  }
  if (controlWindow.isMinimized()) controlWindow.restore();
  controlWindow.show();
  controlWindow.focus();
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    `data:image/png;base64,${TRAY_ICON_PNG}`,
  );
  tray = new Tray(icon);
  tray.setToolTip('Kabaddi Scoreboard Overlay — running in background');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open connection settings', click: showControlWindow },
      { type: 'separator' },
      {
        label: 'Stop overlay server',
        click: () => {
          stopLocalServer();
          if (controlWindow && !controlWindow.isDestroyed()) {
            controlWindow.webContents.send('overlay:server-stopped');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('double-click', showControlWindow);
  tray.on('click', showControlWindow);
}

function isValidHost(host) {
  return (
    typeof host === 'string' &&
    host.length > 0 &&
    host.length <= 253 &&
    /^[a-zA-Z0-9.-]+$/.test(host) &&
    !host.includes('..')
  );
}

ipcMain.handle('overlay:start-server', async (_event, payload) => {
  const host = typeof payload?.host === 'string' ? payload.host.trim() : '';
  const port = Number(payload?.port);

  if (!isValidHost(host)) {
    return { ok: false, message: 'Enter a valid controller IP address or hostname.' };
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, message: 'Port must be between 1 and 65535.' };
  }

  try {
    const serverPort = await ensureLocalServer();
    const sourceUrl = new URL('/overlay', `http://127.0.0.1:${serverPort}`);
    sourceUrl.searchParams.set('overlay', '1');
    sourceUrl.searchParams.set('host', host);
    sourceUrl.searchParams.set('port', String(port));

    if (tray) tray.setToolTip('Kabaddi Scoreboard Overlay — OBS source ready');
    return {
      ok: true,
      url: sourceUrl.toString(),
      serverPort,
      message: 'Local overlay server is running. Add the URL as an OBS Browser Source.',
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not start local overlay server.',
    };
  }
});

ipcMain.handle('overlay:stop-server', () => {
  stopLocalServer();
  if (tray) tray.setToolTip('Kabaddi Scoreboard Overlay — stopped');
  return { ok: true };
});

ipcMain.handle('app:copy-text', (_event, value) => {
  if (typeof value !== 'string') return { ok: false };
  clipboard.writeText(value);
  return { ok: true };
});

app.whenReady().then(() => {
  app.setAppUserModelId('com.svmedia.kabaddiscoreboardoverlay');
  createTray();
  createControlWindow();

  app.on('activate', showControlWindow);
});

app.on('window-all-closed', () => {
  // Keep the local Browser Source server alive while the app is in the tray.
});

app.on('before-quit', () => {
  isQuitting = true;
  stopLocalServer();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
