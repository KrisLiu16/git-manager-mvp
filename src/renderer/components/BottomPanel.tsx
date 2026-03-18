import { useState, useEffect, useRef } from 'react'
import { DiffEditor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useGitStore, CommitInfo, BranchInfo } from '../stores/gitStore'

loader.config({ monaco })

type BottomTab = 'log' | 'terminal'

export function BottomPanel({ height, collapsed, onToggle }: {
  height: number; collapsed: boolean; onToggle: () => void
}) {
  const [activeTab, setActiveTab] = useState<BottomTab>('log')
  const { currentBranch } = useGitStore()

  return (
    <div className="border-t border-border bg-bg-primary flex flex-col flex-shrink-0" style={{ height }}>
      {/* Tab bar */}
      <div className="flex items-center bg-bg-secondary border-b border-border flex-shrink-0 h-7 gap-0">
        <button onClick={onToggle}
          className="px-1.5 text-text-secondary hover:text-text-primary text-[10px] flex-shrink-0">
          {collapsed ? '▲' : '▼'}
        </button>
        <span className="text-[11px] font-medium text-text-secondary mr-1 flex-shrink-0">Git</span>
        <TabBtn label={`日志: ${currentBranch || 'HEAD'}`} active={activeTab === 'log'}
          onClick={() => { setActiveTab('log'); if (collapsed) onToggle() }} />
        <TabBtn label="终端" active={activeTab === 'terminal'}
          onClick={() => { setActiveTab('terminal'); if (collapsed) onToggle() }} />
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'log' ? <LogPanel /> : <TerminalPanel />}
        </div>
      )}
    </div>
  )
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-0.5 text-[11px] border-r border-border transition-colors flex-shrink-0 ${
        active ? 'bg-bg-primary text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
      }`}>
      {label}
    </button>
  )
}

// ---- Log Panel ----

function LogPanel() {
  const { commits, branches, currentBranch, repoPath, refreshLog, refreshBranches,
    switchBranch, createBranch, deleteBranch, mergeBranch } = useGitStore()
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)
  const [commitFiles, setCommitFiles] = useState<{ status: string; path: string }[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [origContent, setOrigContent] = useState('')
  const [modContent, setModContent] = useState('')
  const [showDiff, setShowDiff] = useState(false)
  const [branchCtx, setBranchCtx] = useState<{ x: number; y: number; branch: BranchInfo } | null>(null)

  useEffect(() => { refreshLog(); refreshBranches() }, [repoPath])

  const localBranches = branches.filter(b => !b.isRemote)
  const remoteBranches = branches.filter(b => b.isRemote)
  const remoteGroups = new Map<string, BranchInfo[]>()
  for (const b of remoteBranches) {
    const remote = b.name.replace('remotes/', '').split('/')[0]
    if (!remoteGroups.has(remote)) remoteGroups.set(remote, [])
    remoteGroups.get(remote)!.push(b)
  }

  const onSelectCommit = async (c: CommitInfo) => {
    setSelectedCommit(c); setSelectedFile(null); setShowDiff(false)
    if (!repoPath) return
    try { setCommitFiles(await window.git.commitFiles(repoPath, c.hash)) } catch { setCommitFiles([]) }
  }

  const onSelectFile = async (f: { status: string; path: string }) => {
    if (!repoPath || !selectedCommit) return
    setSelectedFile(f.path); setShowDiff(true)
    try {
      const parentRef = `${selectedCommit.hash}~1`
      setOrigContent(f.status === 'A' ? '' : await window.git.showCommitFile(repoPath, parentRef, f.path))
      setModContent(f.status === 'D' ? '' : await window.git.showCommitFile(repoPath, selectedCommit.hash, f.path))
    } catch { setOrigContent(''); setModContent('') }
  }

  return (
    <div className="flex h-full" onClick={() => setBranchCtx(null)}>
      {/* Branch tree */}
      <div className="w-[170px] border-r border-border overflow-y-auto flex-shrink-0 text-[11px] select-none">
        <TreeSection title="本地" defaultOpen>
          {localBranches.map(b => (
            <div key={b.name}
              className={`pl-5 pr-2 py-[2px] flex items-center gap-1 cursor-pointer truncate ${b.name === currentBranch ? 'bg-bg-active text-white' : 'hover:bg-bg-hover text-text-primary'}`}
              onClick={() => b.name !== currentBranch && switchBranch(b.name)}
              onContextMenu={e => { e.preventDefault(); setBranchCtx({ x: e.clientX, y: e.clientY, branch: b }) }}>
              {b.name === currentBranch && <span className="text-[8px] text-yellow-400">★</span>}
              <span className="truncate">{b.name}</span>
              {b.name === currentBranch && <span className="text-[9px] text-text-secondary ml-auto flex-shrink-0">✓</span>}
            </div>
          ))}
        </TreeSection>
        <TreeSection title="远程" defaultOpen>
          {Array.from(remoteGroups.entries()).map(([remote, brs]) => (
            <TreeSection key={remote} title={remote} defaultOpen indent={1}>
              {brs.map(b => {
                const short = b.name.replace(`remotes/${remote}/`, '')
                return (
                  <div key={b.name}
                    className="pl-8 pr-2 py-[2px] cursor-pointer hover:bg-bg-hover text-text-primary truncate"
                    onClick={() => switchBranch(b.name)}
                    onContextMenu={e => { e.preventDefault(); setBranchCtx({ x: e.clientX, y: e.clientY, branch: b }) }}>
                    {short}
                  </div>
                )
              })}
            </TreeSection>
          ))}
        </TreeSection>

        {/* Branch context menu */}
        {branchCtx && (
          <BranchContextMenu x={branchCtx.x} y={branchCtx.y} branch={branchCtx.branch}
            currentBranch={currentBranch}
            onClose={() => setBranchCtx(null)}
            onCheckout={() => { switchBranch(branchCtx.branch.name); setBranchCtx(null) }}
            onMerge={() => { mergeBranch(branchCtx.branch.name); setBranchCtx(null) }}
            onDelete={() => { deleteBranch(branchCtx.branch.name); setBranchCtx(null) }}
          />
        )}
      </div>

      {/* Commit list */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {commits.map(c => (
          <div key={c.hash}
            className={`flex items-center gap-2 px-2 py-[3px] border-b border-border/50 cursor-pointer text-[11px] ${
              selectedCommit?.hash === c.hash ? 'bg-bg-active' : 'hover:bg-bg-hover'
            }`}
            onClick={() => onSelectCommit(c)}>
            <div className="w-3 flex justify-center flex-shrink-0">
              <div className={`w-[7px] h-[7px] rounded-full border-2 ${selectedCommit?.hash === c.hash ? 'border-blue-400 bg-blue-400' : 'border-text-accent bg-transparent'}`} />
            </div>
            <span className="flex-1 min-w-0 truncate text-text-primary">{c.message}</span>
            {c.refs && c.refs.split(',').map(r => r.trim()).filter(Boolean).map((ref, i) => (
              <span key={i} className="text-[9px] bg-bg-tertiary text-text-accent px-1 rounded flex-shrink-0">{ref}</span>
            ))}
            <span className="text-text-secondary flex-shrink-0 w-[70px] truncate text-right text-[10px]">{c.author_name}</span>
            <span className="text-text-secondary flex-shrink-0 w-[90px] text-right text-[10px]">
              {new Date(c.date).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {commits.length === 0 && <div className="p-3 text-center text-text-secondary text-xs">暂无提交</div>}
      </div>

      {/* Right detail */}
      <div className="w-[300px] border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
        {selectedCommit ? (
          showDiff && selectedFile ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-2 py-1 bg-bg-secondary border-b border-border flex-shrink-0">
                <span className="text-[10px] text-text-primary truncate">{selectedFile}</span>
                <button onClick={() => setShowDiff(false)} className="text-[10px] text-text-accent hover:text-text-link px-1">←</button>
              </div>
              <div className="flex-1 min-h-0">
                <DiffEditor original={origContent} modified={modContent}
                  language={langFromPath(selectedFile)} theme="vs-dark"
                  options={{ readOnly: true, renderSideBySide: false, minimap: { enabled: false },
                    fontSize: 11, lineHeight: 17, scrollBeyondLastLine: false, wordWrap: 'on',
                    automaticLayout: true, glyphMargin: false, lineNumbersMinChars: 3 }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-2 py-1.5 bg-bg-secondary border-b border-border flex-shrink-0">
                <div className="text-[11px] text-text-primary font-medium leading-relaxed">{selectedCommit.message}</div>
                <div className="flex items-center gap-2 text-[10px] text-text-secondary mt-0.5">
                  <span className="text-text-accent font-mono">{selectedCommit.hash.substring(0, 8)}</span>
                  <span>{selectedCommit.author_name}</span>
                  <span>{new Date(selectedCommit.date).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {commitFiles.map(f => (
                  <div key={f.path}
                    className="px-2 py-[2px] text-[11px] cursor-pointer hover:bg-bg-hover flex items-center gap-1.5"
                    onClick={() => onSelectFile(f)}>
                    <span className={`font-mono text-[10px] w-3 ${f.status === 'A' ? 'text-status-added' : f.status === 'D' ? 'text-status-deleted' : 'text-status-modified'}`}>{f.status}</span>
                    <span className="text-text-primary truncate">{f.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-[11px]">
            选择要查看更改的提交
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Tree helpers ----

function TreeSection({ title, children, defaultOpen = true, indent = 0 }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; indent?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <div className={`px-2 py-[3px] flex items-center gap-1 cursor-pointer hover:bg-bg-hover text-text-secondary`}
        style={{ paddingLeft: 8 + indent * 16 }}
        onClick={() => setOpen(!open)}>
        <span className="text-[8px]">{open ? '▼' : '▶'}</span>
        <span className="font-medium">{title}</span>
      </div>
      {open && children}
    </div>
  )
}

function BranchContextMenu({ x, y, branch, currentBranch, onClose, onCheckout, onMerge, onDelete }: {
  x: number; y: number; branch: BranchInfo; currentBranch: string
  onClose: () => void; onCheckout: () => void; onMerge: () => void; onDelete: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="context-menu z-50" style={{ left: x, top: y }}>
        {branch.name !== currentBranch && (
          <div className="context-menu-item" onClick={onCheckout}>检出</div>
        )}
        {branch.name !== currentBranch && !branch.isRemote && (
          <div className="context-menu-item" onClick={onMerge}>合并到当前分支</div>
        )}
        {branch.name !== currentBranch && !branch.isRemote && (
          <>
            <div className="context-menu-separator" />
            <div className="context-menu-item text-status-deleted" onClick={onDelete}>删除分支</div>
          </>
        )}
      </div>
    </>
  )
}

// ---- Terminal Panel ----

function TerminalPanel() {
  const { repoPath } = useGitStore()
  const [history, setHistory] = useState<{ cmd: string; output: string }[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const runCommand = async () => {
    if (!input.trim() || !repoPath) return
    const cmd = input.trim()
    setInput('')
    try {
      const result = await window.git.rawCommand(repoPath, cmd)
      setHistory(h => [...h, { cmd, output: result }])
    } catch (err: any) {
      setHistory(h => [...h, { cmd, output: `错误: ${err.message}` }])
    }
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50)
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] font-mono text-[11px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
        {history.length === 0 && (
          <div className="text-text-secondary">输入 git 命令，如: status, log --oneline, diff</div>
        )}
        {history.map((h, i) => (
          <div key={i} className="mb-2">
            <div className="text-text-accent">$ git {h.cmd}</div>
            <pre className="text-text-primary whitespace-pre-wrap">{h.output}</pre>
          </div>
        ))}
      </div>
      <div className="flex items-center border-t border-border px-2 py-1 gap-1 flex-shrink-0">
        <span className="text-text-accent flex-shrink-0">$ git</span>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runCommand()}
          className="flex-1 bg-transparent text-text-primary outline-none text-[11px]"
          placeholder="status" autoFocus />
      </div>
    </div>
  )
}

// ---- Helpers ----

function langFromPath(p: string): string {
  const ext = p.split('.').pop()?.toLowerCase() || ''
  const m: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', html: 'html', py: 'python',
    go: 'go', rs: 'rust', java: 'java', yaml: 'yaml', yml: 'yaml', sh: 'shell',
  }
  return m[ext] || 'plaintext'
}
