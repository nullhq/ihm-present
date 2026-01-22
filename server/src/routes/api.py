# src/routes/api.py

from flask import Blueprint, request, jsonify
from src.services.recognition import register_student, scan_image

api = Blueprint('api', __name__)

# Allowed extensions for images
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@api.route('/register', methods=['POST'])
def register():
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

    if len(valid_photos) < 3:
        return jsonify({"error": "At least 3 valid photos are required"}), 400

    result = register_student(name, matricule, valid_photos)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 201

@api.route('/scan', methods=['POST'])
def scan():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = request.files['image']
    if not image or not allowed_file(image.filename):
        return jsonify({"error": "Invalid image file"}), 400

    result = scan_image(image)
    return jsonify(result), 200