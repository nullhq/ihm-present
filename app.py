# app.py

from flask import Flask, send_from_directory
from src.routes.api import api

app = Flask(__name__, static_folder='static', static_url_path='')
app.register_blueprint(api, url_prefix='/api')

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

if __name__ == '__main__':
    app.run(debug=True)