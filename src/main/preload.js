const { contextBridge, ipcRenderer } = require("electron");

/**
 * Expose safe IPC methods to renderer process
 */
contextBridge.exposeInMainWorld("electronAPI", {
  // Invoke methods (renderer -> main)
  getDevices: () => ipcRenderer.invoke("get-devices"),
  startBot: () => ipcRenderer.invoke("start-bot"),
  stopBot: () => ipcRenderer.invoke("stop-bot"),
  refreshDevices: () => ipcRenderer.invoke("refresh-devices"),
  checkADB: () => ipcRenderer.invoke("check-adb"),

  // Listen methods (main -> renderer)
  onLogUpdate: (callback) => {
    ipcRenderer.on("log-update", (event, logEntry) => callback(logEntry));
  },
  onStatusUpdate: (callback) => {
    ipcRenderer.on("status-update", (event, status) => callback(status));
  },
  onDevicesUpdated: (callback) => {
    ipcRenderer.on("devices-updated", (event, devices) => callback(devices));
  },
});
