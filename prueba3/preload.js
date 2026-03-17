const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data), // Para el título
  chatWithAI: (messages) => ipcRenderer.invoke('chat-with-ai', messages),
  generateTitle: (text) => ipcRenderer.invoke('generate-title', text)
});