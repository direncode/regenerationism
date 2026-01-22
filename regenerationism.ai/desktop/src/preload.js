const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Storage
  getStore: (key) => ipcRenderer.invoke('store-get', key),
  setStore: (key, value) => ipcRenderer.invoke('store-set', key, value),

  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Menu events
  onMenuNewAnalysis: (callback) => ipcRenderer.on('menu-new-analysis', callback),
  onMenuExport: (callback) => ipcRenderer.on('menu-export', callback),
  onMenuSettings: (callback) => ipcRenderer.on('menu-settings', callback),
  onNavigate: (callback) => ipcRenderer.on('navigate', (event, tab) => callback(tab)),
  onRunAnalysis: (callback) => ipcRenderer.on('run-analysis', callback),
  onRunAIAnalysis: (callback) => ipcRenderer.on('run-ai-analysis', callback),
  onFetchSP500: (callback) => ipcRenderer.on('fetch-sp500', callback),
  onClearData: (callback) => ipcRenderer.on('clear-data', callback),
  onShowFormulaHelp: (callback) => ipcRenderer.on('show-formula-help', callback),
  onShowAbout: (callback) => ipcRenderer.on('show-about', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})
