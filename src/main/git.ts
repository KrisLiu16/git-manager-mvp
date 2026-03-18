import { ipcMain } from 'electron'
import simpleGit, { SimpleGit, StatusResult, LogResult, BranchSummary } from 'simple-git'

function getGit(repoPath: string): SimpleGit {
  return simpleGit(repoPath)
}

export function registerGitHandlers(): void {
  // Status
  ipcMain.handle('git:status', async (_event, repoPath: string): Promise<StatusResult> => {
    const git = getGit(repoPath)
    return git.status()
  })

  // Diff for a file (unstaged)
  ipcMain.handle('git:diff', async (_event, repoPath: string, filePath?: string): Promise<string> => {
    const git = getGit(repoPath)
    if (filePath) {
      return git.diff([filePath])
    }
    return git.diff()
  })

  // Diff for staged files
  ipcMain.handle('git:diffStaged', async (_event, repoPath: string, filePath?: string): Promise<string> => {
    const git = getGit(repoPath)
    if (filePath) {
      return git.diff(['--cached', filePath])
    }
    return git.diff(['--cached'])
  })

  // Diff for a specific commit
  ipcMain.handle('git:diffCommit', async (_event, repoPath: string, hash: string): Promise<string> => {
    const git = getGit(repoPath)
    return git.diff([`${hash}~1`, hash])
  })

  // Show file content for untracked files
  ipcMain.handle('git:showFile', async (_event, repoPath: string, filePath: string): Promise<string> => {
    const fs = await import('fs/promises')
    const path = await import('path')
    const fullPath = path.join(repoPath, filePath)
    try {
      return await fs.readFile(fullPath, 'utf-8')
    } catch {
      return ''
    }
  })

  // Stage file(s)
  ipcMain.handle('git:add', async (_event, repoPath: string, files: string | string[]): Promise<void> => {
    const git = getGit(repoPath)
    await git.add(files)
  })

  // Unstage file(s)
  ipcMain.handle('git:unstage', async (_event, repoPath: string, files: string | string[]): Promise<void> => {
    const git = getGit(repoPath)
    const fileList = Array.isArray(files) ? files : [files]
    await git.reset(['HEAD', '--', ...fileList])
  })

  // Discard changes
  ipcMain.handle('git:discard', async (_event, repoPath: string, files: string[]): Promise<void> => {
    const git = getGit(repoPath)
    await git.checkout(['--', ...files])
  })

  // Commit
  ipcMain.handle('git:commit', async (_event, repoPath: string, message: string, amend: boolean): Promise<void> => {
    const git = getGit(repoPath)
    const options = amend ? ['--amend'] : []
    await git.commit(message, undefined, Object.fromEntries(options.map(o => [o, null])))
  })

  // Push
  ipcMain.handle('git:push', async (_event, repoPath: string, remote?: string, branch?: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.push(remote || 'origin', branch)
  })

  // Pull
  ipcMain.handle('git:pull', async (_event, repoPath: string, remote?: string, branch?: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.pull(remote || 'origin', branch)
  })

  // Fetch
  ipcMain.handle('git:fetch', async (_event, repoPath: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.fetch()
  })

  // Log
  ipcMain.handle('git:log', async (_event, repoPath: string, maxCount: number = 100): Promise<LogResult> => {
    const git = getGit(repoPath)
    return git.log({ maxCount, '--all': null } as any)
  })

  // Branch list
  ipcMain.handle('git:branches', async (_event, repoPath: string): Promise<BranchSummary> => {
    const git = getGit(repoPath)
    return git.branch(['-a'])
  })

  // Create branch
  ipcMain.handle('git:createBranch', async (_event, repoPath: string, name: string, startPoint?: string): Promise<void> => {
    const git = getGit(repoPath)
    if (startPoint) {
      await git.checkoutBranch(name, startPoint)
    } else {
      await git.checkoutLocalBranch(name)
    }
  })

  // Switch branch
  ipcMain.handle('git:checkout', async (_event, repoPath: string, branch: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.checkout(branch)
  })

  // Delete branch
  ipcMain.handle('git:deleteBranch', async (_event, repoPath: string, name: string, force: boolean): Promise<void> => {
    const git = getGit(repoPath)
    await git.deleteLocalBranch(name, force)
  })

  // Merge branch
  ipcMain.handle('git:merge', async (_event, repoPath: string, branch: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.merge([branch])
  })

  // Stash list
  ipcMain.handle('git:stashList', async (_event, repoPath: string): Promise<LogResult> => {
    const git = getGit(repoPath)
    return git.stashList()
  })

  // Stash save
  ipcMain.handle('git:stashSave', async (_event, repoPath: string, message?: string): Promise<void> => {
    const git = getGit(repoPath)
    if (message) {
      await git.stash(['push', '-m', message])
    } else {
      await git.stash(['push'])
    }
  })

  // Stash pop
  ipcMain.handle('git:stashPop', async (_event, repoPath: string, index: number): Promise<void> => {
    const git = getGit(repoPath)
    await git.stash(['pop', `stash@{${index}}`])
  })

  // Stash apply
  ipcMain.handle('git:stashApply', async (_event, repoPath: string, index: number): Promise<void> => {
    const git = getGit(repoPath)
    await git.stash(['apply', `stash@{${index}}`])
  })

  // Stash drop
  ipcMain.handle('git:stashDrop', async (_event, repoPath: string, index: number): Promise<void> => {
    const git = getGit(repoPath)
    await git.stash(['drop', `stash@{${index}}`])
  })

  // Check if path is a git repo
  ipcMain.handle('git:isRepo', async (_event, repoPath: string): Promise<boolean> => {
    try {
      const git = getGit(repoPath)
      await git.status()
      return true
    } catch {
      return false
    }
  })

  // Get remotes
  ipcMain.handle('git:remotes', async (_event, repoPath: string) => {
    const git = getGit(repoPath)
    return git.getRemotes(true)
  })

  // Get current branch
  ipcMain.handle('git:currentBranch', async (_event, repoPath: string): Promise<string> => {
    const git = getGit(repoPath)
    const status = await git.status()
    return status.current || 'HEAD'
  })

  // Blame
  ipcMain.handle('git:blame', async (_event, repoPath: string, filePath: string): Promise<string> => {
    const git = getGit(repoPath)
    return git.raw(['blame', '--porcelain', filePath])
  })
}
