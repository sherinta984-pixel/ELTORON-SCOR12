const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kabaddiDesktop', {
  openOverlay: (host, port) =>
    ipcRenderer.invoke('overlay:open', { host, port }),

  closeOverlay: () =>
    ipcRenderer.invoke('overlay:close'),

  reportOverlayStatus: (status) =>
    ipcRenderer.send('overlay:status', {
      connected: status?.connected === true,
      message: typeof status?.message === 'string' ? status.message : '',
    }),

  onOverlayStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('overlay:status', listener);
    return () => ipcRenderer.removeListener('overlay:status', listener);
  },
});
