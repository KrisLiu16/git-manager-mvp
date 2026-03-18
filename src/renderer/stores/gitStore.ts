import { create } from 'zustand'

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'conflict' | 'untracked'
export type ViewTab = 'changes' | 'log' | 'branches' | 'stash' | 'remotes'
export type DiffMode = 'side-by-side' | 'unified'

export interface GitFile {
  path: string
  status: FileStatus
  staged: boolean
  index: string
  working_dir: string
}

export interface CommitInfo {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
  refs: string
}

export interface BranchInfo {
  name: string
  current: boolean
  commit: string
  label: string
  isRemote: boolean
}

export interface StashEntry {
  hash: string
  date: string
  message: string
  index: number
}

export interface RemoteInfo {
  name: string
  refs: { fetch: string; push: string }
}

export interface BlameInfo {
  hash: string
  author: string
  authorEmail: string
  date: string
  summary: string
  line: number
}

export interface ProjectState {
  repoPath: string
  name: string
  currentBranch: string
  activeTab: ViewTab
  selectedFile: GitFile | null
  diffContent: string
  commitMessage: string
  amendMode: boolean

  stagedFiles: GitFile[]
  unstagedFiles: GitFile[]
  untrackedFiles: GitFile[]

  commits: CommitInfo[]
  branches: BranchInfo[]
  stashes: StashEntry[]
  remotes: RemoteInfo[]

  lastFetchAt: number | null
}

function createProjectState(repoPath: string): ProjectState {
  const name = repoPath.split('/').pop() || repoPath
  return {
    repoPath,
    name,
    currentBranch: '',
    activeTab: 'changes',
    selectedFile: null,
    diffContent: '',
    commitMessage: '',
    amendMode: false,
    stagedFiles: [],
    unstagedFiles: [],
    untrackedFiles: [],
    commits: [],
    branches: [],
    stashes: [],
    remotes: [],
    lastFetchAt: null
  }
}

interface GitStore {
  projects: ProjectState[]
  activeProjectIndex: number
  diffMode: DiffMode
  isLoading: boolean
  error: string | null
  blameCache: Map<string, BlameInfo[]>

  // Project helpers
  activeProject: () => ProjectState | null
  updateActiveProject: (patch: Partial<ProjectState>) => void

  // Multi-project
  addProject: (path: string) => void
  removeProject: (index: number) => void
  switchProject: (index: number) => void

  // UI state
  setActiveTab: (tab: ViewTab) => void
  setDiffMode: (mode: DiffMode) => void
  setSelectedFile: (file: GitFile | null) => void
  setDiffContent: (content: string) => void
  setCommitMessage: (msg: string) => void
  setAmendMode: (amend: boolean) => void
  setError: (err: string | null) => void

  // Refresh
  refreshStatus: () => Promise<void>
  refreshLog: () => Promise<void>
  refreshBranches: () => Promise<void>
  refreshStashes: () => Promise<void>
  refreshRemotes: () => Promise<void>
  refreshAll: () => Promise<void>

  // File ops
  stageFile: (file: GitFile) => Promise<void>
  unstageFile: (file: GitFile) => Promise<void>
  stageAll: () => Promise<void>
  unstageAll: () => Promise<void>
  discardFile: (file: GitFile) => Promise<void>

  // Git ops
  doCommit: () => Promise<void>
  doCommitAndPush: () => Promise<void>
  doPush: () => Promise<void>
  doPull: () => Promise<void>
  doFetch: () => Promise<void>

  selectFileAndShowDiff: (file: GitFile) => Promise<void>
  showCommitDiff: (hash: string) => Promise<void>

  // Branch
  createBranch: (name: string, startPoint?: string) => Promise<void>
  switchBranch: (name: string) => Promise<void>
  deleteBranch: (name: string, force?: boolean) => Promise<void>
  mergeBranch: (name: string) => Promise<void>

  // Stash
  saveStash: (message?: string) => Promise<void>
  popStash: (index: number) => Promise<void>
  applyStash: (index: number) => Promise<void>
  dropStash: (index: number) => Promise<void>

  // Blame
  getBlame: (filePath: string) => Promise<BlameInfo[]>

  // Auto fetch
  autoFetchAll: () => Promise<void>

  // Legacy compat getters
  repoPath: string | null
  currentBranch: string
  activeTab: ViewTab
  selectedFile: GitFile | null
  diffContent: string
  commitMessage: string
  amendMode: boolean
  stagedFiles: GitFile[]
  unstagedFiles: GitFile[]
  untrackedFiles: GitFile[]
  commits: CommitInfo[]
  branches: BranchInfo[]
  stashes: StashEntry[]
  remotes: RemoteInfo[]
  lastFetchAt: number | null
}

function parseStatusFiles(status: any): { staged: GitFile[]; unstaged: GitFile[]; untracked: GitFile[] } {
  const staged: GitFile[] = []
  const unstaged: GitFile[] = []
  const untracked: GitFile[] = []

  const mapStatus = (code: string): FileStatus => {
    switch (code) {
      case 'M': return 'modified'
      case 'A': return 'added'
      case 'D': return 'deleted'
      case 'R': return 'renamed'
      case 'U': return 'conflict'
      case '?': return 'untracked'
      default: return 'modified'
    }
  }

  for (const file of status.files || []) {
    const { path, index, working_dir } = file
    if (index === '?' && working_dir === '?') {
      untracked.push({ path, status: 'untracked', staged: false, index, working_dir })
    } else {
      if (index && index !== ' ' && index !== '?') {
        staged.push({ path, status: mapStatus(index), staged: true, index, working_dir })
      }
      if (working_dir && working_dir !== ' ' && working_dir !== '?') {
        unstaged.push({ path, status: mapStatus(working_dir), staged: false, index, working_dir })
      }
    }
  }
  return { staged, unstaged, untracked }
}

export const useGitStore = create<GitStore>((set, get) => {
  // Helper to get/update active project
  const getProject = (): ProjectState | null => {
    const { projects, activeProjectIndex } = get()
    return projects[activeProjectIndex] || null
  }

  const updateProject = (patch: Partial<ProjectState>) => {
    const { projects, activeProjectIndex } = get()
    if (!projects[activeProjectIndex]) return
    const updated = [...projects]
    updated[activeProjectIndex] = { ...updated[activeProjectIndex], ...patch }
    set({ projects: updated })
  }

  const updateProjectAt = (index: number, patch: Partial<ProjectState>) => {
    const { projects } = get()
    if (!projects[index]) return
    const updated = [...projects]
    updated[index] = { ...updated[index], ...patch }
    set({ projects: updated })
  }

  return {
    projects: [],
    activeProjectIndex: -1,
    diffMode: 'side-by-side',
    isLoading: false,
    error: null,
    blameCache: new Map(),

    // Computed getters via get()
    get repoPath() { return getProject()?.repoPath || null },
    get currentBranch() { return getProject()?.currentBranch || '' },
    get activeTab() { return getProject()?.activeTab || 'changes' },
    get selectedFile() { return getProject()?.selectedFile || null },
    get diffContent() { return getProject()?.diffContent || '' },
    get commitMessage() { return getProject()?.commitMessage || '' },
    get amendMode() { return getProject()?.amendMode || false },
    get stagedFiles() { return getProject()?.stagedFiles || [] },
    get unstagedFiles() { return getProject()?.unstagedFiles || [] },
    get untrackedFiles() { return getProject()?.untrackedFiles || [] },
    get commits() { return getProject()?.commits || [] },
    get branches() { return getProject()?.branches || [] },
    get stashes() { return getProject()?.stashes || [] },
    get remotes() { return getProject()?.remotes || [] },
    get lastFetchAt() { return getProject()?.lastFetchAt || null },

    activeProject: getProject,
    updateActiveProject: updateProject,

    addProject: (path) => {
      const { projects } = get()
      // Don't add duplicate
      const existing = projects.findIndex(p => p.repoPath === path)
      if (existing >= 0) {
        set({ activeProjectIndex: existing })
        return
      }
      const newProject = createProjectState(path)
      const updated = [...projects, newProject]
      set({ projects: updated, activeProjectIndex: updated.length - 1 })
      // Start watcher
      window.windowApi.addProjectWatcher(path)
    },

    removeProject: (index) => {
      const { projects, activeProjectIndex } = get()
      if (index < 0 || index >= projects.length) return
      // Stop watcher
      window.windowApi.removeProjectWatcher(projects[index].repoPath)
      const updated = projects.filter((_, i) => i !== index)
      let newIndex = activeProjectIndex
      if (index === activeProjectIndex) {
        newIndex = Math.min(index, updated.length - 1)
      } else if (index < activeProjectIndex) {
        newIndex = activeProjectIndex - 1
      }
      set({ projects: updated, activeProjectIndex: newIndex })
    },

    switchProject: (index) => {
      const { projects } = get()
      if (index >= 0 && index < projects.length) {
        set({ activeProjectIndex: index })
      }
    },

    setActiveTab: (tab) => updateProject({ activeTab: tab }),
    setDiffMode: (mode) => set({ diffMode: mode }),
    setSelectedFile: (file) => updateProject({ selectedFile: file }),
    setDiffContent: (content) => updateProject({ diffContent: content }),
    setCommitMessage: (msg) => updateProject({ commitMessage: msg }),
    setAmendMode: (amend) => updateProject({ amendMode: amend }),
    setError: (err) => set({ error: err }),

    refreshStatus: async () => {
      const proj = getProject()
      if (!proj) return
      try {
        const status = await window.git.status(proj.repoPath)
        const { staged, unstaged, untracked } = parseStatusFiles(status)
        const currentBranch = status.current || 'HEAD'
        updateProject({ stagedFiles: staged, unstagedFiles: unstaged, untrackedFiles: untracked, currentBranch })
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    refreshLog: async () => {
      const proj = getProject()
      if (!proj) return
      try {
        const log = await window.git.log(proj.repoPath, 200)
        const commits: CommitInfo[] = (log.all || []).map((c: any) => ({
          hash: c.hash, date: c.date, message: c.message,
          author_name: c.author_name, author_email: c.author_email, refs: c.refs || ''
        }))
        updateProject({ commits })
      } catch {
        updateProject({ commits: [] })
      }
    },

    refreshBranches: async () => {
      const proj = getProject()
      if (!proj) return
      try {
        const result = await window.git.branches(proj.repoPath)
        const branches: BranchInfo[] = Object.entries(result.branches).map(([name, info]: [string, any]) => ({
          name, current: info.current, commit: info.commit, label: info.label,
          isRemote: name.startsWith('remotes/')
        }))
        updateProject({ branches })
      } catch {
        updateProject({ branches: [] })
      }
    },

    refreshStashes: async () => {
      const proj = getProject()
      if (!proj) return
      try {
        const result = await window.git.stashList(proj.repoPath)
        const stashes: StashEntry[] = (result.all || []).map((s: any, i: number) => ({
          hash: s.hash, date: s.date, message: s.message, index: i
        }))
        updateProject({ stashes })
      } catch {
        updateProject({ stashes: [] })
      }
    },

    refreshRemotes: async () => {
      const proj = getProject()
      if (!proj) return
      try {
        const remotes = await window.git.remotes(proj.repoPath)
        updateProject({ remotes: remotes || [] })
      } catch {
        updateProject({ remotes: [] })
      }
    },

    refreshAll: async () => {
      set({ isLoading: true })
      const { refreshStatus, refreshLog, refreshBranches, refreshStashes, refreshRemotes } = get()
      await Promise.all([refreshStatus(), refreshLog(), refreshBranches(), refreshStashes(), refreshRemotes()])
      set({ isLoading: false })
    },

    stageFile: async (file) => {
      const proj = getProject()
      if (!proj) return
      await window.git.add(proj.repoPath, file.path)
      await get().refreshStatus()
    },

    unstageFile: async (file) => {
      const proj = getProject()
      if (!proj) return
      await window.git.unstage(proj.repoPath, file.path)
      await get().refreshStatus()
    },

    stageAll: async () => {
      const proj = getProject()
      if (!proj) return
      const allFiles = [...proj.unstagedFiles, ...proj.untrackedFiles].map(f => f.path)
      if (allFiles.length > 0) {
        await window.git.add(proj.repoPath, allFiles)
        await get().refreshStatus()
      }
    },

    unstageAll: async () => {
      const proj = getProject()
      if (!proj) return
      const allFiles = proj.stagedFiles.map(f => f.path)
      if (allFiles.length > 0) {
        await window.git.unstage(proj.repoPath, allFiles)
        await get().refreshStatus()
      }
    },

    discardFile: async (file) => {
      const proj = getProject()
      if (!proj) return
      await window.git.discard(proj.repoPath, [file.path])
      await get().refreshStatus()
    },

    selectFileAndShowDiff: async (file) => {
      const proj = getProject()
      if (!proj) return
      updateProject({ selectedFile: file })
      try {
        let diffText = ''
        if (file.status === 'untracked') {
          const content = await window.git.showFile(proj.repoPath, file.path)
          const lines = content.split('\n')
          diffText = `diff --git a/${file.path} b/${file.path}\nnew file mode 100644\n--- /dev/null\n+++ b/${file.path}\n@@ -0,0 +1,${lines.length} @@\n${lines.map(l => `+${l}`).join('\n')}\n`
        } else if (file.staged) {
          diffText = await window.git.diffStaged(proj.repoPath, file.path)
        } else {
          diffText = await window.git.diff(proj.repoPath, file.path)
        }
        updateProject({ diffContent: diffText })
      } catch (err: any) {
        updateProject({ diffContent: '' })
        set({ error: err.message })
      }
    },

    showCommitDiff: async (hash) => {
      const proj = getProject()
      if (!proj) return
      try {
        const diff = await window.git.diffCommit(proj.repoPath, hash)
        updateProject({ diffContent: diff, selectedFile: null })
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    doCommit: async () => {
      const proj = getProject()
      if (!proj || !proj.commitMessage.trim()) return
      try {
        await window.git.commit(proj.repoPath, proj.commitMessage, proj.amendMode)
        updateProject({ commitMessage: '', amendMode: false })
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    doCommitAndPush: async () => {
      const proj = getProject()
      if (!proj || !proj.commitMessage.trim()) return
      try {
        await window.git.commit(proj.repoPath, proj.commitMessage, proj.amendMode)
        await window.git.push(proj.repoPath)
        updateProject({ commitMessage: '', amendMode: false })
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    doPush: async () => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.push(proj.repoPath)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    doPull: async () => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.pull(proj.repoPath)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    doFetch: async () => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.fetch(proj.repoPath)
        updateProject({ lastFetchAt: Date.now() })
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    createBranch: async (name, startPoint) => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.createBranch(proj.repoPath, name, startPoint)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    switchBranch: async (name) => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.checkout(proj.repoPath, name)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    deleteBranch: async (name, force) => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.deleteBranch(proj.repoPath, name, force)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    mergeBranch: async (name) => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.merge(proj.repoPath, name)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    saveStash: async (message) => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.stashSave(proj.repoPath, message)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    popStash: async (index) => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.stashPop(proj.repoPath, index)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    applyStash: async (index) => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.stashApply(proj.repoPath, index)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    dropStash: async (index) => {
      const proj = getProject()
      if (!proj) return
      try {
        await window.git.stashDrop(proj.repoPath, index)
        await get().refreshAll()
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    getBlame: async (filePath) => {
      const proj = getProject()
      if (!proj) return []
      const cacheKey = `${proj.repoPath}:${filePath}`
      const { blameCache } = get()
      if (blameCache.has(cacheKey)) return blameCache.get(cacheKey)!
      try {
        const result = await window.git.blame(proj.repoPath, filePath)
        const parsed = parseBlame(result)
        blameCache.set(cacheKey, parsed)
        set({ blameCache: new Map(blameCache) })
        return parsed
      } catch {
        return []
      }
    },

    autoFetchAll: async () => {
      const { projects } = get()
      for (let i = 0; i < projects.length; i++) {
        try {
          await window.git.fetch(projects[i].repoPath)
          updateProjectAt(i, { lastFetchAt: Date.now() })
        } catch {
          // silent fail for auto-fetch
        }
      }
      // Refresh active project after fetch
      await get().refreshAll()
    }
  }
})

function parseBlame(raw: string): BlameInfo[] {
  const lines: BlameInfo[] = []
  const blocks = raw.split('\n')
  let current: Partial<BlameInfo> = {}
  let lineNum = 0

  for (const line of blocks) {
    if (/^[0-9a-f]{40}\s/.test(line)) {
      const parts = line.split(' ')
      current.hash = parts[0]
      lineNum = parseInt(parts[2] || parts[1], 10)
      current.line = lineNum
    } else if (line.startsWith('author ')) {
      current.author = line.substring(7)
    } else if (line.startsWith('author-mail ')) {
      current.authorEmail = line.substring(12).replace(/[<>]/g, '')
    } else if (line.startsWith('author-time ')) {
      const ts = parseInt(line.substring(12), 10)
      current.date = new Date(ts * 1000).toLocaleString()
    } else if (line.startsWith('summary ')) {
      current.summary = line.substring(8)
    } else if (line.startsWith('\t')) {
      // Content line = end of block
      if (current.hash && current.author) {
        lines.push(current as BlameInfo)
      }
      current = {}
    }
  }
  return lines
}
