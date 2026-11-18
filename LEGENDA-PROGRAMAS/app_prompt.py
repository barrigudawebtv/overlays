from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# Armazena o estado atual para que se você atualizar a tela, ele não perca o texto
estado = {
    "texto": "<h1>BEM-VINDO!</h1>\nComece a digitar no seu dashboard.",
    "velocidade": 2,
    "fonte": 60,
    "rodando": False
}

@app.route('/')
def dashboard():
    return render_template('teleprompt/dash.html')

@app.route('/prompter')
def prompter():
    return render_template('teleprompt/prompt.html')

@socketio.on('sincronizar')
def handle_sync(data):
    global estado
    estado.update(data)
    emit('atualizar_prompter', estado, broadcast=True)

@socketio.on('comando')
def handle_command(data):
    emit('executar_comando', data, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5002)