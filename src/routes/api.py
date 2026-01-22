# src/routes/api.py

from flask import Blueprint, request, jsonify
from src.controlleurs.recognition import register_student, scan_image, load_db
from datetime import datetime
import json
import os

api = Blueprint('api', __name__)

# Allowed extensions for images
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_DIR = os.path.join(BASE_DIR, "db")
SESSIONS_FILE = os.path.join(DB_DIR, "sessions.json")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_sessions():
    """Load attendance sessions from file"""
    if os.path.exists(SESSIONS_FILE):
        with open(SESSIONS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_sessions(sessions):
    """Save attendance sessions to file"""
    os.makedirs(os.path.dirname(SESSIONS_FILE), exist_ok=True)
    with open(SESSIONS_FILE, 'w') as f:
        json.dump(sessions, f, indent=2)

@api.route('/register', methods=['POST'])
def register():
    """Register a new student with photos"""
    name = request.form.get('name')
    matricule = request.form.get('matricule')
    photos = request.files.getlist('photos')

    if not name or not matricule:
        return jsonify({"error": "Name and matricule are required"}), 400

    if len(photos) < 3:
        return jsonify({"error": "At least 3 photos are required"}), 400

    valid_photos = []
    for photo in photos:
        if photo and allowed_file(photo.filename):
            valid_photos.append(photo)
        else:
            return jsonify({"error": f"Invalid file: {photo.filename}"}), 400
        
    print(valid_photos)
    
    if len(valid_photos) < 3:
        return jsonify({"error": "At least 3 valid photos are required"}), 400

    result = register_student(name, matricule, valid_photos)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 201

@api.route('/scan', methods=['POST'])
def scan():
    """Scan an image for attendance detection"""
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = request.files['image']
    if not image or not allowed_file(image.filename):
        return jsonify({"error": "Invalid image file"}), 400

    result = scan_image(image)
    
    if "error" in result:
        return jsonify(result), 400
    
    return jsonify(result), 200

@api.route('/students', methods=['GET'])
def get_students():
    """Get list of all registered students"""
    db = load_db()
    
    students = []
    for matricule, data in db.items():
        students.append({
            "name": data["name"],
            "matricule": matricule,
            "photo": data["photos"][0] if data["photos"] else None,
            "registered_date": "2025-01-20"  # Could be stored in DB
        })
    
    return jsonify({
        "total": len(students),
        "students": students
    }), 200

@api.route('/sessions', methods=['GET'])
def get_sessions():
    """Get list of all attendance sessions"""
    sessions = load_sessions()
    return jsonify({
        "total": len(sessions),
        "sessions": sessions
    }), 200

@api.route('/sessions', methods=['POST'])
def create_session():
    """Create a new attendance session"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    course_name = data.get('course_name', 'Interface Homme Machine')
    course_code = data.get('course_code', 'ANI-IA 4057')
    detected_students = data.get('recognized', [])
    total_detected = data.get('total_presents', 0)
    unknowns = data.get('unknowns', 0)
    
    # Create session object
    session = {
        "id": f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "date": datetime.now().strftime('%Y-%m-%d'),
        "time": datetime.now().strftime('%H:%M'),
        "course_name": course_name,
        "course_code": course_code,
        "total_detected": total_detected,
        "recognized_count": len(detected_students),
        "unknown_count": unknowns,
        "students": detected_students,
        "created_at": datetime.now().isoformat()
    }
    
    # Load existing sessions
    sessions = load_sessions()
    sessions.append(session)
    
    # Save updated sessions
    save_sessions(sessions)
    
    return jsonify({
        "success": True,
        "session": session
    }), 201

@api.route('/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics"""
    db = load_db()
    sessions = load_sessions()
    
    total_students = len(db)
    total_sessions = len(sessions)
    
    # Calculate attendance rate
    if total_sessions > 0:
        total_recognized = sum(s.get('recognized_count', 0) for s in sessions)
        total_possible = total_sessions * total_students
        attendance_rate = round((total_recognized / total_possible * 100) if total_possible > 0 else 0, 1)
    else:
        attendance_rate = 0
    
    # Today's sessions
    today = datetime.now().strftime('%Y-%m-%d')
    today_sessions = [s for s in sessions if s.get('date') == today]
    
    return jsonify({
        "total_students": total_students,
        "total_sessions": len(today_sessions),
        "attendance_rate": attendance_rate,
        "latest_session": sessions[-1] if sessions else None
    }), 200