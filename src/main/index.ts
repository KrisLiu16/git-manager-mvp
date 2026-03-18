import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerGitHandlers } from './git'
import { FileWatcher } from './watcher'
import simpleGit from 'simple-git'

// Per-window watchers: windowId -> Map<repoPath, watcher>
const windowWatchers = new Map<number, Map<string, FileWatcher>>()

// Auto-fetch interval (3 minutes)
const AUTO_FETCH_INTERVAL = 3 * 60 * 1000
let autoFetchTimer: NodeJS.Timeout | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 10 },
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.setTitle('Git Manager')

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  windowWatchers.set(win.id, new Map())

  win.on('closed', () => {
    const watchers = windowWatchers.get(win.id)
    if (watchers) {
      for (const w of watchers.values()) w.stop()
      windowWatchers.delete(win.id)
    }
  })

  return win
}

function addWatcherForWindow(win: BrowserWindow, repoPath: string): void {
  let watchers = windowWatchers.get(win.id)
  if (!watchers) {
    watchers = new Map()
    windowWatchers.set(win.id, watchers)
  }
  if (watchers.has(repoPath)) return

  const watcher = new FileWatcher(repoPath, () => {
    if (!win.isDestroyed()) {
      win.webContents.send('repo:changed', repoPath)
    }
  })
  watcher.start()
  watchers.set(repoPath, watcher)
}

function removeWatcherForWindow(win: BrowserWindow, repoPath: string): void {
  const watchers = windowWatchers.get(win.id)
  if (!watchers) return
  const watcher = watchers.get(repoPath)
  if (watcher) {
    watcher.stop()
    watchers.delete(repoPath)
  }
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: '文件',
      submenu: [
        {
          label: '打开仓库...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog({
              properties: ['openDirectory'],
              title: '打开 Git 仓库'
            })
            if (!result.canceled && result.filePaths[0]) {
              // Send to the focused window (add as tab) instead of creating new window
              const focusedWin = BrowserWindow.getFocusedWindow()
              if (focusedWin) {
                focusedWin.webContents.send('repo:opened', result.filePaths[0])
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: '关闭窗口',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            BrowserWindow.getFocusedWindow()?.close()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// Watcher management IPC
ipcMain.handle('watcher:add', async (event, repoPath: string) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) addWatcherForWindow(win, repoPath)
})

ipcMain.handle('watcher:remove', async (event, repoPath: string) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) removeWatcherForWindow(win, repoPath)
})

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '打开 Git 仓库'
  })
  if (!result.canceled && result.filePaths[0]) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('window:openRepo', async (event, repoPath: string) => {
  // Send to current window as a new tab
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.webContents.send('repo:opened', repoPath)
  }
})

ipcMain.handle('window:setTitle', async (event, title: string) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.setTitle(title)
})

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url)
})

// Auto-fetch: silently fetch all repos across all windows every 3 minutes
function startAutoFetch(): void {
  if (autoFetchTimer) clearInterval(autoFetchTimer)
  autoFetchTimer = setInterval(async () => {
    for (const [winId, watchers] of windowWatchers) {
      const win = BrowserWindow.fromId(winId)
      if (!win || win.isDestroyed()) continue
      for (const repoPath of watchers.keys()) {
        try {
          const git = simpleGit(repoPath)
          await git.fetch()
        } catch {
          // silent fail
        }
      }
      // Notify renderer to refresh
      if (!win.isDestroyed()) {
        win.webContents.send('auto:fetched')
      }
    }
  }, AUTO_FETCH_INTERVAL)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.git-manager')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerGitHandlers()
  buildMenu()
  createWindow()
  startAutoFetch()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (autoFetchTimer) clearInterval(autoFetchTimer)
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
