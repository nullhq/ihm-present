// ====================
// VARIABLES GLOBALES
// ====================
let currentStream = null;
let capturedPhotos = [];
const MAX_PHOTOS = 5;
let currentPhotoMode = 'camera'; // 'camera' or 'upload'

// ====================
// ROUTER & NAVIGATION
// ====================
function router(viewName) {
    const contentContainer = document.getElementById('app-content');
    const template = document.getElementById(`view-${viewName}`);
    
    if (template) {
        // Stop any active camera streams before switching views
        stopCamera();
        
        // Fade effect
        contentContainer.style.opacity = '0';
        
        setTimeout(() => {
            contentContainer.innerHTML = '';
            const clone = template.content.cloneNode(true);
            contentContainer.appendChild(clone);
            contentContainer.style.opacity = '1';
            
            // Initialize camera if entering register or capture view
            if (viewName === 'register') {
                currentPhotoMode = 'camera';
                // Reset photos
                capturedPhotos = [];
                // Initialize UI
                setTimeout(() => {
                    const cameraModeEl = document.getElementById('camera-mode');
                    const uploadModeEl = document.getElementById('upload-mode');
                    if (cameraModeEl && uploadModeEl) {
                        cameraModeEl.classList.remove('hidden');
                        uploadModeEl.classList.add('hidden');
                        initRegisterCamera();
                    }
                }, 100);
            } else if (viewName === 'capture') {
                initCaptureCamera();
            }
        }, 150);
        
        // Update Sidebar Active State
        document.querySelectorAll('.nav-item').forEach(el => {
            if(el.id === `nav-${viewName}`) {
                el.classList.add('bg-primary/10', 'text-primary');
                el.classList.remove('text-slate-600', 'dark:text-slate-300');
                el.querySelector('.material-symbols-outlined').classList.add('fill-1');
            } else {
                el.classList.remove('bg-primary/10', 'text-primary');
                el.classList.add('text-slate-600', 'dark:text-slate-300');
                el.querySelector('.material-symbols-outlined').classList.remove('fill-1');
            }
        });
    }
}

// ====================
// CAMERA MANAGEMENT
// ====================
async function startCamera(videoElementId) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } 
        });
        
        const videoElement = document.getElementById(videoElementId);
        if (videoElement) {
            videoElement.srcObject = stream;
            currentStream = stream;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erreur d\'accès à la caméra:', error);
        showCameraError(error.message);
        return false;
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

function showCameraError(message) {
    const statusElement = document.getElementById('camera-status');
    if (statusElement) {
        statusElement.innerHTML = `
            <div class="size-2 bg-red-500 rounded-full"></div> 
            Erreur caméra
        `;
    }
    alert(`Impossible d'accéder à la caméra: ${message}\n\nAssurez-vous d'avoir autorisé l'accès à la caméra dans votre navigateur.`);
}

// ====================
// PHOTO MODE MANAGEMENT
// ====================
function setPhotoMode(mode) {
    currentPhotoMode = mode;
    const cameraModeEl = document.getElementById('camera-mode');
    const uploadModeEl = document.getElementById('upload-mode');
    const modeCamera = document.getElementById('mode-camera');
    const modeUpload = document.getElementById('mode-upload');
    
    if (mode === 'camera') {
        cameraModeEl.classList.remove('hidden');
        uploadModeEl.classList.add('hidden');
        modeCamera.classList.add('bg-primary', 'text-white', 'hover:bg-blue-600');
        modeCamera.classList.remove('bg-slate-200', 'text-slate-700', 'dark:bg-slate-700', 'dark:text-slate-200');
        modeUpload.classList.remove('bg-primary', 'text-white', 'hover:bg-blue-600');
        modeUpload.classList.add('bg-slate-200', 'text-slate-700', 'dark:bg-slate-700', 'dark:text-slate-200');
        initRegisterCamera();
    } else {
        cameraModeEl.classList.add('hidden');
        uploadModeEl.classList.remove('hidden');
        stopCamera();
        modeUpload.classList.add('bg-primary', 'text-white', 'hover:bg-blue-600');
        modeUpload.classList.remove('bg-slate-200', 'text-slate-700', 'dark:bg-slate-700', 'dark:text-slate-200');
        modeCamera.classList.remove('bg-primary', 'text-white', 'hover:bg-blue-600');
        modeCamera.classList.add('bg-slate-200', 'text-slate-700', 'dark:bg-slate-700', 'dark:text-slate-200');
    }
}

// ====================
// REGISTER VIEW - Camera & Photo Capture
// ====================
async function initRegisterCamera() {
    capturedPhotos = [];
    updatePhotosPreview();
    updateProgressBar();
    
    const statusElement = document.getElementById('camera-status');
    if (statusElement) {
        statusElement.innerHTML = `
            <div class="size-2 bg-yellow-500 rounded-full animate-pulse"></div> 
            Initialisation...
        `;
    }
    
    const success = await startCamera('register-video');
    
    if (success && statusElement) {
        statusElement.innerHTML = `
            <div class="size-2 bg-green-500 rounded-full animate-pulse"></div> 
            Caméra en direct
        `;
        document.getElementById('capture-btn').disabled = false;
    }
}

function capturePhoto() {
    if (capturedPhotos.length >= MAX_PHOTOS) {
        alert('Vous avez atteint le nombre maximum de photos (5)');
        return;
    }
    
    const video = document.getElementById('register-video');
    const canvas = document.getElementById('register-canvas');
    
    if (!video || !canvas) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to data URL
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Add to captured photos array
    capturedPhotos.push({
        id: Date.now(),
        dataUrl: photoDataUrl,
        timestamp: new Date().toISOString()
    });
    
    // Update UI
    updatePhotosPreview();
    updateProgressBar();
    
    // Visual feedback
    flashEffect();
}

function updatePhotosPreview() {
    const previewContainer = document.getElementById('photos-preview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    capturedPhotos.forEach((photo, index) => {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'relative aspect-square rounded-lg overflow-hidden border-2 border-green-500 shadow-lg group';
        photoDiv.innerHTML = `
            <img src="${photo.dataUrl}" class="w-full h-full object-cover" alt="Photo ${index + 1}">
            <button onclick="deletePhoto(${photo.id})" 
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                <span class="text-white text-xs font-bold">Photo ${index + 1}</span>
            </div>
        `;
        previewContainer.appendChild(photoDiv);
    });
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;
    
    const percentage = Math.min((capturedPhotos.length / 3) * 100, 100);
    progressBar.style.width = `${percentage}%`;
    
    // Also update upload progress bar
    updateProgressBarUpload();
}

function deletePhoto(photoId) {
    capturedPhotos = capturedPhotos.filter(photo => photo.id !== photoId);
    updatePhotosPreview();
    updateProgressBar();
}

function flashEffect() {
    const video = document.getElementById('register-video');
    if (!video) return;
    
    const flash = document.createElement('div');
    flash.className = 'absolute inset-0 bg-white pointer-events-none';
    flash.style.animation = 'flash 0.3s ease-out';
    video.parentElement.appendChild(flash);
    
    setTimeout(() => flash.remove(), 300);
}

// Add flash animation to style
const style = document.createElement('style');
style.textContent = `
    @keyframes flash {
        0% { opacity: 0.8; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(style);

// ====================
// FILE UPLOAD HANDLING
// ====================
function handleFileUpload(event) {
    const files = event.target.files;
    handleFileUploadDrop(files);
}

function handleFileUploadDrop(files) {
    const fileArray = Array.from(files);
    
    fileArray.forEach((file, index) => {
        if (capturedPhotos.length >= MAX_PHOTOS) return;
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                capturedPhotos.push({
                    id: Date.now() + index,
                    dataUrl: e.target.result,
                    timestamp: new Date().toISOString(),
                    fileName: file.name
                });
                updatePhotosPreview();
                updateProgressBar();
            };
            reader.readAsDataURL(file);
        }
    });
}

function updateProgressBarUpload() {
    const progressBar = document.getElementById('progress-bar-upload');
    if (!progressBar) return;
    
    const percentage = Math.min((capturedPhotos.length / 3) * 100, 100);
    progressBar.style.width = `${percentage}%`;
}

function submitRegistration() {
    const name = document.getElementById('register-name').value;
    const id = document.getElementById('register-id').value;
    
    if (!name || !id) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    if (capturedPhotos.length < 3) {
        alert(`Veuillez fournir au minimum 3 photos (${capturedPhotos.length} actuellement)`);
        return;
    }
    
    // Success message
    alert(`Étudiant ${name} (${id}) inscrit avec ${capturedPhotos.length} photos!`);
    
    // Reset and go back to dashboard
    capturedPhotos = [];
    document.getElementById('register-name').value = '';
    document.getElementById('register-id').value = '';
    updatePhotosPreview();
    updateProgressBar();
    updateProgressBarUpload();
    router('dashboard');
}

// ====================
// CAPTURE VIEW - Live Session
// ====================
async function initCaptureCamera() {
    const success = await startCamera('capture-video');
    
    if (!success) {
        console.error('Failed to start capture session camera');
    }
}

function stopCaptureSession() {
    stopCamera();
    router('review');
}

// ====================
// INITIALIZATION
// ====================
document.addEventListener('DOMContentLoaded', () => {
    // Add transition style
    const appContent = document.getElementById('app-content');
    if (appContent) {
        appContent.style.transition = 'opacity 0.2s ease-in-out';
    }
    
    // Load Dashboard by default
    router('dashboard');
});

// Cleanup camera on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
});
