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

  // Push — auto set upstream for new branches
  ipcMain.handle('git:push', async (_event, repoPath: string, remote?: string, branch?: string) => {
    const git = getGit(repoPath)
    const r = remote || 'origin'
    try {
      await git.push(r, branch)
    } catch (err: any) {
      if (err.message?.includes('no upstream branch') || err.message?.includes('has no upstream')) {
        // Auto set upstream
        const status = await git.status()
        const currentBranch = status.current || branch
        await git.push(['-u', r, currentBranch!])
      } else {
        throw err
      }
    }
  })

  // Pull
  ipcMain.handle('git:pull', async (_event, repoPath: string, remote?: string, branch?: string) => {
    const git = getGit(repoPath)
    try {
      await git.pull(remote || 'origin', branch)
    } catch (err: any) {
      if (err.message?.includes('no tracking information') || err.message?.includes('no upstream')) {
        // Try pull with current branch name
        const status = await git.status()
        await git.pull(remote || 'origin', status.current || undefined)
      } else {
        throw err
      }
    }
  })

  // Fetch
  ipcMain.handle('git:fetch', async (_event, repoPath: string) => {
    const git = getGit(repoPath)
    await git.fetch(['--all'])
  })

  // Ahead/behind count relative to remote tracking branch
  ipcMain.handle('git:aheadBehind', async (_event, repoPath: string) => {
    const git = getGit(repoPath)
    try {
      const status = await git.status()
      return { ahead: status.ahead || 0, behind: status.behind || 0 }
    } catch {
      return { ahead: 0, behind: 0 }
    }
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

  // Switch branch — for remote branches, create local tracking branch (like GoLand)
  ipcMain.handle('git:checkout', async (_event, repoPath: string, branch: string) => {
    const git = getGit(repoPath)
    if (branch.startsWith('remotes/')) {
      // e.g. "remotes/origin/feat/xxx" → local name "feat/xxx", track "origin/feat/xxx"
      const withoutRemotes = branch.replace('remotes/', '') // "origin/feat/xxx"
      const slashIdx = withoutRemotes.indexOf('/')
      const localName = withoutRemotes.substring(slashIdx + 1) // "feat/xxx"
      // Check if local branch already exists
      try {
        await git.raw(['rev-parse', '--verify', localName])
        // Local branch exists, just checkout
        await git.checkout(localName)
      } catch {
        // Create local tracking branch
        await git.raw(['checkout', '-b', localName, '--track', branch])
      }
    } else {
      await git.checkout(branch)
    }
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

  // Log with parent info for graph rendering
  ipcMain.handle('git:graphLog', async (_event, repoPath: string, maxCount: number = 200) => {
    const git = getGit(repoPath)
    const result = await git.raw([
      'log', '--all', `--max-count=${maxCount}`,
      '--format=%H|%P|%an|%ae|%aI|%s|%D'
    ])
    return result.trim().split('\n').filter(Boolean).map(line => {
      const [hash, parents, author_name, author_email, date, message, refs] = line.split('|')
      return {
        hash, parents: parents ? parents.split(' ') : [],
        author_name, author_email, date, message, refs: refs || ''
      }
    })
  })

  // Cherry-pick a commit
  ipcMain.handle('git:cherryPick', async (_event, repoPath: string, hash: string) => {
    const git = getGit(repoPath)
    await git.raw(['cherry-pick', hash])
  })

  // Revert a commit
  ipcMain.handle('git:revertCommit', async (_event, repoPath: string, hash: string) => {
    const git = getGit(repoPath)
    await git.raw(['revert', hash, '--no-edit'])
  })

  // Reset current branch to a commit
  ipcMain.handle('git:resetBranch', async (_event, repoPath: string, hash: string, mode: string) => {
    const git = getGit(repoPath)
    await git.raw(['reset', mode, hash])
  })

  // Create tag
  ipcMain.handle('git:createTag', async (_event, repoPath: string, name: string, hash?: string) => {
    const git = getGit(repoPath)
    const args = hash ? [name, hash] : [name]
    await git.tag(args)
  })

  // List tags with details
  ipcMain.handle('git:tags', async (_event, repoPath: string) => {
    const git = getGit(repoPath)
    try {
      const result = await git.raw(['tag', '-l', '--format=%(refname:short)|%(objectname:short)|%(creatordate:iso)'])
      if (!result.trim()) return []
      return result.trim().split('\n').filter(Boolean).map(line => {
        const [name, hash, date] = line.split('|')
        return { name: name || '', hash: hash || '', date: date || '' }
      })
    } catch {
      return []
    }
  })

  // Push a tag to remote
  ipcMain.handle('git:pushTag', async (_event, repoPath: string, name: string) => {
    const git = getGit(repoPath)
    await git.push(['origin', name])
  })

  // Delete tag
  ipcMain.handle('git:deleteTag', async (_event, repoPath: string, name: string) => {
    const git = getGit(repoPath)
    await git.tag(['-d', name])
  })

  // Rename branch
  ipcMain.handle('git:renameBranch', async (_event, repoPath: string, oldName: string, newName: string) => {
    const git = getGit(repoPath)
    await git.raw(['branch', '-m', oldName, newName])
  })

  // Rebase onto branch
  ipcMain.handle('git:rebaseBranch', async (_event, repoPath: string, onto: string) => {
    const git = getGit(repoPath)
    await git.rebase([onto])
  })

  // Stash show (diff for a stash entry)
  ipcMain.handle('git:stashShow', async (_event, repoPath: string, index: number) => {
    const git = getGit(repoPath)
    return git.raw(['stash', 'show', '-p', `stash@{${index}}`])
  })

  // Apply a patch to the index (for partial/hunk staging)
  ipcMain.handle('git:applyPatch', async (_event, repoPath: string, patchContent: string, reverse: boolean) => {
    const git = getGit(repoPath)
    const args = ['apply', '--cached']
    if (reverse) args.push('--reverse')
    args.push('-')
    // Use raw with stdin via a temp approach: write patch to temp file, then apply
    const fs = await import('fs/promises')
    const path = await import('path')
    const os = await import('os')
    const tmpFile = path.join(os.tmpdir(), `git-patch-${Date.now()}.patch`)
    try {
      await fs.writeFile(tmpFile, patchContent, 'utf-8')
      args.pop() // remove '-'
      args.push(tmpFile)
      await git.raw(args)
    } finally {
      try { await fs.unlink(tmpFile) } catch { /* ignore */ }
    }
  })

  // Get diff with hunk boundaries for a file (unstaged)
  ipcMain.handle('git:diffHunks', async (_event, repoPath: string, filePath: string, staged: boolean) => {
    const git = getGit(repoPath)
    const args = staged ? ['diff', '--cached', filePath] : ['diff', filePath]
    return git.raw(args)
  })

  // Log for a single file
  ipcMain.handle('git:logFile', async (_event, repoPath: string, filePath: string, maxCount: number = 50) => {
    const git = getGit(repoPath)
    const result = await git.log({ file: filePath, maxCount } as any)
    return toPlain(result)
  })

  // Raw git command (for terminal)
  ipcMain.handle('git:rawCommand', async (_event, repoPath: string, command: string) => {
    const git = getGit(repoPath)
    const args = command.split(/\s+/).filter(Boolean)
    return git.raw(args)
  })
}
