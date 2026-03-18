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

interface GitStore {
  repoPath: string | null
  currentBranch: string
  activeTab: ViewTab
  diffMode: DiffMode
  selectedFile: GitFile | null
  diffContent: string
  commitMessage: string
  amendMode: boolean
  isLoading: boolean
  error: string | null

  stagedFiles: GitFile[]
  unstagedFiles: GitFile[]
  untrackedFiles: GitFile[]

  commits: CommitInfo[]
  branches: BranchInfo[]
  stashes: StashEntry[]
  remotes: RemoteInfo[]

  setRepoPath: (path: string) => void
  setActiveTab: (tab: ViewTab) => void
  setDiffMode: (mode: DiffMode) => void
  setSelectedFile: (file: GitFile | null) => void
  setDiffContent: (content: string) => void
  setCommitMessage: (msg: string) => void
  setAmendMode: (amend: boolean) => void
  setError: (err: string | null) => void

  refreshStatus: () => Promise<void>
  refreshLog: () => Promise<void>
  refreshBranches: () => Promise<void>
  refreshStashes: () => Promise<void>
  refreshRemotes: () => Promise<void>
  refreshAll: () => Promise<void>

  stageFile: (file: GitFile) => Promise<void>
  unstageFile: (file: GitFile) => Promise<void>
  stageAll: () => Promise<void>
  unstageAll: () => Promise<void>
  discardFile: (file: GitFile) => Promise<void>

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

export const useGitStore = create<GitStore>((set, get) => ({
  repoPath: null,
  currentBranch: '',
  activeTab: 'changes',
  diffMode: 'side-by-side',
  selectedFile: null,
  diffContent: '',
  commitMessage: '',
  amendMode: false,
  isLoading: false,
  error: null,

  stagedFiles: [],
  unstagedFiles: [],
  untrackedFiles: [],
  commits: [],
  branches: [],
  stashes: [],
  remotes: [],

  setRepoPath: (path) => set({ repoPath: path }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDiffMode: (mode) => set({ diffMode: mode }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  setDiffContent: (content) => set({ diffContent: content }),
  setCommitMessage: (msg) => set({ commitMessage: msg }),
  setAmendMode: (amend) => set({ amendMode: amend }),
  setError: (err) => set({ error: err }),

  refreshStatus: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    try {
      const status = await window.git.status(repoPath)
      const { staged, unstaged, untracked } = parseStatusFiles(status)
      const currentBranch = status.current || 'HEAD'
      set({ stagedFiles: staged, unstagedFiles: unstaged, untrackedFiles: untracked, currentBranch })
      window.windowApi.setTitle(`Git Manager - ${repoPath.split('/').pop()} [${currentBranch}]`)
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  refreshLog: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    try {
      const log = await window.git.log(repoPath, 200)
      const commits: CommitInfo[] = (log.all || []).map((c: any) => ({
        hash: c.hash,
        date: c.date,
        message: c.message,
        author_name: c.author_name,
        author_email: c.author_email,
        refs: c.refs || ''
      }))
      set({ commits })
    } catch (err: any) {
      set({ commits: [] })
    }
  },

  refreshBranches: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    try {
      const result = await window.git.branches(repoPath)
      const branches: BranchInfo[] = Object.entries(result.branches).map(([name, info]: [string, any]) => ({
        name,
        current: info.current,
        commit: info.commit,
        label: info.label,
        isRemote: name.startsWith('remotes/')
      }))
      set({ branches })
    } catch (err: any) {
      set({ branches: [] })
    }
  },

  refreshStashes: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    try {
      const result = await window.git.stashList(repoPath)
      const stashes: StashEntry[] = (result.all || []).map((s: any, i: number) => ({
        hash: s.hash,
        date: s.date,
        message: s.message,
        index: i
      }))
      set({ stashes })
    } catch {
      set({ stashes: [] })
    }
  },

  refreshRemotes: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    try {
      const remotes = await window.git.remotes(repoPath)
      set({ remotes: remotes || [] })
    } catch {
      set({ remotes: [] })
    }
  },

  refreshAll: async () => {
    set({ isLoading: true })
    const { refreshStatus, refreshLog, refreshBranches, refreshStashes, refreshRemotes } = get()
    await Promise.all([refreshStatus(), refreshLog(), refreshBranches(), refreshStashes(), refreshRemotes()])
    set({ isLoading: false })
  },

  stageFile: async (file) => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return
    await window.git.add(repoPath, file.path)
    await refreshStatus()
  },

  unstageFile: async (file) => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return
    await window.git.unstage(repoPath, file.path)
    await refreshStatus()
  },

  stageAll: async () => {
    const { repoPath, unstagedFiles, untrackedFiles, refreshStatus } = get()
    if (!repoPath) return
    const allFiles = [...unstagedFiles, ...untrackedFiles].map(f => f.path)
    if (allFiles.length > 0) {
      await window.git.add(repoPath, allFiles)
      await refreshStatus()
    }
  },

  unstageAll: async () => {
    const { repoPath, stagedFiles, refreshStatus } = get()
    if (!repoPath) return
    const allFiles = stagedFiles.map(f => f.path)
    if (allFiles.length > 0) {
      await window.git.unstage(repoPath, allFiles)
      await refreshStatus()
    }
  },

  discardFile: async (file) => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return
    await window.git.discard(repoPath, [file.path])
    await refreshStatus()
  },

  selectFileAndShowDiff: async (file) => {
    const { repoPath, diffMode } = get()
    if (!repoPath) return
    set({ selectedFile: file })

    try {
      let diffText = ''
      if (file.status === 'untracked') {
        const content = await window.git.showFile(repoPath, file.path)
        // Create a unified diff for new files
        const lines = content.split('\n')
        diffText = `diff --git a/${file.path} b/${file.path}\nnew file mode 100644\n--- /dev/null\n+++ b/${file.path}\n@@ -0,0 +1,${lines.length} @@\n${lines.map(l => `+${l}`).join('\n')}\n`
      } else if (file.staged) {
        diffText = await window.git.diffStaged(repoPath, file.path)
      } else {
        diffText = await window.git.diff(repoPath, file.path)
      }
      set({ diffContent: diffText })
    } catch (err: any) {
      set({ diffContent: '', error: err.message })
    }
  },

  showCommitDiff: async (hash) => {
    const { repoPath } = get()
    if (!repoPath) return
    try {
      const diff = await window.git.diffCommit(repoPath, hash)
      set({ diffContent: diff, selectedFile: null })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  doCommit: async () => {
    const { repoPath, commitMessage, amendMode, refreshAll } = get()
    if (!repoPath || !commitMessage.trim()) return
    try {
      await window.git.commit(repoPath, commitMessage, amendMode)
      set({ commitMessage: '', amendMode: false })
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  doCommitAndPush: async () => {
    const { repoPath, commitMessage, amendMode, refreshAll } = get()
    if (!repoPath || !commitMessage.trim()) return
    try {
      await window.git.commit(repoPath, commitMessage, amendMode)
      await window.git.push(repoPath)
      set({ commitMessage: '', amendMode: false })
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  doPush: async () => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.push(repoPath)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  doPull: async () => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.pull(repoPath)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  doFetch: async () => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.fetch(repoPath)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  createBranch: async (name, startPoint) => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.createBranch(repoPath, name, startPoint)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  switchBranch: async (name) => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.checkout(repoPath, name)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  deleteBranch: async (name, force) => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.deleteBranch(repoPath, name, force)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  mergeBranch: async (name) => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.merge(repoPath, name)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  saveStash: async (message) => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.stashSave(repoPath, message)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  popStash: async (index) => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.stashPop(repoPath, index)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  applyStash: async (index) => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.stashApply(repoPath, index)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  dropStash: async (index) => {
    const { repoPath, refreshAll } = get()
    if (!repoPath) return
    try {
      await window.git.stashDrop(repoPath, index)
      await refreshAll()
    } catch (err: any) {
      set({ error: err.message })
    }
  }
}))
