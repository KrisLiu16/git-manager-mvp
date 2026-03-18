import { useState, useEffect } from 'react'
import { DiffEditor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useGitStore, CommitInfo, BranchInfo } from '../stores/gitStore'

loader.config({ monaco })

type BottomTab = 'log' | 'stash'

export function BottomPanel({ height, collapsed, onToggle }: {
  height: number
  collapsed: boolean
  onToggle: () => void
}) {
  const [activeTab, setActiveTab] = useState<BottomTab>('log')

  return (
    <div className="border-t border-border bg-bg-primary flex flex-col flex-shrink-0" style={{ height }}>
      {/* Tab bar */}
      <div className="flex items-center bg-bg-secondary border-b border-border flex-shrink-0 h-7">
        <button
          onClick={onToggle}
          className="px-2 text-text-secondary hover:text-text-primary text-[10px]"
          title={collapsed ? '展开' : '收起'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
        <span className="text-[10px] font-medium text-text-secondary mr-1">Git</span>
        <TabButton label="日志" active={activeTab === 'log'} onClick={() => { setActiveTab('log'); if (collapsed) onToggle() }} />
        <TabButton label="暂存" active={activeTab === 'stash'} onClick={() => { setActiveTab('stash'); if (collapsed) onToggle() }} />
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'log' ? <LogPanel /> : <StashPanel />}
        </div>
      )}
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-0.5 text-[11px] border-r border-border transition-colors ${
        active ? 'bg-bg-primary text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
      }`}
    >
      {label}
    </button>
  )
}

// ---- Log Panel (GoLand style: branch tree left + commit list right) ----

function LogPanel() {
  const {
    commits, branches, currentBranch, repoPath, diffMode, setDiffMode,
    refreshLog, refreshBranches
  } = useGitStore()

  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)
  const [commitFiles, setCommitFiles] = useState<{ status: string; path: string }[]>([])
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [originalContent, setOriginalContent] = useState('')
  const [modifiedContent, setModifiedContent] = useState('')
  const [showDiff, setShowDiff] = useState(false)

  useEffect(() => { refreshLog(); refreshBranches() }, [repoPath])

  const localBranches = branches.filter(b => !b.isRemote)
  const remoteBranches = branches.filter(b => b.isRemote)

  const handleSelectCommit = async (commit: CommitInfo) => {
    setSelectedCommit(commit)
    setSelectedFilePath(null)
    setShowDiff(false)
    if (!repoPath) return
    try {
      const files = await window.git.commitFiles(repoPath, commit.hash)
      setCommitFiles(files)
    } catch {
      setCommitFiles([])
    }
  }

  const handleSelectFile = async (file: { status: string; path: string }) => {
    if (!repoPath || !selectedCommit) return
    setSelectedFilePath(file.path)
    setShowDiff(true)
    try {
      if (file.status === 'A') {
        setOriginalContent('')
        setModifiedContent(await window.git.showCommitFile(repoPath, selectedCommit.hash, file.path))
      } else if (file.status === 'D') {
        setOriginalContent(await window.git.showCommitFile(repoPath, `${selectedCommit.hash}~1`, file.path))
        setModifiedContent('')
      } else {
        setOriginalContent(await window.git.showCommitFile(repoPath, `${selectedCommit.hash}~1`, file.path))
        setModifiedContent(await window.git.showCommitFile(repoPath, selectedCommit.hash, file.path))
      }
    } catch {
      setOriginalContent('')
      setModifiedContent('')
    }
  }

  return (
    <div className="flex h-full">
      {/* Branch tree (left) */}
      <div className="w-[180px] border-r border-border overflow-y-auto flex-shrink-0">
        <BranchTree
          localBranches={localBranches}
          remoteBranches={remoteBranches}
          currentBranch={currentBranch}
        />
      </div>

      {/* Commit list (center) */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {commits.map((commit) => (
          <CommitRow
            key={commit.hash}
            commit={commit}
            isSelected={selectedCommit?.hash === commit.hash}
            onClick={() => handleSelectCommit(commit)}
          />
        ))}
        {commits.length === 0 && (
          <div className="p-3 text-center text-text-secondary text-xs">暂无提交记录</div>
        )}
      </div>

      {/* Right detail panel */}
      <div className="w-[320px] border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
        {selectedCommit ? (
          showDiff && selectedFilePath ? (
            // File diff
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-2 py-1 bg-bg-secondary border-b border-border flex-shrink-0">
                <span className="text-[10px] text-text-primary truncate">{selectedFilePath}</span>
                <button
                  onClick={() => setShowDiff(false)}
                  className="text-[10px] text-text-secondary hover:text-text-primary px-1"
                >
                  ← 返回
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <DiffEditor
                  original={originalContent}
                  modified={modifiedContent}
                  language={detectLang(selectedFilePath)}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    renderSideBySide: false,
                    minimap: { enabled: false },
                    fontSize: 11,
                    lineHeight: 18,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    glyphMargin: false,
                    lineNumbersMinChars: 3,
                    scrollbar: { verticalScrollbarSize: 6 }
                  }}
                />
              </div>
            </div>
          ) : (
            // Commit detail
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-3 py-2 bg-bg-secondary border-b border-border flex-shrink-0">
                <div className="text-xs text-text-primary font-medium mb-1 leading-relaxed">{selectedCommit.message}</div>
                <div className="flex items-center gap-2 text-[10px] text-text-secondary flex-wrap">
                  <span className="text-text-accent font-mono">{selectedCommit.hash.substring(0, 8)}</span>
                  <span>{selectedCommit.author_name}</span>
                  <span>{new Date(selectedCommit.date).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] text-text-secondary bg-bg-tertiary border-b border-border">
                  变更文件 ({commitFiles.length})
                </div>
                {commitFiles.map((file) => (
                  <div
                    key={file.path}
                    className="px-2 py-0.5 text-[11px] cursor-pointer hover:bg-bg-hover flex items-center gap-1.5"
                    onClick={() => handleSelectFile(file)}
                  >
                    <span className={`font-mono text-[10px] w-3 ${statusColor(file.status)}`}>{file.status}</span>
                    <span className="text-text-primary truncate">{file.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-xs">
            选择要查看更改的提交
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Branch Tree ----

function BranchTree({ localBranches, remoteBranches, currentBranch }: {
  localBranches: BranchInfo[]
  remoteBranches: BranchInfo[]
  currentBranch: string
}) {
  const { switchBranch, createBranch, deleteBranch, mergeBranch } = useGitStore()
  const [localOpen, setLocalOpen] = useState(true)
  const [remoteOpen, setRemoteOpen] = useState(true)

  // Group remote branches by remote name
  const remoteGroups = new Map<string, BranchInfo[]>()
  for (const b of remoteBranches) {
    const parts = b.name.replace('remotes/', '').split('/')
    const remote = parts[0]
    if (!remoteGroups.has(remote)) remoteGroups.set(remote, [])
    remoteGroups.get(remote)!.push(b)
  }

  return (
    <div className="text-[11px] select-none">
      {/* Local */}
      <div
        className="px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-bg-hover text-text-secondary font-medium"
        onClick={() => setLocalOpen(!localOpen)}
      >
        <span className="text-[9px]">{localOpen ? '▼' : '▶'}</span>
        <span>本地</span>
      </div>
      {localOpen && localBranches.map(b => (
        <div
          key={b.name}
          className={`pl-5 pr-2 py-0.5 flex items-center gap-1.5 cursor-pointer truncate ${
            b.name === currentBranch ? 'bg-bg-active text-white' : 'hover:bg-bg-hover text-text-primary'
          }`}
          onClick={() => b.name !== currentBranch && switchBranch(b.name)}
          title={b.name}
        >
          {b.name === currentBranch && <span className="text-status-added text-[8px]">★</span>}
          <span className="truncate">{b.name}</span>
        </div>
      ))}

      {/* Remote */}
      <div
        className="px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-bg-hover text-text-secondary font-medium mt-1"
        onClick={() => setRemoteOpen(!remoteOpen)}
      >
        <span className="text-[9px]">{remoteOpen ? '▼' : '▶'}</span>
        <span>远程</span>
      </div>
      {remoteOpen && Array.from(remoteGroups.entries()).map(([remote, brs]) => (
        <RemoteGroup key={remote} remote={remote} branches={brs} />
      ))}
    </div>
  )
}

function RemoteGroup({ remote, branches }: { remote: string; branches: BranchInfo[] }) {
  const [open, setOpen] = useState(true)
  const { switchBranch } = useGitStore()

  return (
    <div>
      <div
        className="pl-4 pr-2 py-0.5 flex items-center gap-1 cursor-pointer hover:bg-bg-hover text-text-secondary"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[8px]">{open ? '▼' : '▶'}</span>
        <span>{remote}</span>
      </div>
      {open && branches.map(b => {
        const shortName = b.name.replace(`remotes/${remote}/`, '')
        return (
          <div
            key={b.name}
            className="pl-8 pr-2 py-0.5 cursor-pointer hover:bg-bg-hover text-text-primary truncate text-[11px]"
            onClick={() => switchBranch(b.name)}
            title={b.name}
          >
            {shortName}
          </div>
        )
      })}
    </div>
  )
}

// ---- Stash Panel ----

function StashPanel() {
  const { stashes, refreshStashes, saveStash, popStash, applyStash, dropStash, repoPath } = useGitStore()
  const [showSave, setShowSave] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { refreshStashes() }, [repoPath])

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 bg-bg-secondary border-b border-border flex items-center justify-between flex-shrink-0">
        <span className="text-[11px] text-text-secondary">暂存列表 ({stashes.length})</span>
        <button
          onClick={() => setShowSave(!showSave)}
          className="text-[10px] text-text-accent hover:text-text-link"
        >
          + 暂存变更
        </button>
      </div>
      {showSave && (
        <div className="px-2 py-1.5 bg-bg-tertiary border-b border-border flex gap-1.5 flex-shrink-0">
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="暂存信息..."
            className="flex-1 bg-bg-primary border border-border rounded px-2 py-0.5 text-[11px] text-text-primary focus:outline-none focus:border-border-focus"
            onKeyDown={e => e.key === 'Enter' && (saveStash(msg || undefined), setMsg(''), setShowSave(false))}
            autoFocus
          />
          <button
            onClick={() => { saveStash(msg || undefined); setMsg(''); setShowSave(false) }}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded"
          >
            保存
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {stashes.map(s => (
          <div key={s.hash} className="px-3 py-1.5 border-b border-border hover:bg-bg-hover group flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] text-text-primary truncate">{s.message}</div>
              <div className="text-[10px] text-text-secondary">stash@{'{' + s.index + '}'}</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
              <button onClick={() => applyStash(s.index)} className="text-[10px] text-text-accent hover:text-text-link px-1">应用</button>
              <button onClick={() => popStash(s.index)} className="text-[10px] text-status-added px-1">弹出</button>
              <button onClick={() => dropStash(s.index)} className="text-[10px] text-status-deleted px-1">删除</button>
            </div>
          </div>
        ))}
        {stashes.length === 0 && (
          <div className="p-3 text-center text-text-secondary text-[11px]">暂无暂存</div>
        )}
      </div>
    </div>
  )
}

// ---- Commit Row ----

function CommitRow({ commit, isSelected, onClick }: {
  commit: CommitInfo; isSelected: boolean; onClick: () => void
}) {
  const refs = commit.refs ? commit.refs.split(',').map(r => r.trim()).filter(Boolean) : []

  return (
    <div
      className={`flex items-center gap-3 px-3 py-1 border-b border-border cursor-pointer text-[11px] ${
        isSelected ? 'bg-bg-active' : 'hover:bg-bg-hover'
      }`}
      onClick={onClick}
    >
      {/* Graph dot */}
      <div className="flex-shrink-0 w-3 flex justify-center">
        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-text-accent'}`} />
      </div>
      {/* Message + refs */}
      <div className="flex-1 min-w-0 truncate">
        <span className="text-text-primary">{commit.message}</span>
        {refs.map((ref, i) => (
          <span key={i} className="ml-1.5 text-[9px] bg-bg-tertiary text-text-accent px-1 py-0.5 rounded">
            {ref}
          </span>
        ))}
      </div>
      {/* Author */}
      <span className="text-text-secondary flex-shrink-0 w-[80px] truncate text-right">{commit.author_name}</span>
      {/* Date */}
      <span className="text-text-secondary flex-shrink-0 w-[100px] text-right">
        {new Date(commit.date).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

// ---- Helpers ----

function statusColor(s: string): string {
  switch (s) {
    case 'A': return 'text-status-added'
    case 'M': return 'text-status-modified'
    case 'D': return 'text-status-deleted'
    default: return 'text-text-secondary'
  }
}

function detectLang(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const m: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', html: 'html', py: 'python',
    go: 'go', rs: 'rust', java: 'java', yaml: 'yaml', yml: 'yaml',
    sh: 'shell', sql: 'sql', swift: 'swift', kt: 'kotlin',
  }
  return m[ext] || 'plaintext'
}
