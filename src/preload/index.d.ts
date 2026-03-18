import { ElectronAPI } from '@electron-toolkit/preload'

interface GitApi {
  status(repoPath: string): Promise<any>
  diff(repoPath: string, filePath?: string): Promise<string>
  diffStaged(repoPath: string, filePath?: string): Promise<string>
  diffCommit(repoPath: string, hash: string): Promise<string>
  showFile(repoPath: string, filePath: string): Promise<string>
  add(repoPath: string, files: string | string[]): Promise<void>
  unstage(repoPath: string, files: string | string[]): Promise<void>
  discard(repoPath: string, files: string[]): Promise<void>
  commit(repoPath: string, message: string, amend?: boolean): Promise<void>
  push(repoPath: string, remote?: string, branch?: string): Promise<void>
  pull(repoPath: string, remote?: string, branch?: string): Promise<void>
  fetch(repoPath: string): Promise<void>
  log(repoPath: string, maxCount?: number): Promise<any>
  branches(repoPath: string): Promise<any>
  createBranch(repoPath: string, name: string, startPoint?: string): Promise<void>
  checkout(repoPath: string, branch: string): Promise<void>
  deleteBranch(repoPath: string, name: string, force?: boolean): Promise<void>
  merge(repoPath: string, branch: string): Promise<void>
  stashList(repoPath: string): Promise<any>
  stashSave(repoPath: string, message?: string): Promise<void>
  stashPop(repoPath: string, index: number): Promise<void>
  stashApply(repoPath: string, index: number): Promise<void>
  stashDrop(repoPath: string, index: number): Promise<void>
  isRepo(repoPath: string): Promise<boolean>
  remotes(repoPath: string): Promise<any>
  currentBranch(repoPath: string): Promise<string>
  blame(repoPath: string, filePath: string): Promise<string>
}

interface WindowApi {
  openDirectory(): Promise<string | null>
  openRepo(repoPath: string): Promise<void>
  setTitle(title: string): Promise<void>
  addProjectWatcher(repoPath: string): Promise<void>
  removeProjectWatcher(repoPath: string): Promise<void>
  onRepoOpened(callback: (repoPath: string) => void): void
  onRepoChanged(callback: (repoPath: string) => void): void
}

declare global {
  interface Window {
    electron: ElectronAPI
    git: GitApi
    windowApi: WindowApi
  }
}
