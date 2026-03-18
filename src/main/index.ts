import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerGitHandlers } from './git'
import { FileWatcher } from './watcher'

const windows = new Map<number, { path: string; watcher: FileWatcher }>()

function createWindow(repoPath?: string): BrowserWindow {
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

  if (repoPath) {
    const name = repoPath.split('/').pop() || repoPath
    win.setTitle(`Git Manager - ${name}`)
  } else {
    win.setTitle('Git Manager')
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (repoPath) {
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('repo:opened', repoPath)
    })

    const watcher = new FileWatcher(repoPath, () => {
      if (!win.isDestroyed()) {
        win.webContents.send('repo:changed')
      }
    })
    watcher.start()
    windows.set(win.id, { path: repoPath, watcher })
  }

  win.on('closed', () => {
    const data = windows.get(win.id)
    if (data) {
      data.watcher.stop()
      windows.delete(win.id)
    }
  })

  return win
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
              createWindow(result.filePaths[0])
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

ipcMain.handle('window:openRepo', async (_event, repoPath: string) => {
  createWindow(repoPath)
})

ipcMain.handle('window:setTitle', async (event, title: string) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.setTitle(title)
})

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url)
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.git-manager')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerGitHandlers()
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
