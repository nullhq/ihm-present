# src/services/recognition.py

import json
import numpy as np
import cv2
from PIL import Image
import io
import os
from src.utils.math import cosine_similarity

DB_DIR = "db"
DB_PATH = os.path.join(DB_DIR, "students.json")
IMAGES_DIR = os.path.join(DB_DIR, "images")
MODELS_DIR = "models"

# Ensure directories exist
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Paths to model files (you need to download these)
FACE_DETECTOR_PROTOTXT = os.path.join(MODELS_DIR, "deploy.prototxt")
FACE_DETECTOR_MODEL = os.path.join(MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel")
FACE_RECOGNIZER_MODEL = os.path.join(MODELS_DIR, "openface_nn4.small2.v1.t7")

# Load models globally (only once)
face_detector = None
face_recognizer = None

def load_models():
    """Load OpenCV DNN models for face detection and recognition"""
    global face_detector, face_recognizer
    
    if not os.path.exists(FACE_DETECTOR_PROTOTXT) or not os.path.exists(FACE_DETECTOR_MODEL):
        raise FileNotFoundError(
            f"Face detector models not found. Download from:\n"
            f"- deploy.prototxt: https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt\n"
            f"- res10_300x300_ssd_iter_140000.caffemodel: https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel\n"
            f"Place them in '{MODELS_DIR}/' directory"
        )
    
    if not os.path.exists(FACE_RECOGNIZER_MODEL):
        raise FileNotFoundError(
            f"Face recognizer model not found. Download from:\n"
            f"- openface_nn4.small2.v1.t7: https://storage.cmusatyalab.org/openface-models/nn4.small2.v1.t7\n"
            f"Place it in '{MODELS_DIR}/' directory"
        )
    
    face_detector = cv2.dnn.readNetFromCaffe(FACE_DETECTOR_PROTOTXT, FACE_DETECTOR_MODEL)
    face_recognizer = cv2.dnn.readNetFromTorch(FACE_RECOGNIZER_MODEL)
    print("✓ Models loaded successfully")

def detect_faces(image_np, confidence_threshold=0.5):
    """Detect faces in an image using OpenCV DNN
    
    Args:
        image_np: numpy array of the image (BGR format)
        confidence_threshold: minimum confidence for detection
        
    Returns:
        List of face bounding boxes [(x1, y1, x2, y2), ...]
    """
    if face_detector is None:
        load_models()
    
    h, w = image_np.shape[:2]
    
    # Prepare image for detection
    blob = cv2.dnn.blobFromImage(
        cv2.resize(image_np, (300, 300)), 
        1.0, 
        (300, 300), 
        (104.0, 177.0, 123.0)
    )
    
    face_detector.setInput(blob)
    detections = face_detector.forward()
    
    faces = []
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        
        if confidence > confidence_threshold:
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            (x1, y1, x2, y2) = box.astype("int")
            
            # Ensure box is within image bounds
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)
            
            if x2 > x1 and y2 > y1:  # Valid box
                faces.append((x1, y1, x2, y2))
    
    return faces

def get_face_embedding(image_np, face_box):
    """Extract face embedding from a detected face
    
    Args:
        image_np: numpy array of the image (BGR format)
        face_box: tuple (x1, y1, x2, y2) of face location
        
    Returns:
        128-dimensional face embedding vector
    """
    if face_recognizer is None:
        load_models()
    
    x1, y1, x2, y2 = face_box
    face = image_np[y1:y2, x1:x2]
    
    # Prepare face for embedding extraction
    face_blob = cv2.dnn.blobFromImage(
        face, 
        1.0 / 255, 
        (96, 96), 
        (0, 0, 0), 
        swapRB=True, 
        crop=False
    )
    
    face_recognizer.setInput(face_blob)
    embedding = face_recognizer.forward()
    
    return embedding.flatten()

def load_db():
    if os.path.exists(DB_PATH):
        with open(DB_PATH, 'r') as f:
            return json.load(f)
    return {}

def save_db(db):
    with open(DB_PATH, 'w') as f:
        json.dump(db, f, indent=2)

def register_student(name, matricule, photos_list):
    """Register a new student with multiple photos
    
    Args:
        name: student name
        matricule: student ID
        photos_list: list of FileStorage objects (uploaded photos)
        
    Returns:
        dict with success/error status
    """
    db = load_db()
    if matricule in db:
        return {"error": "Matricule already exists"}

    # Ensure models are loaded
    if face_detector is None or face_recognizer is None:
        try:
            load_models()
        except FileNotFoundError as e:
            return {"error": str(e)}

    # Create student directory
    student_dir = os.path.join(IMAGES_DIR, matricule)
    os.makedirs(student_dir, exist_ok=True)

    embeddings = []
    photo_paths = []
    
    for idx, photo in enumerate(photos_list, 1):
        # Save photo
        filename = f"photo{idx}.jpg"
        path = os.path.join(student_dir, filename)
        photo.save(path)
        photo_paths.append(path)

        # Load image with OpenCV
        img = cv2.imread(path)
        
        # Detect faces
        faces = detect_faces(img)
        
        if not faces:
            continue  # Skip if no face detected
        
        # Use the first (largest) face detected
        face_box = faces[0]
        
        # Extract embedding
        embedding = get_face_embedding(img, face_box)
        embeddings.append(embedding)

    if len(embeddings) < 3:
        # Cleanup if failed
        for path in photo_paths:
            if os.path.exists(path):
                os.remove(path)
        if os.path.exists(student_dir):
            os.rmdir(student_dir)
        return {"error": "Could not detect faces in at least 3 photos"}

    # Average embeddings for better accuracy
    avg_embedding = np.mean(embeddings, axis=0).tolist()

    db[matricule] = {
        "name": name,
        "matricule": matricule,
        "embedding": avg_embedding,
        "photos": photo_paths
    }
    save_db(db)
    return {"success": True, "matricule": matricule}

def scan_image(image_file):
    """Scan an image for registered students
    
    Args:
        image_file: FileStorage object (uploaded image)
        
    Returns:
        dict with total_presents, recognized students, and unknowns count
    """
    db = load_db()
    
    # Ensure models are loaded
    if face_detector is None or face_recognizer is None:
        try:
            load_models()
        except FileNotFoundError as e:
            return {"error": str(e)}
    
    known_embs = [np.array(data["embedding"]) for data in db.values()]
    known_matricules = list(db.keys())

    # Read image
    img_bytes = image_file.read()
    img_pil = Image.open(io.BytesIO(img_bytes))
    
    # Convert PIL to OpenCV format (BGR)
    img_np = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

    # Detect all faces
    faces = detect_faces(img_np)
    total_detected = len(faces)

    recognized = []
    
    if total_detected > 0:
        for face_box in faces:
            # Extract embedding for this face
            face_embedding = get_face_embedding(img_np, face_box)
            
            if not known_embs:
                continue

            # Compare with known embeddings
            emb_np = np.array([face_embedding])
            similarities = cosine_similarity(emb_np, np.array(known_embs))
            max_idx = np.argmax(similarities)
            max_sim = similarities[max_idx]

            # Adjustable threshold (0.48 works well with OpenFace)
            if max_sim > 0.48:
                matricule = known_matricules[max_idx]
                student = db[matricule]
                recognized.append({
                    "name": student["name"],
                    "matricule": matricule,
                    "photo": student["photos"][0]  # First photo as representative
                })

    unknowns = total_detected - len(recognized)

    return {
        "total_presents": total_detected,
        "recognized": recognized,
        "unknowns": unknowns
    }