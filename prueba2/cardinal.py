import whisper
import sounddevice as sd
from scipy.io.wavfile import write
import requests
import subprocess
import json
import time
import threading

from PySide6.QtWidgets import QApplication, QWidget, QVBoxLayout, QTextEdit, QPushButton

MODEL_NAME = "qwen2.5-7b-instruct"

PIPER_MODEL = "es_ES-davefx-medium.onnx"

IA_URL = "http://localhost:1234/v1/chat/completions"

historial = [
    {"role":"system","content":"Eres Cardinal, el asistente de voz personal de Aitor. Responde de forma clara y natural."}
]

print("Cargando Whisper...")
whisper_model = whisper.load_model("base")

def grabar_audio():

    fs = 16000
    segundos = 5

    print("Escuchando...")

    audio = sd.rec(int(segundos * fs), samplerate=fs, channels=1)
    sd.wait()

    write("input.wav", fs, audio)

def voz_a_texto():

    result = whisper_model.transcribe("input.wav")

    return result["text"].lower()

def preguntar_ia(pregunta):

    historial.append({"role":"user","content":pregunta})

    r = requests.post(
        IA_URL,
        json={
            "model": MODEL_NAME,
            "messages": historial
        }
    )

    respuesta = r.json()["choices"][0]["message"]["content"]

    historial.append({"role":"assistant","content":respuesta})

    return respuesta

def hablar(texto):

    subprocess.run(
        ["piper","--model",PIPER_MODEL,"--output_file","respuesta.wav"],
        input=texto.encode()
    )

    subprocess.run(["ffplay","-nodisp","-autoexit","respuesta.wav"])

def ciclo_asistente(chat):

    while True:

        grabar_audio()

        texto = voz_a_texto()

        print("Tu:", texto)

        chat.append("Tu: "+texto)

        if "cardinal" in texto:

            hablar("Sí Aitor, te escucho")

            grabar_audio()

            pregunta = voz_a_texto()

            chat.append("Tu: "+pregunta)

            respuesta = preguntar_ia(pregunta)

            chat.append("Cardinal: "+respuesta)

            hablar(respuesta)

class Ventana(QWidget):

    def __init__(self):

        super().__init__()

        self.setWindowTitle("Cardinal AI")

        layout = QVBoxLayout()

        self.chat = QTextEdit()
        self.chat.setReadOnly(True)

        btn = QPushButton("Iniciar asistente")

        btn.clicked.connect(self.iniciar)

        layout.addWidget(self.chat)
        layout.addWidget(btn)

        self.setLayout(layout)

    def iniciar(self):

        hilo = threading.Thread(target=ciclo_asistente,args=(self.chat,))
        hilo.daemon = True
        hilo.start()

app = QApplication([])

ventana = Ventana()
ventana.resize(500,600)
ventana.show()

app.exec()