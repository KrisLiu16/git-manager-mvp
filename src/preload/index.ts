import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const gitApi = {
  status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
  diff: (repoPath: string, filePath?: string) => ipcRenderer.invoke('git:diff', repoPath, filePath),
  diffStaged: (repoPath: string, filePath?: string) => ipcRenderer.invoke('git:diffStaged', repoPath, filePath),
  diffCommit: (repoPath: string, hash: string) => ipcRenderer.invoke('git:diffCommit', repoPath, hash),
  showFile: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:showFile', repoPath, filePath),
  add: (repoPath: string, files: string | string[]) => ipcRenderer.invoke('git:add', repoPath, files),
  unstage: (repoPath: string, files: string | string[]) => ipcRenderer.invoke('git:unstage', repoPath, files),
  discard: (repoPath: string, files: string[]) => ipcRenderer.invoke('git:discard', repoPath, files),
  commit: (repoPath: string, message: string, amend?: boolean) => ipcRenderer.invoke('git:commit', repoPath, message, amend || false),
  push: (repoPath: string, remote?: string, branch?: string) => ipcRenderer.invoke('git:push', repoPath, remote, branch),
  pull: (repoPath: string, remote?: string, branch?: string) => ipcRenderer.invoke('git:pull', repoPath, remote, branch),
  fetch: (repoPath: string) => ipcRenderer.invoke('git:fetch', repoPath),
  log: (repoPath: string, maxCount?: number) => ipcRenderer.invoke('git:log', repoPath, maxCount),
  branches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
  createBranch: (repoPath: string, name: string, startPoint?: string) => ipcRenderer.invoke('git:createBranch', repoPath, name, startPoint),
  checkout: (repoPath: string, branch: string) => ipcRenderer.invoke('git:checkout', repoPath, branch),
  deleteBranch: (repoPath: string, name: string, force?: boolean) => ipcRenderer.invoke('git:deleteBranch', repoPath, name, force || false),
  merge: (repoPath: string, branch: string) => ipcRenderer.invoke('git:merge', repoPath, branch),
  stashList: (repoPath: string) => ipcRenderer.invoke('git:stashList', repoPath),
  stashSave: (repoPath: string, message?: string) => ipcRenderer.invoke('git:stashSave', repoPath, message),
  stashPop: (repoPath: string, index: number) => ipcRenderer.invoke('git:stashPop', repoPath, index),
  stashApply: (repoPath: string, index: number) => ipcRenderer.invoke('git:stashApply', repoPath, index),
  stashDrop: (repoPath: string, index: number) => ipcRenderer.invoke('git:stashDrop', repoPath, index),
  isRepo: (repoPath: string) => ipcRenderer.invoke('git:isRepo', repoPath),
  remotes: (repoPath: string) => ipcRenderer.invoke('git:remotes', repoPath),
  currentBranch: (repoPath: string) => ipcRenderer.invoke('git:currentBranch', repoPath)
}

const windowApi = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openRepo: (repoPath: string) => ipcRenderer.invoke('window:openRepo', repoPath),
  setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
  onRepoOpened: (callback: (repoPath: string) => void) => {
    ipcRenderer.on('repo:opened', (_event, path) => callback(path))
  },
  onRepoChanged: (callback: () => void) => {
    ipcRenderer.on('repo:changed', () => callback())
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('git', gitApi)
    contextBridge.exposeInMainWorld('windowApi', windowApi)
  } catch (error) {
    console.error(error)
  }
} else {
  (window as any).electron = electronAPI
  ;(window as any).git = gitApi
  ;(window as any).windowApi = windowApi
}
