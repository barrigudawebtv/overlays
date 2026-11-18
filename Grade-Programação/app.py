from flask import Flask, request, jsonify, render_template
import sqlite3
import json

app = Flask(__name__)
DB_NAME = 'barriguda_tv.db'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS programas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            horario TEXT,
            nomeArtistico TEXT,
            nomePrograma TEXT,
            categorias TEXT,
            frequencia TEXT,
            dias TEXT,
            alerta BOOLEAN
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/programas', methods=['GET'])
def get_programas():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM programas ORDER BY horario ASC')
    rows = c.fetchall()
    conn.close()
    
    programas = []
    for row in rows:
        prog = dict(row)
        prog['categorias'] = json.loads(prog['categorias'])
        prog['dias'] = json.loads(prog['dias'])
        prog['alerta'] = bool(prog['alerta'])
        programas.append(prog)
        
    return jsonify(programas)

@app.route('/api/programas', methods=['POST'])
def create_programa():
    data = request.json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        INSERT INTO programas (horario, nomeArtistico, nomePrograma, categorias, frequencia, dias, alerta)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['horario'], 
        data['nomeArtistico'], 
        data['nomePrograma'], 
        json.dumps(data.get('categorias', [])), 
        data['frequencia'], 
        json.dumps(data.get('dias', [])), 
        data.get('alerta', False)
    ))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    
    data['id'] = new_id
    return jsonify(data), 201

@app.route('/api/programas/<int:id>', methods=['PUT'])
def update_programa(id):
    data = request.json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        UPDATE programas
        SET horario=?, nomeArtistico=?, nomePrograma=?, categorias=?, frequencia=?, dias=?, alerta=?
        WHERE id=?
    ''', (
        data['horario'], 
        data['nomeArtistico'], 
        data['nomePrograma'], 
        json.dumps(data.get('categorias', [])), 
        data['frequencia'], 
        json.dumps(data.get('dias', [])), 
        data.get('alerta', False), 
        id
    ))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/programas/<int:id>', methods=['DELETE'])
def delete_programa(id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('DELETE FROM programas WHERE id=?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5050)