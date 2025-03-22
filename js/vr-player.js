// Импортируем Three.js из node_modules
import * as THREE from 'three';

export class VRPlayer {
    constructor(videoElement) {
        this.video = videoElement;
        this.isVRMode = false;
        this.originalParent = videoElement.parentNode;
        this.originalNextSibling = videoElement.nextSibling;
        
        // Создаем контейнер для VR режима
        this.vrContainer = document.createElement('div');
        this.vrContainer.style.position = 'absolute';
        this.vrContainer.style.top = '0';
        this.vrContainer.style.left = '0';
        this.vrContainer.style.width = '100%';
        this.vrContainer.style.height = '100%';
        
        // Создаем контейнер для видео в VR режиме
        this.videoContainer = document.createElement('div');
        this.videoContainer.style.position = 'absolute';
        this.videoContainer.style.visibility = 'hidden';
        this.vrContainer.appendChild(this.videoContainer);
    }

    async init() {
        console.log('Initializing VR player...');

        // Создаем сцену
        this.scene = new THREE.Scene();
        
        // Настраиваем камеру
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
        this.resetCamera();

        // Создаем рендерер
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.vrContainer.appendChild(this.renderer.domElement);

        // Ждем загрузки видео если оно еще не готово
        if (this.video.readyState < 2) {
            console.log('Waiting for video to be ready...');
            await new Promise((resolve) => {
                this.video.addEventListener('canplay', () => {
                    console.log('Video is ready');
                    resolve();
                }, { once: true });
            });
        }

        // Создаем текстуру
        this.texture = new THREE.VideoTexture(this.video);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        // Создаем материал
        const material = new THREE.MeshBasicMaterial({
            map: this.texture,
            side: THREE.DoubleSide
        });

        // Создаем геометрию
        const geometry = new THREE.SphereGeometry(5, 64, 32);
        geometry.scale(-1, 1, 1);

        // Создаем меш
        this.sphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.sphere);

        // Добавляем управление мышью
        this.addMouseControls();

        console.log('VR player initialized');
    }

    resetCamera() {
        if (this.camera) {
            this.camera.position.set(0, 0, 0.01);
            this.camera.rotation.set(0, 0, 0);
        }
    }

    addMouseControls() {
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;

        const onMouseDown = (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        const onMouseUp = () => {
            isMouseDown = false;
        };

        const onMouseMove = (e) => {
            if (!isMouseDown) return;

            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;

            this.camera.rotation.y -= deltaX * 0.01;
            this.camera.rotation.x -= deltaY * 0.01;

            // Ограничиваем вращение по X
            this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));

            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        // Сохраняем ссылки на функции для последующего удаления
        this.mouseControls = { onMouseDown, onMouseUp, onMouseMove };
    }

    enableMouseControls() {
        const { onMouseDown, onMouseUp, onMouseMove } = this.mouseControls;
        this.renderer.domElement.addEventListener('mousedown', onMouseDown);
        this.renderer.domElement.addEventListener('mouseup', onMouseUp);
        this.renderer.domElement.addEventListener('mousemove', onMouseMove);
    }

    disableMouseControls() {
        const { onMouseDown, onMouseUp, onMouseMove } = this.mouseControls;
        this.renderer.domElement.removeEventListener('mousedown', onMouseDown);
        this.renderer.domElement.removeEventListener('mouseup', onMouseUp);
        this.renderer.domElement.removeEventListener('mousemove', onMouseMove);
    }

    async toggleVR() {
        try {
            if (!this.isVRMode) {
                console.log('Enabling VR mode...');

                // Инициализируем если еще не сделали
                if (!this.scene) {
                    await this.init();
                }

                const container = document.querySelector('.media-container');
                if (!container) {
                    throw new Error('Container not found');
                }

                // Сохраняем текущее состояние видео
                const currentTime = this.video.currentTime;
                const wasPlaying = !this.video.paused;

                // Перемещаем видео в VR контейнер
                this.videoContainer.appendChild(this.video);
                container.appendChild(this.vrContainer);

                // Обновляем размеры
                this.updateSize(container.clientWidth, container.clientHeight);

                // Сбрасываем камеру
                this.resetCamera();

                // Включаем управление мышью
                this.enableMouseControls();

                // Восстанавливаем состояние воспроизведения
                this.video.currentTime = currentTime;
                if (wasPlaying) {
                    await this.video.play();
                }

                this.isVRMode = true;
                this.animate();
                console.log('VR mode enabled');
            } else {
                console.log('Disabling VR mode...');
                
                // Отключаем управление мышью
                this.disableMouseControls();
                
                // Возвращаем видео на исходное место
                if (this.originalNextSibling) {
                    this.originalParent.insertBefore(this.video, this.originalNextSibling);
                } else {
                    this.originalParent.appendChild(this.video);
                }
                
                // Удаляем VR контейнер
                if (this.vrContainer.parentNode) {
                    this.vrContainer.remove();
                }

                this.isVRMode = false;
                console.log('VR mode disabled');
            }
            return this.isVRMode;
        } catch (error) {
            console.error('Error toggling VR mode:', error);
            // В случае ошибки возвращаем видео на место
            if (this.originalNextSibling) {
                this.originalParent.insertBefore(this.video, this.originalNextSibling);
            } else {
                this.originalParent.appendChild(this.video);
            }
            this.isVRMode = false;
            return false;
        }
    }

    animate() {
        if (!this.isVRMode) return;

        requestAnimationFrame(() => this.animate());

        try {
            // Обновляем текстуру только если видео воспроизводится
            if (!this.video.paused && this.video.readyState >= 2) {
                this.texture.needsUpdate = true;
            }

            // Рендерим сцену
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('Error in animation loop:', error);
        }
    }

    updateSize(width, height) {
        if (this.camera && this.renderer) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    static isVRVideo(video) {
        return video.videoWidth / video.videoHeight >= 1.9;
    }
}