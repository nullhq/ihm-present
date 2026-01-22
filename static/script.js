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
            },
            audio: false
        });
        
        const videoElement = document.getElementById(videoElementId);
        if (videoElement) {
            videoElement.srcObject = stream;
            videoElement.autoplay = true;
            videoElement.muted = true;
            videoElement.playsInline = true;
            videoElement.play().catch(err => {
                console.log("[v0] Video play error:", err);
            });
            currentStream = stream;
            console.log("[v0] Camera started successfully");
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
// CAPTURE VIEW - Single Room Photo Capture
// ====================
async function initCaptureCamera() {
    const success = await startCamera('capture-video');
    
    if (!success) {
        console.error('Failed to start capture session camera');
    }
}

function captureRoomPhoto() {
    const video = document.getElementById('capture-video');
    const canvas = document.getElementById('capture-canvas');
    const loadingDiv = document.getElementById('capture-loading');
    
    if (!video || !canvas) return;
    
    // Show loading state
    if (loadingDiv) {
        loadingDiv.classList.remove('hidden');
    }
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to data URL
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    // Simulate face detection (in production, use a real ML model)
    setTimeout(() => {
        processRoomCapture(photoDataUrl);
        if (loadingDiv) {
            loadingDiv.classList.add('hidden');
        }
    }, 1500);
}

function processRoomCapture(photoDataUrl) {
    // Show captured image
    const previewContainer = document.getElementById('capture-preview-container');
    const video = document.getElementById('capture-video');
    const captureStats = document.getElementById('capture-stats');
    const status = document.getElementById('capture-status');
    
    if (previewContainer && video) {
        video.style.display = 'none';
        
        // Create image element for captured photo
        const img = document.createElement('img');
        img.src = photoDataUrl;
        img.className = 'w-full h-full object-cover';
        img.id = 'captured-room-image';
        
        // Clear container and add image
        previewContainer.innerHTML = '';
        previewContainer.appendChild(img);
    }
    
    // Simulate face detection results
    const detectedFaces = [
        { name: 'Sarah M.', id: '22P001', x: 20, y: 30, w: 12, h: 18, detected: true },
        { name: 'David K.', id: '22P074', x: 45, y: 35, w: 10, h: 15, detected: true },
        { name: 'Inconnu', id: 'unknown', x: 70, y: 40, w: 11, h: 16, detected: false }
    ];
    
    // Update detected count
    const detectedCount = detectedFaces.filter(f => f.detected).length;
    const detectedCountEl = document.getElementById('detected-count');
    if (detectedCountEl) {
        detectedCountEl.textContent = detectedCount;
    }
    
    // Show stats
    if (captureStats) {
        captureStats.classList.remove('hidden');
    }
    
    // Update status
    if (status) {
        status.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="size-2 bg-green-500 rounded-full"></div>
                <span class="text-green-600">Capture complète - ${detectedCount} étudiants détectés</span>
            </div>
        `;
        status.classList.remove('text-yellow-600', 'bg-yellow-100');
        status.classList.add('text-green-600', 'bg-green-100');
    }
    
    // Draw bounding boxes on image
    drawDetectionBoxes(photoDataUrl, detectedFaces);
    
    // Update sidebar with results
    updateDetectionResults(detectedFaces);
    
    // Update attendance stats
    updateAttendanceStats(detectedFaces);
}

function drawDetectionBoxes(photoDataUrl, faces) {
    const container = document.getElementById('detected-faces-container');
    if (!container) return;
    
    container.innerHTML = '';
    container.classList.remove('hidden');
    
    faces.forEach((face, index) => {
        const box = document.createElement('div');
        box.className = `absolute border-2 rounded-lg ${face.detected ? 'border-green-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-yellow-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'} flex flex-col items-center justify-end pb-2`;
        box.style.left = `${face.x}%`;
        box.style.top = `${face.y}%`;
        box.style.width = `${face.w}%`;
        box.style.height = `${face.h}%`;
        
        const label = document.createElement('div');
        label.className = `${face.detected ? 'bg-green-500' : 'bg-yellow-500'} text-white text-[10px] font-bold px-2 py-0.5 rounded-full translate-y-1/2`;
        label.textContent = face.name;
        
        box.appendChild(label);
        container.appendChild(box);
    });
}

function updateDetectionResults(faces) {
    const list = document.getElementById('detected-students-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    const detectedStudents = faces.filter(f => f.detected);
    const unknownStudents = faces.filter(f => !f.detected);
    
    if (detectedStudents.length === 0 && unknownStudents.length === 0) {
        list.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">Aucun visage détecté</p>';
        return;
    }
    
    // Detected students
    if (detectedStudents.length > 0) {
        const header = document.createElement('p');
        header.className = 'text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mt-3';
        header.textContent = `Reconnus (${detectedStudents.length})`;
        list.appendChild(header);
        
        detectedStudents.forEach(student => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-900/30 rounded-lg shadow-sm';
            item.innerHTML = `
                <div class="relative size-10 rounded-full overflow-hidden bg-green-100">
                    <span class="material-symbols-outlined text-green-600">check_circle</span>
                    <div class="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                </div>
                <div>
                    <p class="text-sm font-bold">${student.name}</p>
                    <p class="text-xs text-slate-500">Matricule: ${student.id}</p>
                </div>
            `;
            list.appendChild(item);
        });
    }
    
    // Unknown/Unrecognized students
    if (unknownStudents.length > 0) {
        const header = document.createElement('p');
        header.className = 'text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mt-3';
        header.textContent = `Non identifiés (${unknownStudents.length})`;
        list.appendChild(header);
        
        unknownStudents.forEach(student => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900/30 rounded-lg shadow-sm';
            item.innerHTML = `
                <div class="relative size-10 rounded-full overflow-hidden bg-yellow-100">
                    <span class="material-symbols-outlined text-yellow-600">help</span>
                </div>
                <div>
                    <p class="text-sm font-bold flex items-center gap-1">${student.name} <span class="material-symbols-outlined text-yellow-600 text-sm">warning</span></p>
                    <p class="text-xs text-slate-500">À identifier manuellement</p>
                </div>
            `;
            list.appendChild(item);
        });
    }
}

function updateAttendanceStats(faces) {
    const detectedCount = faces.filter(f => f.detected).length;
    const totalCount = 45; // Class size
    const percentage = Math.round((detectedCount / totalCount) * 100);
    
    const progressBar = document.getElementById('attendance-progress');
    const percentText = document.getElementById('attendance-percent');
    const absentText = document.getElementById('attendance-absent');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    if (percentText) {
        percentText.textContent = `${percentage}% Présents`;
    }
    if (absentText) {
        absentText.textContent = `${totalCount - detectedCount} Absents`;
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
