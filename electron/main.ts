import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import log from 'electron-log/main';
import { getAssetsDir, initAssetsDir, loadAssets, pickFile, saveConfig, type ConfigPart, type PickKind } from './assets';

app.setName('shrek-path');
app.setPath('userData', path.join(app.getPath('appData'), 'shrek-path'));
if (process.env.SHREK_USER_DATA) app.setPath('userData', process.env.SHREK_USER_DATA);

log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs', 'main.log');
log.transports.file.maxSize = 5 * 1024 * 1024;
log.initialize();
log.errorHandler.startCatching();
log.info(`Запуск ${app.getName()} ${app.getVersion()}, Electron ${process.versions.electron}, ${process.platform}`);

// Музыка и видео стартуют без клика
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const startedAt = Date.now();

if (!app.requestSingleInstanceLock()) app.quit();

let win: BrowserWindow | null = null;
const sessionFile = () => path.join(app.getPath('userData'), 'session.json');

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    fullscreen: process.env.SHREK_WINDOWED !== '1',
    backgroundColor: '#1f3317',
    title: 'Путь Шрека',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // Страница грузится с file://, медиа из assets — тоже file://
      webSecurity: !DEV_URL,
    },
  });
  win.setMenu(null);
  win.once('ready-to-show', () => {
    win?.show();
    log.info(`Окно показано через ${Date.now() - startedAt} мс после старта`);
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win?.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!(DEV_URL && url.startsWith(DEV_URL))) e.preventDefault();
  });
  win.webContents.on('render-process-gone', (_e, d) => log.error('Renderer упал', d));
  win.webContents.on('did-finish-load', () => log.info('Интерфейс загружен'));
  win.webContents.on('did-fail-load', (_e, code, desc, url) => log.error('Не удалось загрузить интерфейс', code, desc, url));
  win.webContents.on('preload-error', (_e, p, err) => log.error('Ошибка preload', p, err));

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'));
}

function lockDown() {
  const allowed = ['file:', 'devtools:', 'data:', 'blob:'];
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
    const ok = allowed.some((p) => d.url.startsWith(p)) || (!!DEV_URL && /^(http|ws):\/\/localhost/.test(d.url));
    if (!ok) log.warn('Заблокирован сетевой запрос', d.url);
    cb({ cancel: !ok });
  });
  // Разрешаем только микрофон (для «Кричи громче»)
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb, details) => {
    const ok = perm === 'media' && !(details as { mediaTypes?: string[] }).mediaTypes?.includes('video');
    cb(ok);
  });
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => perm === 'media');
}

function registerIpc() {
  ipcMain.handle('assets:load', () => loadAssets());
  ipcMain.handle('assets:save', (_e, part: ConfigPart, data: unknown) => {
    saveConfig(part, data);
    return true;
  });
  ipcMain.handle('assets:pick', (_e, kind: PickKind) => pickFile(win!, kind));
  ipcMain.handle('assets:openFolder', () => shell.openPath(getAssetsDir()));
  ipcMain.handle('session:load', () => {
    try {
      return fs.existsSync(sessionFile()) ? JSON.parse(fs.readFileSync(sessionFile(), 'utf8')) : null;
    } catch {
      return null;
    }
  });
  ipcMain.handle('session:save', (_e, data: unknown) => {
    const tmp = `${sessionFile()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, sessionFile());
  });
  ipcMain.handle('session:clear', () => fs.rmSync(sessionFile(), { force: true }));
  ipcMain.handle('window:toggleFullscreen', () => {
    win?.setFullScreen(!win.isFullScreen());
    return win?.isFullScreen() ?? false;
  });
  ipcMain.handle('app:quit', () => app.quit());
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), assetsDir: getAssetsDir(), startupMs: Date.now() - startedAt }));
  ipcMain.on('log', (_e, level: 'info' | 'warn' | 'error', msg: string) => log[level]('[renderer]', msg));
}

app.on('second-instance', () => {
  if (win?.isMinimized()) win.restore();
  win?.focus();
});

app.whenReady().then(() => {
  initAssetsDir();
  lockDown();
  registerIpc();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
