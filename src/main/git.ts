import { ipcMain } from 'electron'
import simpleGit, { SimpleGit } from 'simple-git'

function getGit(repoPath: string): SimpleGit {
  return simpleGit(repoPath)
}

// Convert simple-git objects to plain serializable objects for IPC
function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function registerGitHandlers(): void {
  // Status
  ipcMain.handle('git:status', async (_event, repoPath: string) => {
    const git = getGit(repoPath)
    const result = await git.status()
    return toPlain(result)
  })

  // Diff for a file (unstaged)
  ipcMain.handle('git:diff', async (_event, repoPath: string, filePath?: string) => {
    const git = getGit(repoPath)
    return filePath ? git.diff([filePath]) : git.diff()
  })

  // Diff for staged files
  ipcMain.handle('git:diffStaged', async (_event, repoPath: string, filePath?: string) => {
    const git = getGit(repoPath)
    return filePath ? git.diff(['--cached', filePath]) : git.diff(['--cached'])
  })

  // Diff for a specific commit
  ipcMain.handle('git:diffCommit', async (_event, repoPath: string, hash: string) => {
    const git = getGit(repoPath)
    return git.diff([`${hash}~1`, hash])
  })

  // Show file content for untracked files
  ipcMain.handle('git:showFile', async (_event, repoPath: string, filePath: string) => {
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
  ipcMain.handle('git:add', async (_event, repoPath: string, files: string | string[]) => {
    const git = getGit(repoPath)
    await git.add(files)
  })

  // Unstage file(s)
  ipcMain.handle('git:unstage', async (_event, repoPath: string, files: string | string[]) => {
    const git = getGit(repoPath)
    const fileList = Array.isArray(files) ? files : [files]
    await git.reset(['HEAD', '--', ...fileList])
  })

  // Discard changes
  ipcMain.handle('git:discard', async (_event, repoPath: string, files: string[]) => {
    const git = getGit(repoPath)
    await git.checkout(['--', ...files])
  })

  // Commit
  ipcMain.handle('git:commit', async (_event, repoPath: string, message: string, amend: boolean) => {
    const git = getGit(repoPath)
    if (amend) {
      await git.commit(message, undefined, { '--amend': null })
    } else {
      await git.commit(message)
    }
  })

  // Push
  ipcMain.handle('git:push', async (_event, repoPath: string, remote?: string, branch?: string) => {
    const git = getGit(repoPath)
    await git.push(remote || 'origin', branch)
  })

  // Pull
  ipcMain.handle('git:pull', async (_event, repoPath: string, remote?: string, branch?: string) => {
    const git = getGit(repoPath)
    await git.pull(remote || 'origin', branch)
  })

  // Fetch
  ipcMain.handle('git:fetch', async (_event, repoPath: string) => {
    const git = getGit(repoPath)
    await git.fetch()
  })

  // Log
  ipcMain.handle('git:log', async (_event, repoPath: string, maxCount: number = 100) => {
    const git = getGit(repoPath)
    const result = await git.log({ maxCount, '--all': null } as any)
    return toPlain(result)
  })

  // Branch list
  ipcMain.handle('git:branches', async (_event, repoPath: string) => {
    const git = getGit(repoPath)
    const result = await git.branch(['-a'])
    return toPlain(result)
  })

  // Create branch
  ipcMain.handle('git:createBranch', async (_event, repoPath: string, name: string, startPoint?: string) => {
    const git = getGit(repoPath)
    if (startPoint) {
      await git.checkoutBranch(name, startPoint)
    } else {
      await git.checkoutLocalBranch(name)
    }
  })

  // Switch branch
  ipcMain.handle('git:checkout', async (_event, repoPath: string, branch: string) => {
    const git = getGit(repoPath)
    await git.checkout(branch)
  })

  // Delete branch
  ipcMain.handle('git:deleteBranch', async (_event, repoPath: string, name: string, force: boolean) => {
    const git = getGit(repoPath)
    await git.deleteLocalBranch(name, force)
  })

  // Merge branch
  ipcMain.handle('git:merge', async (_event, repoPath: string, branch: string) => {
    const git = getGit(repoPath)
    await git.merge([branch])
  })

  // Stash list
  ipcMain.handle('git:stashList', async (_event, repoPath: string) => {
    const git = getGit(repoPath)
    const result = await git.stashList()
    return toPlain(result)
  })

  // Stash save
  ipcMain.handle('git:stashSave', async (_event, repoPath: string, message?: string) => {
    const git = getGit(repoPath)
    if (message) {
      await git.stash(['push', '-m', message])
    } else {
      await git.stash(['push'])
    }
  })

  // Stash pop
  ipcMain.handle('git:stashPop', async (_event, repoPath: string, index: number) => {
    const git = getGit(repoPath)
    await git.stash(['pop', `stash@{${index}}`])
  })

  // Stash apply
  ipcMain.handle('git:stashApply', async (_event, repoPath: string, index: number) => {
    const git = getGit(repoPath)
    await git.stash(['apply', `stash@{${index}}`])
  })

  // Stash drop
  ipcMain.handle('git:stashDrop', async (_event, repoPath: string, index: number) => {
    const git = getGit(repoPath)
    await git.stash(['drop', `stash@{${index}}`])
  })

  // Check if path is a git repo
  ipcMain.handle('git:isRepo', async (_event, repoPath: string) => {
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
    const result = await git.getRemotes(true)
    return toPlain(result)
  })

  // Get current branch
  ipcMain.handle('git:currentBranch', async (_event, repoPath: string) => {
    const git = getGit(repoPath)
    const status = await git.status()
    return status.current || 'HEAD'
  })

  // Show original file content (HEAD version)
  ipcMain.handle('git:showOriginal', async (_event, repoPath: string, filePath: string, ref: string = 'HEAD') => {
    const git = getGit(repoPath)
    try {
      return await git.show([`${ref}:${filePath}`])
    } catch {
      return ''
    }
  })

  // Show file content at a specific commit
  ipcMain.handle('git:showCommitFile', async (_event, repoPath: string, hash: string, filePath: string) => {
    const git = getGit(repoPath)
    try {
      return await git.show([`${hash}:${filePath}`])
    } catch {
      return ''
    }
  })

  // Get changed files in a commit
  ipcMain.handle('git:commitFiles', async (_event, repoPath: string, hash: string) => {
    const git = getGit(repoPath)
    const result = await git.raw(['diff-tree', '--no-commit-id', '-r', '--name-status', hash])
    return result.trim().split('\n').filter(Boolean).map(line => {
      const [status, ...pathParts] = line.split('\t')
      return { status: status.trim(), path: pathParts.join('\t').trim() }
    })
  })

  // Blame
  ipcMain.handle('git:blame', async (_event, repoPath: string, filePath: string) => {
    const git = getGit(repoPath)
    return git.raw(['blame', '--porcelain', filePath])
  })

  // Raw git command (for terminal)
  ipcMain.handle('git:rawCommand', async (_event, repoPath: string, command: string) => {
    const git = getGit(repoPath)
    const args = command.split(/\s+/).filter(Boolean)
    return git.raw(args)
  })
}
