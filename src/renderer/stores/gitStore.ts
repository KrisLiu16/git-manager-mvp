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
    repoPath, name, currentBranch: '', activeTab: 'changes',
    selectedFile: null, diffContent: '', commitMessage: '', amendMode: false,
    stagedFiles: [], unstagedFiles: [], untrackedFiles: [],
    commits: [], branches: [], stashes: [], remotes: [], lastFetchAt: null
  }
}

const emptyProject: ProjectState = createProjectState('')

// ---- Store interface ----

interface GitStore {
  // Multi-project state
  projects: ProjectState[]
  activeProjectIndex: number
  diffMode: DiffMode
  isLoading: boolean
  error: string | null
  blameCache: Record<string, BlameInfo[]>

  // Commit file diff shown in main DiffView (set from bottom panel)
  commitDiffOriginal: string
  commitDiffModified: string
  commitDiffPath: string | null
  commitDiffHash: string | null
  showCommitFileDiff: (hash: string, file: { status: string; path: string }) => Promise<void>
  clearCommitDiff: () => void

  // Flat "active project" fields — zustand-reactive, synced on every update
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

  // Multi-project ops
  addProject: (path: string) => void
  removeProject: (index: number) => void
  switchProject: (index: number) => void

  // UI setters
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

  createBranch: (name: string, startPoint?: string) => Promise<void>
  switchBranch: (name: string) => Promise<void>
  deleteBranch: (name: string, force?: boolean) => Promise<void>
  mergeBranch: (name: string) => Promise<void>

  saveStash: (message?: string) => Promise<void>
  popStash: (index: number) => Promise<void>
  applyStash: (index: number) => Promise<void>
  dropStash: (index: number) => Promise<void>

  getBlame: (filePath: string) => Promise<BlameInfo[]>
  autoFetchAll: () => Promise<void>
}

// ---- Helpers ----

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

/** Extract flat fields from the active project for zustand reactivity */
function flattenActiveProject(projects: ProjectState[], index: number) {
  const p = projects[index] || emptyProject
  return {
    repoPath: p.repoPath || null,
    currentBranch: p.currentBranch,
    activeTab: p.activeTab,
    selectedFile: p.selectedFile,
    diffContent: p.diffContent,
    commitMessage: p.commitMessage,
    amendMode: p.amendMode,
    stagedFiles: p.stagedFiles,
    unstagedFiles: p.unstagedFiles,
    untrackedFiles: p.untrackedFiles,
    commits: p.commits,
    branches: p.branches,
    stashes: p.stashes,
    remotes: p.remotes,
    lastFetchAt: p.lastFetchAt
  }
}

// ---- Store ----

export const useGitStore = create<GitStore>((set, get) => {
  /** Get active project */
  const getProject = (): ProjectState | null => {
    const { projects, activeProjectIndex } = get()
    return projects[activeProjectIndex] || null
  }

  /** Update active project + sync flat fields */
  const updateProject = (patch: Partial<ProjectState>) => {
    const { projects, activeProjectIndex } = get()
    if (!projects[activeProjectIndex]) return
    const updated = [...projects]
    updated[activeProjectIndex] = { ...updated[activeProjectIndex], ...patch }
    set({ projects: updated, ...flattenActiveProject(updated, activeProjectIndex) })
  }

  /** Update a specific project by index */
  const updateProjectAt = (index: number, patch: Partial<ProjectState>) => {
    const { projects, activeProjectIndex } = get()
    if (!projects[index]) return
    const updated = [...projects]
    updated[index] = { ...updated[index], ...patch }
    const flat = index === activeProjectIndex ? flattenActiveProject(updated, activeProjectIndex) : {}
    set({ projects: updated, ...flat })
  }

  return {
    projects: [],
    activeProjectIndex: -1,
    diffMode: 'side-by-side',
    isLoading: false,
    error: null,
    blameCache: {},

    // Flat active project fields (reactive!)
    repoPath: null,
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
    lastFetchAt: null,

    // Commit diff in main view
    commitDiffOriginal: '',
    commitDiffModified: '',
    commitDiffPath: null,
    commitDiffHash: null,

    showCommitFileDiff: async (hash, file) => {
      const proj = getProject()
      if (!proj) return
      try {
        const parentRef = `${hash}~1`
        const orig = file.status === 'A' ? '' : await window.git.showCommitFile(proj.repoPath, parentRef, file.path)
        const mod = file.status === 'D' ? '' : await window.git.showCommitFile(proj.repoPath, hash, file.path)
        set({ commitDiffOriginal: orig, commitDiffModified: mod, commitDiffPath: file.path, commitDiffHash: hash })
        updateProject({ selectedFile: null }) // clear working-tree selection
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    clearCommitDiff: () => set({ commitDiffOriginal: '', commitDiffModified: '', commitDiffPath: null, commitDiffHash: null }),

    // ---- Multi-project ----
    addProject: (path) => {
      const { projects } = get()
      const existing = projects.findIndex(p => p.repoPath === path)
      if (existing >= 0) {
        set({ activeProjectIndex: existing, ...flattenActiveProject(projects, existing) })
        return
      }
      const newProject = createProjectState(path)
      const updated = [...projects, newProject]
      const newIndex = updated.length - 1
      set({ projects: updated, activeProjectIndex: newIndex, ...flattenActiveProject(updated, newIndex) })
      window.windowApi.addProjectWatcher(path)
    },

    removeProject: (index) => {
      const { projects, activeProjectIndex } = get()
      if (index < 0 || index >= projects.length) return
      window.windowApi.removeProjectWatcher(projects[index].repoPath)
      const updated = projects.filter((_, i) => i !== index)
      let newIndex = activeProjectIndex
      if (index === activeProjectIndex) {
        newIndex = Math.min(index, updated.length - 1)
      } else if (index < activeProjectIndex) {
        newIndex = activeProjectIndex - 1
      }
      set({ projects: updated, activeProjectIndex: newIndex, ...flattenActiveProject(updated, newIndex) })
    },

    switchProject: (index) => {
      const { projects } = get()
      if (index >= 0 && index < projects.length) {
        set({ activeProjectIndex: index, ...flattenActiveProject(projects, index) })
      }
    },

    // ---- UI setters ----
    setActiveTab: (tab) => updateProject({ activeTab: tab }),
    setDiffMode: (mode) => set({ diffMode: mode }),
    setSelectedFile: (file) => updateProject({ selectedFile: file }),
    setDiffContent: (content) => updateProject({ diffContent: content }),
    setCommitMessage: (msg) => updateProject({ commitMessage: msg }),
    setAmendMode: (amend) => updateProject({ amendMode: amend }),
    setError: (err) => set({ error: err }),

    // ---- Refresh ----
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
      const s = get()
      await Promise.all([s.refreshStatus(), s.refreshLog(), s.refreshBranches(), s.refreshStashes(), s.refreshRemotes()])
      set({ isLoading: false })
    },

    // ---- File ops ----
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

    // ---- Diff ----
    selectFileAndShowDiff: async (file) => {
      const proj = getProject()
      if (!proj) return
      updateProject({ selectedFile: file })
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

    // ---- Git ops ----
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
      try { await window.git.push(proj.repoPath); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
    },

    doPull: async () => {
      const proj = getProject()
      if (!proj) return
      try { await window.git.pull(proj.repoPath); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
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

    // ---- Branch ----
    createBranch: async (name, startPoint) => {
      const proj = getProject()
      if (!proj) return
      try { await window.git.createBranch(proj.repoPath, name, startPoint); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
    },

    switchBranch: async (name) => {
      const proj = getProject()
      if (!proj) return
      try { await window.git.checkout(proj.repoPath, name); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
    },

    deleteBranch: async (name, force) => {
      const proj = getProject()
      if (!proj) return
      try { await window.git.deleteBranch(proj.repoPath, name, force); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
    },

    mergeBranch: async (name) => {
      const proj = getProject()
      if (!proj) return
      try { await window.git.merge(proj.repoPath, name); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
    },

    // ---- Stash ----
    saveStash: async (message) => {
      const proj = getProject()
      if (!proj) return
      try { await window.git.stashSave(proj.repoPath, message); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
    },

    popStash: async (index) => {
      const proj = getProject()
      if (!proj) return
      try { await window.git.stashPop(proj.repoPath, index); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
    },

    applyStash: async (index) => {
      const proj = getProject()
      if (!proj) return
      try { await window.git.stashApply(proj.repoPath, index); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
    },

    dropStash: async (index) => {
      const proj = getProject()
      if (!proj) return
      try { await window.git.stashDrop(proj.repoPath, index); await get().refreshAll() }
      catch (err: any) { set({ error: err.message }) }
    },

    // ---- Blame ----
    getBlame: async (filePath) => {
      const proj = getProject()
      if (!proj) return []
      const cacheKey = `${proj.repoPath}:${filePath}`
      const { blameCache } = get()
      if (blameCache[cacheKey]) return blameCache[cacheKey]
      try {
        const result = await window.git.blame(proj.repoPath, filePath)
        const parsed = parseBlame(result)
        set({ blameCache: { ...blameCache, [cacheKey]: parsed } })
        return parsed
      } catch {
        return []
      }
    },

    // ---- Auto fetch ----
    autoFetchAll: async () => {
      const { projects, activeProjectIndex } = get()
      for (let i = 0; i < projects.length; i++) {
        try {
          await window.git.fetch(projects[i].repoPath)
          updateProjectAt(i, { lastFetchAt: Date.now() })
        } catch {
          // silent
        }
      }
      await get().refreshAll()
    }
  }
})

function parseBlame(raw: string): BlameInfo[] {
  const lines: BlameInfo[] = []
  const blocks = raw.split('\n')
  let current: Partial<BlameInfo> = {}

  for (const line of blocks) {
    if (/^[0-9a-f]{40}\s/.test(line)) {
      const parts = line.split(' ')
      current.hash = parts[0]
      current.line = parseInt(parts[2] || parts[1], 10)
    } else if (line.startsWith('author ')) {
      current.author = line.substring(7)
    } else if (line.startsWith('author-mail ')) {
      current.authorEmail = line.substring(12).replace(/[<>]/g, '')
    } else if (line.startsWith('author-time ')) {
      current.date = new Date(parseInt(line.substring(12), 10) * 1000).toLocaleString()
    } else if (line.startsWith('summary ')) {
      current.summary = line.substring(8)
    } else if (line.startsWith('\t')) {
      if (current.hash && current.author) lines.push(current as BlameInfo)
      current = {}
    }
  }
  return lines
}
