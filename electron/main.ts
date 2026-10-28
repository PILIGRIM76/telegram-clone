import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getIndexHtmlPath(): string {
  // В режиме разработки (vite dev server)
  if (!app.isPackaged) {
    return path.join(__dirname, '../dist/index.html');
  }

  // В собранном приложении (Packaged)
  // Мы распаковали dist в asarUnpack, поэтому он лежит рядом с main.js
  const unpackedPath = path.join(__dirname, '../dist/index.html');
  const resourcesPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.html');
  
  if (fs.existsSync(unpackedPath)) {
    console.log('[Electron] ✅ Using unpacked dist path:', unpackedPath);
    return unpackedPath;
  }
  if (fs.existsSync(resourcesPath)) {
    console.log('[Electron] ✅ Using resources path:', resourcesPath);
    return resourcesPath;
  }

  console.error('[Electron] ❌ CRITICAL: index.html NOT FOUND!');
  console.error('Tried:', unpackedPath, 'and', resourcesPath);
  
  // Fallback: показать ошибку в окне
  return path.join(__dirname, '../dist/index.html'); 
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
  // Иконка для окна приложения
  const iconPath = path.join(__dirname, app.isPackaged ? '../build/piligrim.ico' : '../build/piligrim.ico');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Временно для отладки загрузки локальных файлов
    },
    title: 'CipherLink v1.0.0',
    icon: iconPath
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // В разработке загружаем Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // В production загружаем собранные файлы
    const indexPath = getIndexHtmlPath();
    console.log('[Electron] Loading file://', indexPath);

    // Читаем первые 200 символов, чтобы проверить, есть ли там "./assets"
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      const hasRelativeAssets = content.includes('./assets/') || content.includes('src="./');
      console.log('[Electron] index.html has relative assets (./):', hasRelativeAssets);
      if (!hasRelativeAssets) {
        console.warn('[Electron] ⚠️ WARNING: index.html might have absolute paths (/assets/). Check vite.config.ts base!');
      }
    }

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