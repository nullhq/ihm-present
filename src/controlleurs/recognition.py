# src/services/recognition.py

import json
import numpy as np
from deepface import DeepFace
from PIL import Image
import io
import os
from src.utils.math import cosine_similarity

DB_PATH = "students.json"
IMAGES_DIR = "images"

# Ensure images dir exists
os.makedirs(IMAGES_DIR, exist_ok=True)

def load_db():
    if os.path.exists(DB_PATH):
        with open(DB_PATH, 'r') as f:
            return json.load(f)
    return {}

def save_db(db):
    with open(DB_PATH, 'w') as f:
        json.dump(db, f, indent=2)

def register_student(name, matricule, photos_list):  # photos_list = list of FileStorage objects
    db = load_db()
    if matricule in db:
        return {"error": "Matricule already exists"}

    # Create student dir
    student_dir = os.path.join(IMAGES_DIR, matricule)
    os.makedirs(student_dir, exist_ok=True)

    embeddings = []
    photo_paths = []
    for idx, photo in enumerate(photos_list, 1):
        # Save photo
        filename = f"photo{idx}.jpg"
        path = os.path.join(student_dir, filename)
        photo.save(path)
        photo_paths.append(path)  # Relative path

        # Process for embedding
        img = Image.open(path)
        img_np = np.array(img)

        faces = DeepFace.extract_faces(img_np, detector_backend="retinaface", enforce_detection=False)
        if not faces:
            continue  # Skip if no face
        face_img = faces[0]["face"]

        emb = DeepFace.represent(face_img, model_name="ArcFace", enforce_detection=False)[0]["embedding"]
        embeddings.append(emb)

    if len(embeddings) < 3:
        # Cleanup if failed
        for path in photo_paths:
            os.remove(path)
        os.rmdir(student_dir)
        return {"error": "Could not detect faces in at least 3 photos"}

    avg_embedding = np.mean(embeddings, axis=0).tolist()

    db[matricule] = {
        "name": name,
        "matricule": matricule,
        "embedding": avg_embedding,
        "photos": photo_paths
    }
    save_db(db)
    return {"success": True, "matricule": matricule}

def scan_image(image_file):  # FileStorage object
    db = load_db()
    known_embs = [np.array(data["embedding"]) for data in db.values()]
    known_matricules = list(db.keys())

    # Read image
    img_bytes = image_file.read()
    img = Image.open(io.BytesIO(img_bytes))
    img_np = np.array(img)

    faces = DeepFace.extract_faces(img_np, detector_backend="retinaface", enforce_detection=False)
    total_detected = len(faces)

    recognized = []
    for face_data in faces:
        face_img = face_data["face"]
        emb = DeepFace.represent(face_img, model_name="ArcFace", enforce_detection=False)[0]["embedding"]
        emb_np = np.array([emb])

        if not known_embs:
            continue

        similarities = cosine_similarity(emb_np, np.array(known_embs))
        max_idx = np.argmax(similarities)
        max_sim = similarities[max_idx]

        if max_sim > 0.48:  # Adjustable threshold
            matricule = known_matricules[max_idx]
            student = db[matricule]
            recognized.append({
                "name": student["name"],
                "matricule": matricule,
                "photo": student["photos"][0]  # Return first photo path as representative
            })

    unknowns = total_detected - len(recognized)

    return {
        "total_presents": total_detected,
        "recognized": recognized,
        "unknowns": unknowns
    }