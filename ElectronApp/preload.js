const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  getState: () => ipcRenderer.invoke('desktop:get-state'),
  getSettings: () => ipcRenderer.invoke('desktop:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('desktop:save-settings', settings),
  startServer: () => ipcRenderer.invoke('desktop:start-server'),
  stopServer: () => ipcRenderer.invoke('desktop:stop-server'),
  restartServer: () => ipcRenderer.invoke('desktop:restart-server'),
  openOverlay: (routePath) => ipcRenderer.invoke('desktop:open-overlay', routePath),
  copyText: (text) => ipcRenderer.invoke('desktop:copy-text', text),
  pickFile: (options) => ipcRenderer.invoke('desktop:pick-file', options),
  openLogs: () => ipcRenderer.invoke('desktop:open-logs'),
  runDiagnostics: () => ipcRenderer.invoke('desktop:run-diagnostics'),
  onStateChanged: (listener) => {
    const wrapped = (_, state) => listener(state);
    ipcRenderer.on('desktop:state', wrapped);
    return () => {
      ipcRenderer.removeListener('desktop:state', wrapped);
    };
  },
});
