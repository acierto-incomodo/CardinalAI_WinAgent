const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    minWidth: 900, minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true // Habilita el corrector ortográfico nativo
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');

  // Menú de Clic Derecho (Context Menu)
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    // Agregar sugerencias ortográficas
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(new MenuItem({
        label: suggestion,
        click: () => mainWindow.webContents.replaceMisspelling(suggestion)
      }));
    }

    if (params.dictionarySuggestions.length > 0) {
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Acciones estándar de edición
    menu.append(new MenuItem({ label: 'Cortar', role: 'cut', enabled: params.editFlags.canCut }));
    menu.append(new MenuItem({ label: 'Copiar', role: 'copy', enabled: params.editFlags.canCopy }));
    menu.append(new MenuItem({ label: 'Pegar', role: 'paste', enabled: params.editFlags.canPaste }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ label: 'Seleccionar todo', role: 'selectAll' }));

    menu.popup();
  });
}

app.whenReady().then(createWindow);

// ... (El resto de tus manejadores ipcMain 'chat-with-ai' y 'generate-title' se mantienen igual)
const LM_URL = 'http://127.0.0.1:1234';

ipcMain.handle('chat-with-ai', async (event, messages) => {
  try {
    const response = await fetch(`${LM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages, temperature: 0.7, model: "gemma-3-4b-it" })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) { return "Error: No se pudo conectar con el modelo."; }
});

ipcMain.handle('generate-title', async (event, text) => {
  try {
    const response = await fetch(`${LM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: "system", content: "Resume en 2 palabras." }, { role: "user", content: text.substring(0, 100) }],
        max_tokens: 10
      })
    });
    const data = await response.json();
    return data.choices[0].message.content.trim().replace(/[".]/g, '');
  } catch { return "Nuevo Chat"; }
});