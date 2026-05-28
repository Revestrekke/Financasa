const path = require('path')
const fs = require('fs/promises')
const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron')

const getStatePath = () => path.join(app.getPath('userData'), 'financasa-state.json')

async function loadLocalState() {
  try {
    const data = await fs.readFile(getStatePath(), 'utf8')
    return JSON.parse(data)
  } catch (error) {
    if (error && error.code === 'ENOENT') return null
    console.error('Falha ao carregar estado local:', error)
    return null
  }
}

async function saveLocalState(state) {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(getStatePath(), JSON.stringify(state, null, 2), 'utf8')
}

ipcMain.handle('state:load', async () => {
  return loadLocalState()
})

ipcMain.handle('state:save', async (_event, state) => {
  try {
    await saveLocalState(state)
  } catch (error) {
    console.error('Falha ao salvar cache local:', error)
    return { ok: false, source: 'local', error: error.message }
  }

  return { ok: true, source: 'local' }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    const allowedUrl = new URL(`file://${path.join(__dirname, 'index.html')}`).toString()
    if (url !== allowedUrl) {
      event.preventDefault()
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
