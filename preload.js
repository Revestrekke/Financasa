const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('financasaStorage', {
  load: () => ipcRenderer.invoke('state:load'),
  save: (state) => ipcRenderer.invoke('state:save', state)
})
