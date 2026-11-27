const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

const DEV_SERVER_URL = 'http://127.0.0.1:3000';
const DEFAULT_PORT = 8765;

let controlWindow = null;
let overlayWindow = null;

function preloadOptions() {
  return {
    preload: path.join(__dirname, 'preload.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  };
}

async function loadPage(window, query = {}) {
  if (app.isPackaged) {
    await window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { query });
    return;
  }

  const params = new URLSearchParams(query);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  await window.loadURL(`${DEV_SERVER_URL}/${suffix}`);
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 620,
    height: 760,
    minWidth: 560,
    minHeight: 680,
    title: 'Kabaddi Scoreboard Overlay',
    backgroundColor: '#090b10',
    autoHideMenuBar: true,
    resizable: true,
    show: false,
    webPreferences: preloadOptions(),
  });

  controlWindow.once('ready-to-show', () => controlWindow?.show());
  controlWindow.on('closed', () => {
    controlWindow = null;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }
  });

  loadPage(controlWindow).catch((error) => {
    console.error('Failed to load overlay connection window:', error);
  });
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

ipcMain.handle('overlay:open', async (_event, payload) => {
  const host = typeof payload?.host === 'string' ? payload.host.trim() : '';
  const port = Number(payload?.port);

  if (!isValidHost(host)) {
    return { ok: false, message: 'Enter a valid controller IP address or hostname.' };
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, message: 'Port must be between 1 and 65535.' };
  }

  try {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
      overlayWindow = null;
    }

    const bounds = screen.getPrimaryDisplay().bounds;
    overlayWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      title: 'Kabaddi Scoreboard Overlay',
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      focusable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      webPreferences: preloadOptions(),
    });

    const thisOverlay = overlayWindow;
    thisOverlay.setIgnoreMouseEvents(true, { forward: true });
    thisOverlay.setAlwaysOnTop(true);

    thisOverlay.on('closed', () => {
      if (overlayWindow === thisOverlay) overlayWindow = null;
      if (controlWindow && !controlWindow.isDestroyed()) {
        controlWindow.webContents.send('overlay:status', {
          connected: false,
          message: 'Overlay window closed',
        });
      }
    });

    thisOverlay.webContents.on('did-fail-load', (_event, code, description) => {
      console.error('Overlay page failed to load:', code, description);
    });

    await loadPage(thisOverlay, {
      overlay: '1',
      host,
      port: String(port || DEFAULT_PORT),
    });
    thisOverlay.showInactive();

    return { ok: true };
  } catch (error) {
    console.error('Could not open transparent scoreboard window:', error);
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
    overlayWindow = null;
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not open overlay window.',
    };
  }
});

ipcMain.handle('overlay:close', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
  overlayWindow = null;
  return { ok: true };
});

ipcMain.on('overlay:status', (_event, status) => {
  if (!controlWindow || controlWindow.isDestroyed()) return;
  controlWindow.webContents.send('overlay:status', {
    connected: status?.connected === true,
    message: typeof status?.message === 'string' ? status.message.slice(0, 240) : '',
  });
});

app.whenReady().then(() => {
  app.setAppUserModelId('com.svmedia.kabaddiscoreboardoverlay');
  createControlWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
});
