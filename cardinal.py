import os
import sys
import threading
import pythoncom
import requests
import speech_recognition as sr
import webbrowser
import string
from win32com.client import Dispatch
import pystray
from PIL import Image
import win32event
import win32api
import win32con

# ==============================
# BLOQUEAR INSTANCIA ÚNICA
# ==============================
mutex = win32event.CreateMutex(None, False, "CardinalAI_WinAgent_SingleInstanceMutex")
if win32api.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
    print("Ya hay una instancia de CardinalAI - WinAgent ejecutándose.")
    sys.exit(0)

# ==============================
# CONFIG
# ==============================
API_URL = "http://localhost:1234/v1/chat/completions"
MODEL_NAME = "meta-llama-3-8b-instruct"

START_MENU_FOLDERS = [
    r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs",
    os.path.expandvars(r"%AppData%\Microsoft\Windows\Start Menu\Programs")
]

ALIASES = {
    "discord": ["discord"],
    "steam": ["steam"],
    "spotify": ["spotify"],
    "notepad": ["notepad", "bloc de notas"],
    "minecraft": ["minecraft", "launcher minecraft"]
}

WAKE_WORDS = ["cardinal", "oye cardinal", "hey cardinal"]
ACTION_WORDS = ["abre", "muestra", "lanza", "inicia", "ejecuta", "run", "show"]

# ==============================
# ICONO
# ==============================
if getattr(sys, 'frozen', False):
    ICON_PATH = os.path.join(sys._MEIPASS, "cardinal.ico")
else:
    ICON_PATH = "cardinal.ico"

stop_event = threading.Event()

# ==============================
# FUNCIONES (igual que tu código anterior)
# ==============================
def ask_llm(text):
    try:
        response = requests.post(API_URL, json={
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": "You are Cardinal AI, an assistant that converts user commands into short actionable instructions."},
                {"role": "user", "content": text}
            ],
            "temperature": 0.2
        }, timeout=10)
        return response.json()['choices'][0]['message']['content'].lower()
    except:
        return text.lower()

def build_shortcut_dict():
    pythoncom.CoInitialize()
    shortcuts = {}
    for folder in START_MENU_FOLDERS:
        for root, dirs, files in os.walk(folder):
            for file in files:
                if file.endswith(".lnk"):
                    name = os.path.splitext(file)[0].lower()
                    path = os.path.join(root, file)
                    try:
                        shell = Dispatch('WScript.Shell')
                        shortcut = shell.CreateShortcut(path)
                        shortcuts[name] = shortcut.TargetPath
                    except:
                        continue
    return shortcuts

def execute_command(command, shortcuts):
    print("Comando interpretado:", command)
    command_clean = command.translate(str.maketrans('', '', string.punctuation)).lower()
    for prog, keys in ALIASES.items():
        for key in keys:
            if key in command_clean:
                for sc_name, sc_path in shortcuts.items():
                    if key in sc_name.lower():
                        if os.path.exists(sc_path):
                            os.startfile(sc_path)
                        else:
                            print(f"No se encontró la ruta de {sc_name}: {sc_path}")
                        return
    if any(word in command_clean for word in ACTION_WORDS):
        palabras = command_clean.split()
        for p in palabras:
            if "." in p:
                if not p.startswith("http"):
                    p = "https://" + p
                webbrowser.open(p)
                return
        if "youtube" in command_clean:
            webbrowser.open("https://youtube.com")
            return
        if "google" in command_clean:
            webbrowser.open("https://google.com")
            return
    if "apaga" in command_clean:
        os.system("shutdown /s /t 5")
    elif "reinicia" in command_clean:
        os.system("shutdown /r /t 5")
    else:
        print("No entiendo el comando.")

# ==============================
# HILO DE ASISTENTE
# ==============================
def assistant_thread():
    recognizer = sr.Recognizer()
    recognizer.energy_threshold = 300
    recognizer.dynamic_energy_threshold = True

    shortcuts = build_shortcut_dict()
    print(f"Cardinal cargó {len(shortcuts)} accesos directos del menú de inicio.")
    print("Cardinal activado... di 'Cardinal' para empezar.")

    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source)

        while not stop_event.is_set():
            try:
                audio = recognizer.listen(source, phrase_time_limit=4)
                try:
                    text = recognizer.recognize_google(audio, language="es-ES").lower()
                except sr.UnknownValueError:
                    continue
                except sr.RequestError:
                    print("Error de conexión con reconocimiento de voz.")
                    continue

                if any(w in text for w in WAKE_WORDS):
                    print("Activado por:", text)
                    active_command = ""
                    while True:
                        try:
                            audio_cont = recognizer.listen(source, phrase_time_limit=4)
                            try:
                                phrase = recognizer.recognize_google(audio_cont, language="es-ES").lower()
                            except sr.UnknownValueError:
                                break
                            active_command += " " + phrase
                        except sr.WaitTimeoutError:
                            break
                    active_command = active_command.strip()
                    if active_command:
                        respuesta = ask_llm(active_command)
                        execute_command(respuesta, shortcuts)
            except KeyboardInterrupt:
                break

# ==============================
# ICONO DE LA BANDEJA
# ==============================
def on_quit(icon, item):
    stop_event.set()
    icon.stop()

def on_restart(icon, item):
    stop_event.set()
    icon.stop()
    os.execl(sys.executable, sys.executable, *sys.argv)

assistant = threading.Thread(target=assistant_thread, daemon=True)
assistant.start()

menu = pystray.Menu(
    pystray.MenuItem("Reiniciar", on_restart),
    pystray.MenuItem("Cerrar", on_quit)
)

icon_image = Image.open(ICON_PATH)
icon = pystray.Icon("Cardinal", icon_image, "CardinalAI - WinAgent", menu)
icon.run()
