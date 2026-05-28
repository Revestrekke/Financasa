const path = require('path')
const fs = require('fs/promises')
const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron')
const { createClient } = require('@supabase/supabase-js')

const getStatePath = () => path.join(app.getPath('userData'), 'financasa-state.json')
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fzozyfzzihfltgebmufsp.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_AsxuXAWSH1_6a8KHgqi7sw_7OjYbBC2'
const STATE_ID = process.env.FINANCASA_STATE_ID || 'default'

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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

async function loadSupabaseState() {
  const { data, error } = await supabase
    .from('financasa_state')
    .select('state')
    .eq('id', STATE_ID)
    .maybeSingle()

  if (error) throw error
  return data ? data.state : null
}

async function saveSupabaseState(state) {
  const { error } = await supabase
    .from('financasa_state')
    .upsert({
      id: STATE_ID,
      state,
      updated_at: new Date().toISOString()
    })

  if (error) throw error
}

ipcMain.handle('state:load', async () => {
  const localState = await loadLocalState()

  try {
    const remoteState = await loadSupabaseState()
    if (remoteState) {
      await saveLocalState(remoteState)
      return remoteState
    }

    if (localState) {
      await saveSupabaseState(localState)
      return localState
    }

    return null
  } catch (error) {
    console.error('Falha ao carregar estado do Supabase, usando cache local:', error)
    return localState
  }
})

ipcMain.handle('state:save', async (_event, state) => {
  try {
    await saveLocalState(state)
  } catch (error) {
    console.error('Falha ao salvar cache local:', error)
    return { ok: false, source: 'local', error: error.message }
  }

  try {
    await saveSupabaseState(state)
    return { ok: true, source: 'supabase' }
  } catch (error) {
    console.error('Falha ao salvar estado no Supabase:', error)
    return { ok: false, source: 'local', error: error.message }
  }
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
