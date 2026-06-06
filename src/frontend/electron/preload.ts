import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('aivis', {
  sendMessage: (message: string) => ipcRenderer.invoke('send-message', message),
  onResponse: (callback: (text: string) => void) =>
    ipcRenderer.on('ai-response', (_event, text) => callback(text)),
});
