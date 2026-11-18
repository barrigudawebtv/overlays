import sqlite3
import time
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
DATABASE = 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS match_state (
                id INTEGER PRIMARY KEY,
                team_a_name TEXT, team_b_name TEXT,
                score_a INTEGER, score_b INTEGER,
                status TEXT, stoppage_time INTEGER,
                start_timestamp REAL, accumulated_seconds REAL,
                is_running INTEGER
            )
        ''')
        # Inicializa se estiver vazio
        if not conn.execute('SELECT id FROM match_state WHERE id = 1').fetchone():
            conn.execute('''
                INSERT INTO match_state (id, team_a_name, team_b_name, score_a, score_b, status, is_running, accumulated_seconds)
                VALUES (1, 'TIME A', 'TIME B', 0, 0, '1º TEMPO', 0, 0)
            ''')
        conn.commit()

@app.route('/')
def index(): return render_template('placar.html')

@app.route('/admin')
def admin(): return render_template('admin.html')

@app.route('/api/match', methods=['GET'])
def get_match():
    with get_db_connection() as conn:
        row = conn.execute('SELECT * FROM match_state WHERE id = 1').fetchone()
        data = dict(row)
        
        # Calcula o tempo atualizado se estiver rodando
        if data['is_running']:
            elapsed = time.time() - data['start_timestamp']
            data['current_seconds'] = data['accumulated_seconds'] + elapsed
        else:
            data['current_seconds'] = data['accumulated_seconds']
            
        return jsonify(data)

@app.route('/api/update', methods=['POST'])
def update_match():
    data = request.json
    allowed_fields = ['team_a_name', 'team_b_name', 'score_a', 'score_b', 'status', 'stoppage_time']
    
    updates = []
    values = []
    for field in allowed_fields:
        if field in data:
            updates.append(f"{field} = ?")
            values.append(data[field])
    
    if not updates: return jsonify({"error": "No valid fields"}), 400
    
    values.append(1) # ID = 1
    with get_db_connection() as conn:
        conn.execute(f"UPDATE match_state SET {', '.join(updates)} WHERE id = 1", values)
        conn.commit()
    return jsonify({"status": "success"})

@app.route('/api/timer/<action>', methods=['POST'])
def control_timer(action):
    with get_db_connection() as conn:
        state = conn.execute('SELECT * FROM match_state WHERE id = 1').fetchone()
        now = time.time()
        
        if action == 'start' and not state['is_running']:
            conn.execute('UPDATE match_state SET is_running = 1, start_timestamp = ? WHERE id = 1', (now,))
        elif action == 'pause' and state['is_running']:
            new_accumulated = state['accumulated_seconds'] + (now - state['start_timestamp'])
            conn.execute('UPDATE match_state SET is_running = 0, accumulated_seconds = ? WHERE id = 1', (new_accumulated,))
        elif action == 'reset':
            conn.execute('UPDATE match_state SET is_running = 0, accumulated_seconds = 0 WHERE id = 1')
            
        conn.commit()
    return jsonify({"status": "success"})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5010)