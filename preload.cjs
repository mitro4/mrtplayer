const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs').promises;
const path = require('path');

// Безопасное API для рендерер процесса
contextBridge.exposeInMainWorld('electronAPI', {
    // Базовые функции файловой системы
    openFile: async () => {
        try {
            return await ipcRenderer.invoke('open-file-dialog');
        } catch (error) {
            console.error('Error opening file dialog:', error);
            return [];
        }
    },
    
    // Информация о системе
    platform: process.platform,
    
    // Получение информации о медиафайле
    getMediaInfo: async (filePath) => {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                filename: path.basename(filePath),
                extension: path.extname(filePath).toLowerCase()
            };
        } catch (error) {
            console.error('Error getting media info:', error);
            return null;
        }
    },

    // Проверка поддержки VR
    checkVRSupport: () => {
        return {
            webVR: 'getVRDisplays' in navigator,
            webXR: 'xr' in navigator,
            orientation: 'DeviceOrientationEvent' in window,
            gyroscope: 'Gyroscope' in window
        };
    },

    // Получение метаданных видео
    getVideoMetadata: async (filePath) => {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                type: path.extname(filePath).toLowerCase(),
                isVR: path.basename(filePath).toLowerCase().includes('360') || 
                      path.basename(filePath).toLowerCase().includes('vr')
            };
        } catch (error) {
            console.error('Error getting video metadata:', error);
            return null;
        }
    }
});

// Добавляем обработку ошибок
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});