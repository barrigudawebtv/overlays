from flask import Flask, render_template, jsonify
import json
import os

app = Flask(__name__)

def load_bible_data():
    with open('static/bibliaAveMaria.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    biblia_map = {}
    for testamento in ['antigoTestamento', 'novoTestamento']:
        if testamento in data:
            for livro in data[testamento]:
                biblia_map[livro['nome']] = livro['capitulos']
    return biblia_map

@app.route('/')
def dashboard(): return render_template('biblia/dashboard.html')

@app.route('/overlay')
def overlay(): return render_template('biblia/overlay.html')

@app.route('/api/livros')
def get_livros():
    biblia = load_bible_data()
    return jsonify(list(biblia.keys()))

@app.route('/api/conteudo/<livro>/<int:capitulo>')
def get_conteudo(livro, capitulo):
    biblia = load_bible_data()
    livro_data = biblia.get(livro)
    if livro_data:
        cap_obj = next((c for c in livro_data if c['capitulo'] == capitulo), None)
        return jsonify(cap_obj['versiculos'] if cap_obj else [])
    return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)