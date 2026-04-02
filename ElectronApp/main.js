const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  clipboard,
  Menu,
  Tray,
  nativeImage,
} = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;
let tray = null;
let audioHealthCheckInterval = null;

function resolveServerCwd() {
  if (app.isPackaged) {
    return path.resolve(process.resourcesPath, 'NigredoServer');
  }

  return path.resolve(__dirname, '..', 'NigredoServer');
}

const SERVER_CWD = resolveServerCwd();
const SERVER_ENTRY = path.resolve(SERVER_CWD, 'app.js');
const LOG_FOLDER = path.resolve(SERVER_CWD, 'output');

const DEFAULT_SETTINGS = {
  baseHost: 'localhost',
  port: 3000,
  envFilePath: path.resolve(SERVER_CWD, '.env'),
  userCredsPath: path.resolve(SERVER_CWD, 'user-creds.json'),
  obsAudioOwnerMode: true,
  obsAutoOpenFullOnStart: false,
  obsShowSizeHints: true,
  audioMode: 'auto', // 'auto' | 'obs-only' | 'electron-only'
};

const ROUTE_PATHS = {
  full: '/full',
  chat: '/chat',
  alerts: '/alerts',
  redemptions: '/redemptions',
  audioManager: '/audio-manager',
  auth: '/auth',
};

let settingsPath = '';
let settings = { ...DEFAULT_SETTINGS };

const state = {
  serverStatus: 'stopped', // stopped | starting | running | stopping | error
  serverManagedByApp: false,
  lastError: '',
  diagnostics: [],
  settings,
  settingsRestartRequired: false,
  audioHealthy: false, // health check for /audio-manager
  audioPathActive: 'none', // 'obs' | 'electron' | 'none'
  lastAudioHealthCheck: null,
};

function getServerPort() {
  return String(settings.port);
}

function getServerBaseUrl() {
  return `http://${settings.baseHost}:${settings.port}`;
}

function getRouteUrl(routePath) {
  return `${getServerBaseUrl()}${routePath}`;
}

function getRoutes() {
  return {
    full: getRouteUrl(ROUTE_PATHS.full),
    chat: getRouteUrl(ROUTE_PATHS.chat),
    alerts: getRouteUrl(ROUTE_PATHS.alerts),
    redemptions: getRouteUrl(ROUTE_PATHS.redemptions),
    audioManager: getRouteUrl(ROUTE_PATHS.audioManager),
    auth: getRouteUrl(ROUTE_PATHS.auth),
  };
}

function sanitizeSettings(raw) {
  const normalized = { ...DEFAULT_SETTINGS, ...raw };

  const parsedPort = Number.parseInt(String(normalized.port), 10);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 3000;

  const baseHost = typeof normalized.baseHost === 'string' && normalized.baseHost.trim()
    ? normalized.baseHost.trim()
    : DEFAULT_SETTINGS.baseHost;

  const envFilePath = typeof normalized.envFilePath === 'string' && normalized.envFilePath.trim()
    ? normalized.envFilePath.trim()
    : DEFAULT_SETTINGS.envFilePath;

  const userCredsPath = typeof normalized.userCredsPath === 'string' && normalized.userCredsPath.trim()
    ? normalized.userCredsPath.trim()
    : DEFAULT_SETTINGS.userCredsPath;

  const audioMode = ['auto', 'obs-only', 'electron-only'].includes(normalized.audioMode)
    ? normalized.audioMode
    : DEFAULT_SETTINGS.audioMode;

  return {
    baseHost,
    port,
    envFilePath,
    userCredsPath,
    obsAudioOwnerMode: Boolean(normalized.obsAudioOwnerMode),
    obsAutoOpenFullOnStart: Boolean(normalized.obsAutoOpenFullOnStart),
    obsShowSizeHints: Boolean(normalized.obsShowSizeHints),
    audioMode,
  };
}

function validateSettingsCandidate(candidate) {
  const errors = [];

  if (typeof candidate.baseHost !== 'string' || !candidate.baseHost.trim()) {
    errors.push('Base Host is required.');
  }

  const parsedPort = Number.parseInt(String(candidate.port), 10);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    errors.push('Port must be an integer between 1 and 65535.');
  }

  if (typeof candidate.envFilePath !== 'string' || !candidate.envFilePath.trim()) {
    errors.push('.env Path is required.');
  }

  if (typeof candidate.userCredsPath !== 'string' || !candidate.userCredsPath.trim()) {
    errors.push('User Creds Path is required.');
  }

  return errors;
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'desktop-settings.json');
}

function loadSettingsFromDisk() {
  try {
    settingsPath = getSettingsPath();
    if (!checkPathExists(settingsPath)) {
      settings = { ...DEFAULT_SETTINGS };
      return;
    }

    const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    settings = sanitizeSettings(raw);
  } catch (error) {
    settings = { ...DEFAULT_SETTINGS };
    state.lastError = `Settings load failed, defaults applied: ${error.message}`;
  }
}

function saveSettingsToDisk(nextSettings) {
  const normalized = sanitizeSettings(nextSettings);
  const filePath = settingsPath || getSettingsPath();

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2), 'utf8');

  settingsPath = filePath;
  settings = normalized;
  return settings;
}

function updateState(patch) {
  state.settings = settings;
  Object.assign(state, patch);
  broadcastState();
  rebuildTrayMenu();
}

function getPublicState() {
  return {
    ...state,
    settings,
    serverUrl: getServerBaseUrl(),
    routes: getRoutes(),
  };
}

function broadcastState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('desktop:state', getPublicState());
  }
}

function log(prefix, chunk) {
  const text = chunk.toString().trim();
  if (text.length > 0) {
    console.log(`[${prefix}] ${text}`);
  }
}

function checkPathExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_) {
    return false;
  }
}

function runStartupDiagnostics() {
  const diagnostics = [];
  const envPath = settings.envFilePath;
  const userCredsPath = settings.userCredsPath;

  if (!checkPathExists(envPath)) {
    diagnostics.push({
      level: 'warning',
      message: `Missing .env at ${envPath}`,
    });
  }

  if (!checkPathExists(userCredsPath)) {
    diagnostics.push({
      level: 'warning',
      message: `Missing user-creds.json at ${userCredsPath}`,
    });
  }

  updateState({ diagnostics });
  return diagnostics;
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(Number(port), '127.0.0.1');
  });
}

async function startServerProcess() {
  if (serverProcess || state.serverStatus === 'starting' || state.serverStatus === 'running') {
    return;
  }

  runStartupDiagnostics();
  updateState({ serverStatus: 'starting', lastError: '' });

  const activePort = getServerPort();
  const portInUse = await isPortInUse(activePort);
  if (portInUse) {
    const message = `Port ${activePort} is already in use. Stop the other process or update settings.`;
    updateState({ serverStatus: 'error', lastError: message, serverManagedByApp: false });
    throw new Error(message);
  }

  serverProcess = spawn(process.execPath, ['-r', 'dotenv/config', SERVER_ENTRY], {
    cwd: SERVER_CWD,
    env: {
      ...process.env,
      ELECTRON_DESKTOP: '1',
      PORT: activePort,
      DOTENV_CONFIG_PATH: settings.envFilePath,
      USER_CREDS_PATH: settings.userCredsPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  updateState({ serverManagedByApp: true });

  serverProcess.stdout.on('data', (chunk) => log('server', chunk));
  serverProcess.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    log('server:error', chunk);

    if (text.includes('EADDRINUSE')) {
      updateState({
        serverStatus: 'error',
        lastError: `Server failed to bind to port ${activePort} (already in use).`,
      });
    }
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[server] exited code=${code} signal=${signal || 'none'}`);
    const wasStopping = state.serverStatus === 'stopping' || isQuitting;
    serverProcess = null;
    stopAudioHealthCheck();

    if (!wasStopping) {
      updateState({
        serverStatus: 'error',
        lastError: `Server exited unexpectedly (code: ${code}, signal: ${signal || 'none'})`,
        serverManagedByApp: false,
      });
      return;
    }

    updateState({ serverStatus: 'stopped', serverManagedByApp: false });
  });

  await waitForServer(getServerBaseUrl());
  updateState({ serverStatus: 'running', lastError: '', settingsRestartRequired: false });

  // Start audio health checks
  startAudioHealthCheck();

  if (settings.obsAutoOpenFullOnStart) {
    shell.openExternal(getRouteUrl(ROUTE_PATHS.full)).catch(() => {
      // Ignore browser launch failures to keep server startup resilient.
    });
  }
}

function probeServer(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });

    req.on('error', reject);
    req.setTimeout(2000, () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

async function waitForServer(url, timeoutMs = 30000, intervalMs = 500) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      await probeServer(url);
      return;
    } catch (_) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

async function stopServerProcess() {
  if (!serverProcess || state.serverStatus === 'stopping') {
    stopAudioHealthCheck();
    updateState({ serverStatus: 'stopped', serverManagedByApp: false });
    return;
  }

  stopAudioHealthCheck();
  updateState({ serverStatus: 'stopping' });

  const proc = serverProcess;

  await new Promise((resolve) => {
    let finished = false;

    const done = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };

    proc.once('exit', done);
    try {
      proc.kill('SIGTERM');
    } catch (_) {
      done();
    }

    setTimeout(() => {
      if (!proc.killed) {
        try {
          proc.kill('SIGKILL');
        } catch (_) {
          // Ignore kill errors during shutdown.
        }
      }
      done();
    }, 5000);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 860,
    minHeight: 580,
    title: 'Twitch Widgets Desktop',
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.resolve(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildTrayIcon() {
  const dataUri =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAQAAAC1QeVaAAAAK0lEQVR42mNgQAP/Gf4zMDCwMDAw+M8w/P//PzMDA8P///8MDAwMDAwAAKPQCT2+TllkAAAAASUVORK5CYII=';
  const icon = nativeImage.createFromDataURL(dataUri);
  icon.setTemplateImage(true);
  return icon;
}

function rebuildTrayMenu() {
  if (!tray) {
    return;
  }

  const menu = Menu.buildFromTemplate([
    { label: `Status: ${state.serverStatus}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Start Server',
      enabled: state.serverStatus === 'stopped' || state.serverStatus === 'error',
      click: () => {
        startServerProcess().catch((error) => {
          updateState({ serverStatus: 'error', lastError: error.message });
        });
      },
    },
    {
      label: 'Stop Server',
      enabled: state.serverStatus === 'running' || state.serverStatus === 'starting',
      click: () => {
        stopServerProcess();
      },
    },
    { type: 'separator' },
    {
      label: 'Open Full Overlay',
      click: () => {
        shell.openExternal(getRouteUrl(ROUTE_PATHS.full));
      },
    },
    {
      label: 'Open Chat Overlay',
      click: () => {
        shell.openExternal(getRouteUrl(ROUTE_PATHS.chat));
      },
    },
    {
      label: 'Open Logs Folder',
      click: () => {
        shell.openPath(LOG_FOLDER);
      },
    },
    { type: 'separator' },
    {
      label: 'Show Control Window',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          createMainWindow();
        }
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Quit',
      click: async () => {
        isQuitting = true;
        await stopServerProcess();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

function createTray() {
  tray = new Tray(buildTrayIcon());
  tray.setToolTip('Twitch Widgets Desktop');
  rebuildTrayMenu();

  tray.on('double-click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow();
    }
    mainWindow.show();
    mainWindow.focus();
  });
}

/**
 * Audio Health Check System
 * Monitors /audio-manager route availability and implements failover logic
 */
async function checkAudioHealth() {
  if (state.serverStatus !== 'running') {
    return;
  }

  const audioUrl = getRouteUrl(ROUTE_PATHS.audioManager);
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get(audioUrl, { timeout: 3000 }, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 304);
      });
      req.on('error', reject);
      req.on('timeout', () => req.abort());
    });

    const isHealthy = response === true;
    const wasUnhealthy = !state.audioHealthy;

    if (isHealthy) {
      if (wasUnhealthy) {
        console.log('[audio] /audio-manager route is now healthy');
      }

      // Determine which audio path is active based on mode and health
      let audioPathActive = 'none';
      if (settings.audioMode === 'obs-only' || settings.audioMode === 'auto') {
        audioPathActive = 'obs';
      }

      updateState({
        audioHealthy: true,
        audioPathActive,
        lastAudioHealthCheck: new Date().toISOString(),
      });
    } else {
      throw new Error('Invalid response from audio-manager endpoint');
    }
  } catch (error) {
    console.warn(`[audio] Health check failed: ${error.message}`);

    // Handle failover based on audio mode setting
    if (settings.audioMode === 'auto' && state.audioHealthy) {
      console.log('[audio] OBS audio-manager unavailable, switching to electron fallback');
      updateState({
        audioHealthy: false,
        audioPathActive: 'electron',
        lastAudioHealthCheck: new Date().toISOString(),
      });
    } else if (settings.audioMode === 'obs-only' && state.audioHealthy) {
      console.warn('[audio] OBS audio-manager unavailable but audio mode is obs-only');
      updateState({
        audioHealthy: false,
        lastAudioHealthCheck: new Date().toISOString(),
      });
    }
  }
}

function startAudioHealthCheck() {
  if (audioHealthCheckInterval) {
    return;
  }

  console.log('[audio] Starting health check interval (every 5 seconds)');
  audioHealthCheckInterval = setInterval(checkAudioHealth, 5000);
  // Run immediately on start
  checkAudioHealth();
}

function stopAudioHealthCheck() {
  if (audioHealthCheckInterval) {
    console.log('[audio] Stopping health check interval');
    clearInterval(audioHealthCheckInterval);
    audioHealthCheckInterval = null;
    updateState({
      audioHealthy: false,
      audioPathActive: 'none',
    });
  }
}

function registerIpcHandlers() {
  ipcMain.handle('desktop:get-state', async () => getPublicState());

  ipcMain.handle('desktop:get-settings', async () => ({ ok: true, settings }));

  ipcMain.handle('desktop:save-settings', async (_, nextSettings) => {
    try {
      const previous = { ...settings };
      const candidate = { ...settings, ...nextSettings };
      const validationErrors = validateSettingsCandidate(candidate);

      if (validationErrors.length > 0) {
        return {
          ok: false,
          error: validationErrors.join('\n'),
          validationErrors,
        };
      }

      const merged = saveSettingsToDisk(candidate);

      const restartRequired =
        state.serverStatus === 'running' &&
        (
          previous.port !== merged.port ||
          previous.baseHost !== merged.baseHost ||
          previous.envFilePath !== merged.envFilePath ||
          previous.userCredsPath !== merged.userCredsPath
        );

      updateState({
        settings: merged,
        settingsRestartRequired: restartRequired,
        lastError: restartRequired
          ? 'Settings saved. Restart server to apply runtime changes.'
          : '',
      });

      runStartupDiagnostics();
      return { ok: true, settings: merged, restartRequired, state: getPublicState() };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('desktop:restart-server', async () => {
    try {
      await stopServerProcess();
      await startServerProcess();
      return { ok: true, state: getPublicState() };
    } catch (error) {
      updateState({
        serverStatus: 'error',
        lastError: `Server restart failed: ${error.message}`,
      });
      return { ok: false, error: error.message, state: getPublicState() };
    }
  });

  ipcMain.handle('desktop:start-server', async () => {
    try {
      await startServerProcess();
      return { ok: true, state: getPublicState() };
    } catch (error) {
      updateState({ serverStatus: 'error', lastError: error.message });
      return { ok: false, error: error.message, state: getPublicState() };
    }
  });

  ipcMain.handle('desktop:stop-server', async () => {
    await stopServerProcess();
    return { ok: true, state: getPublicState() };
  });

  ipcMain.handle('desktop:open-overlay', async (_, routePath) => {
    const normalized =
      typeof routePath === 'string' && routePath.startsWith('/') ? routePath : ROUTE_PATHS.full;
    await shell.openExternal(getRouteUrl(normalized));
    return { ok: true };
  });

  ipcMain.handle('desktop:copy-text', async (_, text) => {
    clipboard.writeText(String(text || ''));
    return { ok: true };
  });

  ipcMain.handle('desktop:pick-file', async (_, options = {}) => {
    const fileType = typeof options.fileType === 'string' ? options.fileType : 'any';
    const defaultPath = typeof options.defaultPath === 'string' ? options.defaultPath : undefined;

    const filters = [];
    if (fileType === 'env') {
      filters.push({ name: 'Env File', extensions: ['env'] });
    }

    if (fileType === 'json') {
      filters.push({ name: 'JSON File', extensions: ['json'] });
    }

    filters.push({ name: 'All Files', extensions: ['*'] });

    const result = await dialog.showOpenDialog(mainWindow || undefined, {
      title: 'Select File',
      defaultPath,
      properties: ['openFile'],
      filters,
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { ok: false, canceled: true };
    }

    return { ok: true, filePath: result.filePaths[0] };
  });

  ipcMain.handle('desktop:open-logs', async () => {
    const result = await shell.openPath(LOG_FOLDER);
    if (result) {
      return { ok: false, error: result };
    }
    return { ok: true };
  });

  ipcMain.handle('desktop:run-diagnostics', async () => {
    const diagnostics = runStartupDiagnostics();
    return { ok: true, diagnostics };
  });

  // Audio-related handlers
  ipcMain.handle('desktop:get-audio-status', async () => {
    return {
      ok: true,
      audioHealthy: state.audioHealthy,
      audioPathActive: state.audioPathActive,
      audioMode: settings.audioMode,
      lastHealthCheck: state.lastAudioHealthCheck,
    };
  });

  ipcMain.handle('desktop:set-audio-mode', async (_, mode) => {
    if (!['auto', 'obs-only', 'electron-only'].includes(mode)) {
      return { ok: false, error: 'Invalid audio mode' };
    }

    const previous = settings.audioMode;
    settings.audioMode = mode;
    saveSettingsToDisk(settings);
    updateState({ settingsRestartRequired: false });

    console.log(`[audio] Mode changed from ${previous} to ${mode}`);

    // If switching back to auto and audio-manager is available, start health checks
    if (mode === 'auto' && state.audioHealthy) {
      updateState({ audioPathActive: 'obs' });
    }

    return { ok: true, previous, current: mode };
  });

  ipcMain.handle('desktop:check-audio-health', async () => {
    await checkAudioHealth();
    return {
      ok: true,
      audioHealthy: state.audioHealthy,
      audioPathActive: state.audioPathActive,
    };
  });

  ipcMain.handle('desktop:run-audio-test', async () => {
    const baseUrl = getServerBaseUrl();
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.post(`${baseUrl}/api/audio/test`, {}, (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          });
        });
        req.on('error', reject);
        req.end();
      });

      return { ok: true, ...response };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('desktop:mute-audio', async () => {
    const baseUrl = getServerBaseUrl();
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.post(`${baseUrl}/api/audio/mute`, {}, (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          });
        });
        req.on('error', reject);
        req.end();
      });

      return { ok: true, ...response };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });
}

function registerMainProcessErrorHandlers() {
  process.on('uncaughtException', (error) => {
    const message = `Main process uncaught exception: ${error.message}`;
    updateState({ serverStatus: 'error', lastError: message });
    dialog.showErrorBox('Desktop App Error', `${message}\n\n${error.stack || ''}`);
  });

  process.on('unhandledRejection', (reason) => {
    const text = reason instanceof Error ? `${reason.message}\n${reason.stack || ''}` : String(reason);
    const message = `Main process unhandled rejection: ${text}`;
    updateState({ serverStatus: 'error', lastError: message });
    dialog.showErrorBox('Desktop App Error', message);
  });
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.on('window-all-closed', async () => {
  if (tray && process.platform === 'win32') {
    return;
  }
  isQuitting = true;
  await stopServerProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  await stopServerProcess();
});

app.whenReady().then(async () => {
  loadSettingsFromDisk();

  registerMainProcessErrorHandlers();
  registerIpcHandlers();
  createMainWindow();
  createTray();

  runStartupDiagnostics();

  try {
    await startServerProcess();
  } catch (error) {
    updateState({ serverStatus: 'error', lastError: error.message });
    dialog.showErrorBox('Startup Warning', `Server did not start automatically.\n\n${error.message}`);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
