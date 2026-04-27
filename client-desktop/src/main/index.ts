import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, Notification, globalShortcut } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Telegram Clone',
    icon: path.join(__dirname, '../../build/icon.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../client-web/out/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('unresponsive', () => {
    console.log('[Desktop] Window became unresponsive');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Desktop] Failed to load: ${errorCode} - ${errorDescription}`);
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../build/icon.png');
  let icon: nativeImage;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Открыть Telegram Clone', 
      click: () => mainWindow?.show() 
    },
    { type: 'separator' },
    { 
      label: 'Новое сообщение', 
      accelerator: 'CmdOrCtrl+N',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('new-message');
      }
    },
    { type: 'separator' },
    { 
      label: 'Выход', 
      click: () => { 
        isQuitting = true; 
        app.quit(); 
      } 
    }
  ]);
  
  tray.setToolTip('Telegram Clone');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Файл',
      submenu: [
        { 
          label: 'Новое сообщение', 
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('new-message')
        },
        { type: 'separator' },
        { 
          label: 'Настройки', 
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('open-settings')
        },
        { type: 'separator' },
        { 
          label: 'Выход', 
          accelerator: 'CmdOrCtrl+Q', 
          click: () => { isQuitting = true; app.quit(); } 
        }
      ]
    },
    {
      label: 'Правка',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Окно',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { 
          label: 'Всегда сверху', 
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            mainWindow?.setAlwaysOnTop(menuItem.checked);
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Помощь',
      submenu: [
        { 
          label: 'О программе', 
          click: () => {
            mainWindow?.webContents.send('show-about');
          }
        },
        { 
          label: 'Документация', 
          click: () => shell.openExternal('https://github.com/PILIGRIM76/telegram-clone')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function registerGlobalShortcuts(): void {
  globalShortcut.register('CmdOrCtrl+Shift+T', () => {
    mainWindow?.show();
  });
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  
  autoUpdater.on('checking-for-update', () => {
    console.log('[Desktop] Checking for updates...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('[Desktop] Update available:', info.version);
    mainWindow?.webContents.send('update-available', info);
    
    if (Notification.isSupported()) {
      new Notification({
        title: 'Доступно обновление',
        body: `Версия ${info.version} доступна для загрузки`,
      }).show();
    }
  });
  
  autoUpdater.on('update-not-available', () => {
    console.log('[Desktop] No update available');
  });
  
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-progress', progress);
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Desktop] Update downloaded:', info.version);
    mainWindow?.webContents.send('update-downloaded', info);
    
    if (Notification.isSupported()) {
      new Notification({
        title: 'Обновление готово',
        body: 'Перезапустите приложение для установки',
      }).show();
    }
  });
  
  autoUpdater.on('error', (error) => {
    console.error('[Desktop] Auto-updater error:', error);
  });
  
  autoUpdater.checkForUpdates().catch(console.error);
}

ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('get-app-path', () => app.getPath('userData'));

ipcMain.handle('show-notification', (_, { title, body }: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate().catch(console.error);
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

ipcMain.handle('is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

app.whenReady().then(() => {
  createWindow();
  createMenu();
  createTray();
  registerGlobalShortcuts();
  
  if (!isDev) {
    setupAutoUpdater();
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});