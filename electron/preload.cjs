const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kabaddiDesktop', {
  startOverlayServer: (host, port, design, halfLabel) =>
    ipcRenderer.invoke('overlay:start-server', { host, port, design, halfLabel }),

  stopOverlayServer: () =>
    ipcRenderer.invoke('overlay:stop-server'),

  copyText: (text) =>
    ipcRenderer.invoke('app:copy-text', text),

  onServerStopped: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('overlay:server-stopped', listener);
    return () => ipcRenderer.removeListener('overlay:server-stopped', listener);
  },
});
