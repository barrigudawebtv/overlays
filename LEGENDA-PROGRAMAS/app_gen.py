import json
import sqlite3

# Configurações de arquivos
JSON_FILE = 'static/bibliaAveMaria.json'
DB_FILE = 'biblia_ave_maria.db'

def setup_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # No SQLite, INTEGER PRIMARY KEY já funciona como auto incremento
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS livros (
        id INTEGER PRIMARY KEY, 
        nome TEXT NOT NULL,
        testamento TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS versos (
        id INTEGER PRIMARY KEY,
        livro_id INTEGER,
        capitulo INTEGER,
        versiculo INTEGER,
        texto TEXT,
        FOREIGN KEY (livro_id) REFERENCES livros (id)
    )
    ''')
    
    return conn, cursor

def import_data():
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Erro: O arquivo {JSON_FILE} não foi encontrado.")
        return

    conn, cursor = setup_database()

    testamentos = {
        "antigoTestamento": "ANTIGO",
        "novoTestamento": "NOVO"
    }

    print("Iniciando importação...")

    for key, label in testamentos.items():
        if key in data:
            for livro_data in data[key]:
                nome_livro = livro_data['nome']
                
                # Inserir livro
                cursor.execute('INSERT INTO livros (nome, testamento) VALUES (?, ?)', (nome_livro, label))
                livro_id = cursor.lastrowid

                # Iterar pelos capítulos e versículos
                for cap_data in livro_data.get('capitulos', []):
                    num_capitulo = cap_data['capitulo']
                    for verso_data in cap_data.get('versiculos', []):
                        num_versiculo = verso_data['versiculo']
                        texto = verso_data['texto']

                        cursor.execute('''
                            INSERT INTO versos (livro_id, capitulo, versiculo, texto)
                            VALUES (?, ?, ?, ?)
                        ''', (livro_id, num_capitulo, num_versiculo, texto))

    conn.commit()
    conn.close()
    print(f"Sucesso! Banco de dados '{DB_FILE}' criado e populado.")

if __name__ == "__main__":
    import_data()