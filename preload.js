const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('simpleGhost', {
  onAnalysisEvent(callback) {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('analysis:event', listener);
    return () => ipcRenderer.removeListener('analysis:event', listener);
  },
  resizeWindow(size) {
    return ipcRenderer.invoke('window:resize', {
      width: Number(size?.width),
      height: Number(size?.height)
    });
  },
  runAction(action) {
    return ipcRenderer.invoke('app:action', action);
  }
});
