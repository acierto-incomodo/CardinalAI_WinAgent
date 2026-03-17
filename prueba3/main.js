const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;

// --- INSTANCIA ÚNICA ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Si no obtenemos el "lock", significa que ya hay una instancia abierta
  app.quit();
} else {
  // Escuchar si se intenta abrir una segunda instancia
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Configuración del Auto-Updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = true;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200, height: 800,
      minWidth: 900, minHeight: 600,
      show: false, // No mostrar hasta que esté lista para evitar parpadeos
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: true 
      }
    });

    // --- MAXIMIZAR AL INICIAR ---
    mainWindow.maximize(); 
    mainWindow.show();

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile('index.html');

    // --- Lógica de Actualizaciones ---
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow) {
        const progress = progressObj.percent / 100;
        mainWindow.setProgressBar(progress);
      }
    });

    autoUpdater.on('update-downloaded', () => {
      if (mainWindow) mainWindow.setProgressBar(-1);
      autoUpdater.quitAndInstall(false, true);
    });

    autoUpdater.on('error', (err) => {
      if (mainWindow) mainWindow.setProgressBar(-1);
      console.error("Error en actualización:", err);
    });

    // --- Resto de IPC y Menús ---
    ipcMain.on('update-window-title', (event, title) => {
      mainWindow.setTitle(`CardinalAI Local - ${title}`);
    });

    mainWindow.webContents.on('context-menu', (event, params) => {
      const menu = new Menu();
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion)
        }));
      }
      if (params.dictionarySuggestions.length > 0) menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Cortar', role: 'cut', enabled: params.editFlags.canCut }));
      menu.append(new MenuItem({ label: 'Copiar', role: 'copy', enabled: params.editFlags.canCopy }));
      menu.append(new MenuItem({ label: 'Pegar', role: 'paste', enabled: params.editFlags.canPaste }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Seleccionar todo', role: 'selectAll' }));
      menu.popup();
    });
  }

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// Lógica de IA (LM Studio)
const LM_URL = 'http://127.0.0.1:1234';

ipcMain.handle('chat-with-ai', async (event, messages) => {
  try {
    const response = await fetch(`${LM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature: 0.7, model: "gemma-3-4b-it" })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) { return "Error: Verifica la conexión con LM Studio."; }
});

ipcMain.handle('generate-title', async (event, text) => {
  try {
    const response = await fetch(`${LM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: "system", content: "Crea un título de 2 palabras." }, { role: "user", content: text.substring(0, 100) }],
        max_tokens: 15
      })
    });
    const data = await response.json();
    return data.choices[0].message.content.trim().replace(/[".]/g, '');
  } catch { return "Chat guardado"; }
});