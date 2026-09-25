import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getIndexHtmlPath(): string {
  const isProd = app.isPackaged;
  
  if (isProd) {
    // В production файлы находятся в app.asar/dist/index.html
    // __dirname в packaged режиме = .../app.asar/dist-electron/
    const asarPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(asarPath)) {
      console.log('[Electron] Using asar path:', asarPath);
      return asarPath;
    }
    
    // Fallback: process.resourcesPath + app.asar
    const resourcesPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
    if (fs.existsSync(resourcesPath)) {
      console.log('[Electron] Using resourcesPath:', resourcesPath);
      return resourcesPath;
    }
    
    console.error('[Electron] ❌ index.html not found in production!');
    console.error('Tried:', asarPath, resourcesPath);
    return asarPath; // fallback
  } else {
    // Dev режим
    const devPath = path.join(__dirname, '../dist/index.html');
    return devPath;
  }
}

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

// Функция для запуска бэкенд-сервера
function startBackendServer(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const serverPath = path.join(__dirname, '../server.js');
    // В production путь будет другим, адаптируем:
    const isProd = app.isPackaged;
    const actualServerPath = isProd
      ? path.join(process.resourcesPath, 'app.asar.unpacked/server.js')
      : serverPath;

    const serverDir = isProd
      ? path.join(process.resourcesPath, 'app.asar.unpacked')
      : path.join(__dirname, '..');

    serverProcess = spawn('node', [actualServerPath], {
      cwd: serverDir,
      env: { ...process.env, PORT: process.env.PORT || '4000' }
    });

    let resolved = false;

    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`[Backend] ${output}`);
      // Простой хак: когда сервер пишет "Сервер на порту", считаем его готовым
      if (!resolved && (output.includes('Сервер на порту') || output.includes('Server listening'))) {
        resolved = true;
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    serverProcess.on('close', (code) => {
      console.log(`[Backend] exited with code ${code}`);
      if (!resolved) {
        resolved = true;
        reject(new Error(`Backend server exited with code ${code}`));
      }
    });

    serverProcess.on('error', (err) => {
      console.error('[Backend] Failed to start:', err);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    // Таймаут на случай если сервер не выведет сообщение о готовности
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, 10000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // preload: path.join(__dirname, 'preload.js') // Если понадобится IPC
    },
    title: 'CipherLink v1.0.0',
    icon: path.join(__dirname, '../public/icon.png')
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // В разработке загружаем Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // В production загружаем собранные файлы
    const indexPath = getIndexHtmlPath();
    console.log('[Electron] Loading index.html from:', indexPath);
    console.log('[Electron] File exists:', fs.existsSync(indexPath));
    mainWindow.loadFile(indexPath);
    
    // Открываем DevTools для отладки production
    mainWindow.webContents.openDevTools();
    
    // Обработка ошибок загрузки
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[Electron] Load failed:', errorCode, errorDescription);
    });
    
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[Electron] ✅ Page loaded successfully');
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    console.log('[Electron] Starting backend server...');
    await startBackendServer();
    console.log('[Electron] Backend ready, creating window...');
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    console.error('[Electron] Failed to start backend:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    console.log('[Electron] Killing backend server...');
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});