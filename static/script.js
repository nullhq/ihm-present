// ====================
// CONFIGURATION API
// ====================
const API_BASE_URL = window.location.origin + '/api';

// ====================
// VARIABLES GLOBALES
// ====================
let currentStream = null;
let capturedPhotos = [];
const MAX_PHOTOS = 5;
let currentPhotoMode = 'camera';
let currentSessionData = null;

// ====================
// API CALLS
// ====================
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erreur API');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function getStudents() {
    return await apiCall('/students');
}

async function getSessions() {
    return await apiCall('/sessions');
}

async function getStats() {
    return await apiCall('/stats');
}

async function registerStudent(formData) {
    return await apiCall('/register', {
        method: 'POST',
        body: formData
    });
}

async function scanImage(formData) {
    return await apiCall('/scan', {
        method: 'POST',
        body: formData
    });
}

async function createSession(sessionData) {
    return await apiCall('/sessions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
    });
}

// ====================
// MOBILE MENU TOGGLE
// ====================
function toggleMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuIcon = document.getElementById('menu-icon');
    
    if (sidebar && overlay && menuIcon) {
        const isHidden = sidebar.classList.contains('hidden');
        
        if (isHidden) {
            sidebar.classList.remove('hidden');
            overlay.classList.remove('hidden');
            menuIcon.textContent = 'close';
        } else {
            sidebar.classList.add('hidden');
            overlay.classList.add('hidden');
            menuIcon.textContent = 'menu';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const sidebar = document.getElementById('mobile-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            const menuIcon = document.getElementById('menu-icon');
            
            if (window.innerWidth < 768) {
                sidebar.classList.add('hidden');
                overlay.classList.add('hidden');
                menuIcon.textContent = 'menu';
            }
        });
    });
    
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', toggleMobileSidebar);
    }
});

// ====================
// ROUTER & NAVIGATION
// ====================
async function router(viewName) {
    const contentContainer = document.getElementById('app-content');
    const template = document.getElementById(`view-${viewName}`);
    
    if (template) {
        stopCamera();
        contentContainer.style.opacity = '0';
        
        setTimeout(async () => {
            contentContainer.innerHTML = '';
            const clone = template.content.cloneNode(true);
            contentContainer.appendChild(clone);
            contentContainer.style.opacity = '1';
            
            // Initialize view with real data
            if (viewName === 'dashboard') {
                await loadDashboardData();
            } else if (viewName === 'register') {
                currentPhotoMode = 'camera';
                capturedPhotos = [];
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
            } else if (viewName === 'review') {
                await loadReviewData();
            }
        }, 150);
        
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
// DASHBOARD - Load Real Data
// ====================
async function loadDashboardData() {
    try {
        const stats = await getStats();
        
        // Update stats in dashboard
        const statsElements = document.querySelectorAll('.text-3xl.font-bold');
        if (statsElements.length >= 3) {
            statsElements[0].textContent = stats.total_students;
            statsElements[1].textContent = stats.total_sessions;
            statsElements[2].textContent = `${stats.attendance_rate}%`;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
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
                console.error("Video play error:", err);
            });
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
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    capturedPhotos.push({
        id: Date.now(),
        dataUrl: photoDataUrl,
        timestamp: new Date().toISOString()
    });
    
    updatePhotosPreview();
    updateProgressBar();
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

// ====================
// SUBMIT REGISTRATION - REAL API CALL
// ====================
async function submitRegistration() {
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
    
    // Show loading
    const submitBtn = event.target;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="animate-spin">⏳</span> Inscription...';
    
    try {
        // Convert base64 images to files
        const formData = new FormData();
        formData.append('name', name);
        formData.append('matricule', id);
        
        for (let i = 0; i < capturedPhotos.length; i++) {
            const photo = capturedPhotos[i];
            const blob = await fetch(photo.dataUrl).then(r => r.blob());
            const file = new File([blob], `photo${i + 1}.jpg`, { type: 'image/jpeg' });
            formData.append('photos', file);
        }
        
        // Call API
        const result = await registerStudent(formData);
        
        alert(`✅ Étudiant ${name} (${id}) inscrit avec succès!`);
        
        // Reset
        capturedPhotos = [];
        document.getElementById('register-name').value = '';
        document.getElementById('register-id').value = '';
        updatePhotosPreview();
        updateProgressBar();
        router('dashboard');
        
    } catch (error) {
        alert(`❌ Erreur lors de l'inscription: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> <span>Enregistrer l\'étudiant</span>';
    }
}

// ====================
// CAPTURE VIEW - Room Photo with REAL API
// ====================
async function initCaptureCamera() {
    const success = await startCamera('capture-video');
    
    if (!success) {
        console.error('Failed to start capture session camera');
    }
}

async function captureRoomPhoto() {
    const video = document.getElementById('capture-video');
    const canvas = document.getElementById('capture-canvas');
    const loadingDiv = document.getElementById('capture-loading');
    const captureBtn = document.getElementById('capture-room-btn');
    
    if (!video || !canvas) return;
    
    // Disable button and show loading
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.innerHTML = '<span class="animate-spin">⏳</span> Analyse...';
    }
    
    if (loadingDiv) {
        loadingDiv.classList.remove('hidden');
    }
    
    // Capture image
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob for API
    canvas.toBlob(async (blob) => {
        try {
            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');
            
            // Call scan API
            const result = await scanImage(formData);
            
            // Store session data
            currentSessionData = result;
            
            // Display results
            const photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            processRoomCapture(photoDataUrl, result);
            
        } catch (error) {
            alert(`❌ Erreur lors du scan: ${error.message}`);
            if (captureBtn) {
                captureBtn.disabled = false;
                captureBtn.innerHTML = '<span class="material-symbols-outlined text-sm">camera</span> Capturer la salle';
            }
        } finally {
            if (loadingDiv) {
                loadingDiv.classList.add('hidden');
            }
        }
    }, 'image/jpeg', 0.95);
}

function processRoomCapture(photoDataUrl, apiResult) {
    const previewContainer = document.getElementById('capture-preview-container');
    const video = document.getElementById('capture-video');
    const captureStats = document.getElementById('capture-stats');
    const status = document.getElementById('capture-status');
    const captureBtn = document.getElementById('capture-room-btn');
    
    if (previewContainer && video) {
        video.style.display = 'none';
        
        const img = document.createElement('img');
        img.src = photoDataUrl;
        img.className = 'w-full h-full object-cover';
        img.id = 'captured-room-image';
        
        previewContainer.innerHTML = '';
        previewContainer.appendChild(img);
    }
    
    // Update UI with real results
    const detectedCount = apiResult.recognized.length;
    const detectedCountEl = document.getElementById('detected-count');
    if (detectedCountEl) {
        detectedCountEl.textContent = detectedCount;
    }
    
    if (captureStats) {
        captureStats.classList.remove('hidden');
    }
    
    if (status) {
        status.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="size-2 bg-green-500 rounded-full"></div>
                <span class="hidden sm:inline">Capture complète - ${detectedCount} étudiants détectés</span>
                <span class="sm:hidden">${detectedCount} détectés</span>
            </div>
        `;
        status.classList.remove('text-yellow-600', 'bg-yellow-100');
        status.classList.add('text-green-600', 'bg-green-100');
    }
    
    // Enable save button
    if (captureBtn) {
        captureBtn.disabled = false;
        captureBtn.innerHTML = '<span class="material-symbols-outlined text-sm">save</span> Enregistrer la séance';
        captureBtn.onclick = saveSession;
    }
    
    // Update sidebar with results
    updateDetectionResults(apiResult.recognized, apiResult.unknowns);
    
    // Update attendance stats
    updateAttendanceStats(apiResult.total_presents, detectedCount);
}

async function saveSession() {
    if (!currentSessionData) {
        alert('Aucune capture à enregistrer');
        return;
    }
    
    try {
        const sessionData = {
            course_name: 'Interface Homme Machine',
            course_code: 'ANI-IA 4057',
            ...currentSessionData
        };
        
        await createSession(sessionData);
        alert('✅ Séance enregistrée avec succès!');
        router('review');
        
    } catch (error) {
        alert(`❌ Erreur lors de l'enregistrement: ${error.message}`);
    }
}

function updateDetectionResults(recognizedStudents, unknownCount) {
    const list = document.getElementById('detected-students-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (recognizedStudents.length === 0 && unknownCount === 0) {
        list.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">Aucun visage détecté</p>';
        return;
    }
    
    // Recognized students
    if (recognizedStudents.length > 0) {
        const header = document.createElement('p');
        header.className = 'text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mt-3';
        header.textContent = `Reconnus (${recognizedStudents.length})`;
        list.appendChild(header);
        
        recognizedStudents.forEach(student => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-900/30 rounded-lg shadow-sm';
            item.innerHTML = `
                <div class="relative size-10 rounded-full overflow-hidden bg-green-100">
                    <img src="/${student.photo}" class="w-full h-full object-cover" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}'">
                    <div class="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                </div>
                <div>
                    <p class="text-sm font-bold">${student.name}</p>
                    <p class="text-xs text-slate-500">Matricule: ${student.matricule}</p>
                </div>
            `;
            list.appendChild(item);
        });
    }
    
    // Unknown students
    if (unknownCount > 0) {
        const header = document.createElement('p');
        header.className = 'text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mt-3';
        header.textContent = `Non identifiés (${unknownCount})`;
        list.appendChild(header);
        
        for (let i = 0; i < unknownCount; i++) {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900/30 rounded-lg shadow-sm';
            item.innerHTML = `
                <div class="relative size-10 rounded-full overflow-hidden bg-yellow-100">
                    <span class="material-symbols-outlined text-yellow-600">help</span>
                </div>
                <div>
                    <p class="text-sm font-bold flex items-center gap-1">Inconnu ${i + 1} <span class="material-symbols-outlined text-yellow-600 text-sm">warning</span></p>
                    <p class="text-xs text-slate-500">À identifier manuellement</p>
                </div>
            `;
            list.appendChild(item);
        }
    }
}

function updateAttendanceStats(totalDetected, recognizedCount) {
    const totalCount = 45; // Could be fetched from API
    const percentage = Math.round((recognizedCount / totalCount) * 100);
    
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
        absentText.textContent = `${totalCount - recognizedCount} Absents`;
    }
}

// ====================
// REVIEW VIEW - Load Real Sessions
// ====================
async function loadReviewData() {
    try {
        const { sessions } = await getSessions();
        const { students: allStudents } = await getStudents();
        
        if (sessions.length === 0) {
            return;
        }
        
        // Get latest session
        const latestSession = sessions[sessions.length - 1];
        
        // Build attendance list
        const attendanceList = allStudents.map(student => {
            const attended = latestSession.students.find(s => s.matricule === student.matricule);
            return {
                ...student,
                present: !!attended,
                time: attended ? latestSession.time : '--:--'
            };
        });
        
        // Update stats
        const presentCount = attendanceList.filter(s => s.present).length;
        const absentCount = attendanceList.length - presentCount;
        const rate = Math.round((presentCount / attendanceList.length) * 100);
        
        // Update DOM
        const statsElements = document.querySelectorAll('.text-3xl.font-bold');
        if (statsElements.length >= 4) {
            statsElements[0].textContent = allStudents.length;
            statsElements[1].textContent = presentCount;
            statsElements[2].textContent = absentCount;
            statsElements[3].textContent = `${rate}%`;
        }
        
        // Update table
        const tbody = document.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
            
            attendanceList.forEach(student => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors';
                row.innerHTML = `
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="size-10 rounded-full bg-slate-200 overflow-hidden">
                                <img src="/${student.photo}" class="w-full h-full object-cover" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}'">
                            </div>
                            <div>
                                <div class="font-bold text-slate-900 dark:text-white">${student.name}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 font-mono text-slate-500">${student.matricule}</td>
                    <td class="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <span class="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-xs">
                            <span class="material-symbols-outlined text-[14px]">schedule</span> ${student.time}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center gap-1 ${student.present ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'} px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            <span class="size-1.5 rounded-full ${student.present ? 'bg-green-500' : 'bg-red-500'}"></span> 
                            ${student.present ? 'Présent' : 'Absent'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button class="text-slate-400 hover:text-primary">
                            <span class="material-symbols-outlined">more_vert</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
    } catch (error) {
        console.error('Error loading review data:', error);
    }
}

// ====================
// INITIALIZATION
// ====================
document.addEventListener('DOMContentLoaded', () => {
    const appContent = document.getElementById('app-content');
    if (appContent) {
        appContent.style.transition = 'opacity 0.2s ease-in-out';
    }
    
    router('dashboard');
});

window.addEventListener('beforeunload', () => {
    stopCamera();
});