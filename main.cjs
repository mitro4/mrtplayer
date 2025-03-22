const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      webviewTag: false,
      sandbox: false
    }
  });

  // Разрешаем загрузку локальных файлов и протокол file://
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const parsedUrl = new URL(webContents.getURL());
    callback(
      parsedUrl.protocol === 'file:' || 
      permission === 'fullscreen' || 
      permission === 'webgl' ||
      permission === 'media'
    );
  });

  // Настраиваем CSP для безопасной работы с модулями и локальными файлами
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "media-src 'self' file: blob:; " +
          "img-src 'self' data: blob:;"
        ]
      }
    });
  });

  // Разрешаем открытие локальных файлов
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('file:')) {
      return { action: 'allow' };
    }
    return { action: 'deny' };
  });

  mainWindow.loadFile('index.html');

  // Отключаем меню в продакшене
  if (process.env.NODE_ENV === 'production') {
    mainWindow.setMenu(null);
  }

  // Открываем DevTools в режиме разработки
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // Настраиваем разрешения для WebGL
  app.commandLine.appendSwitch('enable-webgl');
  app.commandLine.appendSwitch('ignore-gpu-blacklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');

  createWindow();

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

// Обработка открытия файла
ipcMain.handle('open-file-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { 
          name: 'Медиафайлы', 
          extensions: [
            // Видео форматы
            'mp4', 'webm', 'mkv', 'avi', 'mov',
            // VR видео форматы (обычно те же, но с соотношением сторон 2:1)
            'mp4', 'webm',
            // Аудио форматы
            'mp3', 'wav', 'ogg', 'flac'
          ]
        }
      ]
    });

    console.log('File dialog result:', result);
    return result.filePaths;
  } catch (error) {
    console.error('Error in open-file-dialog:', error);
    throw error;
  }
});