const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    minWidth: 900, minHeight: 600,
    transparent: true, frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

const LM_URL = 'http://127.0.0.1:1234';

ipcMain.handle('chat-with-ai', async (event, messages) => {
  try {
    const response = await fetch(`${LM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        temperature: 0.7,
        stream: false
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return "Error: No se pudo conectar con LM Studio. Verifica el servidor en el puerto 1234.";
  }
});

ipcMain.handle('generate-title', async (event, text) => {
  try {
    // Pequeña pausa para no saturar la API de LM Studio
    await new Promise(r => setTimeout(r, 500));
    const response = await fetch(`${LM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Resume en 2 palabras." },
          { role: "user", content: text }
        ],
        max_tokens: 10
      })
    });
    const data = await response.json();
    return data.choices[0].message.content.trim().replace(/[".]/g, '');
  } catch {
    return "Chat";
  }
});

ipcMain.on('window-control', (event, cmd) => {
  if (cmd === 'close') mainWindow.close();
  if (cmd === 'minimize') mainWindow.minimize();
  if (cmd === 'maximize') mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});