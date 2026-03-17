const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chatWithAI: (messages) => ipcRenderer.invoke('chat-with-ai', messages),
  windowControl: (command) => ipcRenderer.send('window-control', command)
});