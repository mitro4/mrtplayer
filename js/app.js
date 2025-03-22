import { VRPlayer } from './vr-player.js';

class MediaPlayer {
    constructor() {
        this.mediaPlayer = document.getElementById('mediaPlayer');
        this.playlist = document.getElementById('playlist');
        this.currentFile = document.getElementById('currentFile');
        this.duration = document.getElementById('duration');
        this.progress = document.getElementById('progress');
        this.volume = document.getElementById('volume');
        
        this.playlistItems = [];
        this.currentIndex = -1;
        this.vrPlayer = null;

        this.initializeControls();
        this.initializeEventListeners();

        // Добавляем обработку ошибок
        window.addEventListener('error', (event) => {
            console.error('Player error:', event.error);
        });
    }

    initializeControls() {
        // Кнопки управления
        this.playPauseBtn = document.getElementById('playPause');
        this.stopBtn = document.getElementById('stop');
        this.muteBtn = document.getElementById('mute');
        this.fullscreenBtn = document.getElementById('fullscreen');
        this.openFileBtn = document.getElementById('openFile');
        this.vrBtn = document.getElementById('vrMode');

        if (!this.openFileBtn) {
            console.error('Open file button not found!');
            return;
        }
    }

    initializeEventListeners() {
        // Управление воспроизведением
        this.playPauseBtn?.addEventListener('click', () => this.togglePlay());
        this.stopBtn?.addEventListener('click', () => this.stop());
        this.muteBtn?.addEventListener('click', () => this.toggleMute());
        this.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
        
        // Явно привязываем this к методу openFile
        this.openFileBtn?.addEventListener('click', this.openFile.bind(this));
        this.vrBtn?.addEventListener('click', () => this.toggleVRMode());

        // Управление громкостью
        this.volume?.addEventListener('input', (e) => {
            this.mediaPlayer.volume = e.target.value;
            this.updateVolumeIcon();
        });

        // Обработка событий медиаплеера
        this.mediaPlayer?.addEventListener('timeupdate', () => this.updateProgress());
        this.mediaPlayer?.addEventListener('ended', () => this.onMediaEnded());
        this.mediaPlayer?.addEventListener('loadedmetadata', () => this.onMediaLoaded());

        // Обработка прогресс-бара
        document.querySelector('.progress-container')?.addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.mediaPlayer.currentTime = pos * this.mediaPlayer.duration;
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            if (this.vrPlayer) {
                const container = document.querySelector('.media-container');
                this.vrPlayer.updateSize(container.clientWidth, container.clientHeight);
            }
        });
    }

    async openFile() {
        console.log('Opening file dialog...');
        try {
            if (!window.electronAPI) {
                console.error('electronAPI not found!');
                return;
            }

            const filePaths = await window.electronAPI.openFile();
            console.log('Selected files:', filePaths);

            if (filePaths && filePaths.length > 0) {
                this.addToPlaylist(filePaths);
            }
        } catch (error) {
            console.error('Error opening file:', error);
        }
    }

    addToPlaylist(filePaths) {
        filePaths.forEach(filePath => {
            const fileName = filePath.split('\\').pop().split('/').pop();
            this.playlistItems.push({
                path: filePath,
                name: fileName
            });

            const li = document.createElement('li');
            li.textContent = fileName;
            li.addEventListener('click', () => this.playFile(this.playlistItems.length - 1));
            this.playlist.appendChild(li);
        });

        // Если это первый добавленный файл, начинаем воспроизведение
        if (this.currentIndex === -1) {
            this.playFile(0);
        }
    }

    playFile(index) {
        if (index >= 0 && index < this.playlistItems.length) {
            this.currentIndex = index;
            const item = this.playlistItems[index];
            
            // Обновляем активный элемент в плейлисте
            Array.from(this.playlist.children).forEach((li, i) => {
                li.classList.toggle('active', i === index);
            });

            // Загружаем и воспроизводим файл
            this.mediaPlayer.src = `file://${item.path}`;
            this.currentFile.textContent = item.name;
            this.mediaPlayer.play().catch(error => {
                console.error('Error playing media:', error);
            });
            this.updatePlayPauseButton();

            // Сбрасываем VR режим при смене файла
            if (this.vrPlayer && this.vrPlayer.isVRMode) {
                this.toggleVRMode();
            }
        }
    }

    async toggleVRMode() {
        try {
            if (!this.vrPlayer) {
                this.vrPlayer = new VRPlayer(this.mediaPlayer);
            }

            // Сохраняем текущее состояние
            const wasVRMode = this.vrPlayer.isVRMode;

            // Переключаем режим и ждем результата
            const isVRMode = await this.vrPlayer.toggleVR();
            
            // Обновляем состояние кнопки только после успешного переключения
            this.vrBtn.classList.toggle('active', isVRMode);

            // Если произошла ошибка при переключении в VR режим,
            // возвращаем видимость видео
            if (wasVRMode !== isVRMode) {
                if (isVRMode) {
                    // Включаем VR режим
                    this.mediaPlayer.style.opacity = '0';
                    this.mediaPlayer.style.visibility = 'hidden';
                } else {
                    // Выключаем VR режим
                    this.mediaPlayer.style.opacity = '1';
                    this.mediaPlayer.style.visibility = 'visible';
                }
            }
        } catch (error) {
            console.error('Error toggling VR mode:', error);
            // В случае ошибки возвращаем видимость видео
            this.mediaPlayer.style.opacity = '1';
            this.mediaPlayer.style.visibility = 'visible';
            this.vrBtn.classList.remove('active');
        }
    }

    togglePlay() {
        if (this.mediaPlayer.paused) {
            this.mediaPlayer.play().catch(error => {
                console.error('Error playing media:', error);
            });
        } else {
            this.mediaPlayer.pause();
        }
        this.updatePlayPauseButton();
    }

    stop() {
        this.mediaPlayer.pause();
        this.mediaPlayer.currentTime = 0;
        this.updatePlayPauseButton();
    }

    toggleMute() {
        this.mediaPlayer.muted = !this.mediaPlayer.muted;
        this.updateVolumeIcon();
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(error => {
                console.error('Error exiting fullscreen:', error);
            });
        } else {
            const container = document.querySelector('.media-container');
            container.requestFullscreen().catch(error => {
                console.error('Error entering fullscreen:', error);
            });
        }
    }

    updatePlayPauseButton() {
        const span = this.playPauseBtn.querySelector('span');
        if (span) {
            span.textContent = this.mediaPlayer.paused ? '▶' : '⏸';
        }
    }

    updateVolumeIcon() {
        const volumeIcon = this.muteBtn.querySelector('span');
        if (volumeIcon) {
            if (this.mediaPlayer.muted || this.mediaPlayer.volume === 0) {
                volumeIcon.textContent = '🔇';
            } else if (this.mediaPlayer.volume < 0.5) {
                volumeIcon.textContent = '🔉';
            } else {
                volumeIcon.textContent = '🔊';
            }
        }
    }

    updateProgress() {
        if (this.mediaPlayer.duration) {
            // Обновляем прогресс-бар
            const progress = (this.mediaPlayer.currentTime / this.mediaPlayer.duration) * 100;
            this.progress.style.width = `${progress}%`;

            // Обновляем отображение времени
            const currentTime = this.formatTime(this.mediaPlayer.currentTime);
            const duration = this.formatTime(this.mediaPlayer.duration);
            this.duration.textContent = `${currentTime} / ${duration}`;
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    onMediaEnded() {
        // Переходим к следующему файлу в плейлисте
        if (this.currentIndex < this.playlistItems.length - 1) {
            this.playFile(this.currentIndex + 1);
        } else {
            this.stop();
        }
    }

    onMediaLoaded() {
        this.updateProgress();
        this.updatePlayPauseButton();

        // Проверяем, является ли видео VR
        if (VRPlayer.isVRVideo(this.mediaPlayer)) {
            this.vrBtn.style.display = 'block';
        } else {
            this.vrBtn.style.display = 'none';
            if (this.vrPlayer && this.vrPlayer.isVRMode) {
                this.toggleVRMode();
            }
        }
    }
}

// Инициализация плеера
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing media player...');
    new MediaPlayer();
});