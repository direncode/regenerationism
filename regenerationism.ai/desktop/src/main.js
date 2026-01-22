const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const path = require('path')
const Store = require('electron-store')

// Initialize persistent storage
const store = new Store({
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    lastCompany: null,
    recentAnalyses: [],
    theme: 'dark'
  }
})

let mainWindow = null

function createWindow() {
  const { width, height } = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0a',
      symbolColor: '#ffffff',
      height: 40
    },
    show: false
  })

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Save window bounds on resize
  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds()
    store.set('windowBounds', { width, height })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Create application menu
  const menu = Menu.buildFromTemplate(getMenuTemplate())
  Menu.setApplicationMenu(menu)
}

function getMenuTemplate() {
  return [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Analysis',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new-analysis')
        },
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu-export')
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu-settings')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'NIV Overview',
          click: () => mainWindow?.webContents.send('navigate', 'overview')
        },
        {
          label: 'Component Analysis',
          click: () => mainWindow?.webContents.send('navigate', 'components')
        },
        {
          label: 'Third-Order Engine',
          click: () => mainWindow?.webContents.send('navigate', 'engine')
        },
        {
          label: 'S&P 500 Analysis',
          click: () => mainWindow?.webContents.send('navigate', 'sp500')
        },
        {
          label: 'AI Decision Engine',
          click: () => mainWindow?.webContents.send('navigate', 'ai-engine')
        },
        {
          label: 'Data Provenance',
          click: () => mainWindow?.webContents.send('navigate', 'provenance')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Analysis',
      submenu: [
        {
          label: 'Run NIV Calculation',
          accelerator: 'F5',
          click: () => mainWindow?.webContents.send('run-analysis')
        },
        {
          label: 'Generate AI Insights',
          accelerator: 'F6',
          click: () => mainWindow?.webContents.send('run-ai-analysis')
        },
        {
          label: 'Fetch S&P 500 Data',
          accelerator: 'F7',
          click: () => mainWindow?.webContents.send('fetch-sp500')
        },
        { type: 'separator' },
        {
          label: 'Clear All Data',
          click: () => mainWindow?.webContents.send('clear-data')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://regenerationism.ai/methodology')
        },
        {
          label: 'NIV Formula Reference',
          click: () => mainWindow?.webContents.send('show-formula-help')
        },
        { type: 'separator' },
        {
          label: 'About Regenerationism NIV',
          click: () => mainWindow?.webContents.send('show-about')
        }
      ]
    }
  ]
}

// IPC Handlers
ipcMain.handle('store-get', (event, key) => store.get(key))
ipcMain.handle('store-set', (event, key, value) => store.set(key, value))
ipcMain.handle('get-version', () => app.getVersion())

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
