# app.py
import os
from flask import Flask, send_from_directory
from src.routes.api import api

app = Flask(__name__, static_folder='static', static_url_path='')
app.register_blueprint(api, url_prefix='/api')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # 16 MB limit

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)