import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useGitStore, BranchInfo } from '../stores/gitStore'
import { ContextMenu, MenuItem } from './ContextMenu'
import { InputDialog } from './InputDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { GitGraph, ICommitItem } from 'git-graph-svg'

type BottomTab = 'log' | 'terminal'

interface GraphCommit {
  hash: string; parents: string[]; author_name: string; author_email: string
  date: string; message: string; refs: string
}

export function BottomPanel({ height, collapsed, onToggle }: {
  height: number; collapsed: boolean; onToggle: () => void
}) {
  const [activeTab, setActiveTab] = useState<BottomTab>('log')
  const { currentBranch } = useGitStore()

  return (
    <div className="border-t border-border bg-bg-primary flex flex-col flex-shrink-0" style={{ height }}>
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
      }`}>{label}</button>
  )
}

// ============ LOG PANEL ============

function LogPanel() {
  const { branches, currentBranch, repoPath, refreshBranches,
    switchBranch, deleteBranch, mergeBranch, showCommitFileDiff, clearCommitDiff,
    cherryPick, revertCommit, resetBranch, createBranch, createTag,
    renameBranch, rebaseBranch, doPush, doPull } = useGitStore()

  const [graphCommits, setGraphCommits] = useState<GraphCommit[]>([])
  const [selectedHash, setSelectedHash] = useState<string | null>(null)
  const [commitFiles, setCommitFiles] = useState<{ status: string; path: string }[]>([])
  const [search, setSearch] = useState('')
  const [branchCtx, setBranchCtx] = useState<{ x: number; y: number; branch: BranchInfo } | null>(null)
  const [commitCtx, setCommitCtx] = useState<{ x: number; y: number; commit: GraphCommit } | null>(null)
  const [fileCtx, setFileCtx] = useState<{ x: number; y: number; file: { status: string; path: string }; hash: string } | null>(null)
  const [inputDialog, setInputDialog] = useState<{ title: string; placeholder: string; onConfirm: (v: string) => void } | null>(null)
  const [resetDialog, setResetDialog] = useState<{ hash: string; shortHash: string } | null>(null)
  const [resetMode, setResetMode] = useState<'soft' | 'mixed' | 'hard'>('mixed')
  const [renameDialog, setRenameDialog] = useState<{ branchName: string } | null>(null)

  const graphScrollRef = useRef<HTMLDivElement>(null)
  const listScrollRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)

  const syncScroll = useCallback((source: 'graph' | 'list') => {
    if (syncing.current) return
    syncing.current = true
    const src = source === 'graph' ? graphScrollRef.current : listScrollRef.current
    const dst = source === 'graph' ? listScrollRef.current : graphScrollRef.current
    if (src && dst) dst.scrollTop = src.scrollTop
    syncing.current = false
  }, [])

  const ROW_HEIGHT = 24

  const gitGraphCommits = useMemo((): ICommitItem[] => {
    const commits = search.trim() ? [] : graphCommits
    return commits.map(c => ({
      id: c.hash,
      message: c.message,
      author: c.author_name,
      date: c.date,
      parents: c.parents
    }))
  }, [graphCommits, search])

  useEffect(() => {
    refreshBranches()
    loadGraph()
  }, [repoPath])

  const loadGraph = async () => {
    if (!repoPath) return
    try {
      const raw = await window.git.graphLog(repoPath, 300)
      setGraphCommits(raw)
    } catch { setGraphCommits([]) }
  }

  const selectedCommit = graphCommits.find(c => c.hash === selectedHash) || null

  const filteredCommits = useMemo(() => {
    if (!search.trim()) return graphCommits
    const q = search.toLowerCase()
    return graphCommits.filter(c =>
      c.message.toLowerCase().includes(q) ||
      c.hash.startsWith(q) ||
      c.author_name.toLowerCase().includes(q) ||
      c.refs.toLowerCase().includes(q)
    )
  }, [graphCommits, search])

  const onSelectCommit = async (c: GraphCommit) => {
    setSelectedHash(c.hash)
    clearCommitDiff()
    if (!repoPath) return
    try { setCommitFiles(await window.git.commitFiles(repoPath, c.hash)) } catch { setCommitFiles([]) }
  }

  const onClickFile = (f: { status: string; path: string }) => {
    if (!selectedHash) return
    showCommitFileDiff(selectedHash, f)
  }

  // Branch tree data
  const localBranches = branches.filter(b => !b.isRemote)
  const remoteBranches = branches.filter(b => b.isRemote)

  return (
    <div className="flex h-full" onClick={() => { setBranchCtx(null); setCommitCtx(null); setFileCtx(null) }}>
      {/* Branch tree */}
      <div className="w-[180px] border-r border-border overflow-y-auto flex-shrink-0 text-[11px] select-none">
        <FolderBranchTree title="本地" branches={localBranches} currentBranch={currentBranch}
          onSwitch={switchBranch} onContext={(e, b) => { e.preventDefault(); setBranchCtx({ x: e.clientX, y: e.clientY, branch: b }) }} />
        <RemoteBranchTree branches={remoteBranches} onSwitch={switchBranch}
          onContext={(e, b) => { e.preventDefault(); setBranchCtx({ x: e.clientX, y: e.clientY, branch: b }) }} />

        {branchCtx && (() => {
          const b = branchCtx.branch
          const isCurrent = b.name === currentBranch
          const isLocal = !b.isRemote
          const items: MenuItem[] = []
          if (!isCurrent) items.push({ label: '检出', onClick: () => { switchBranch(b.name); setBranchCtx(null) } })
          // 新建分支
          items.push({ label: '', onClick: () => {}, separator: true })
          items.push({ label: '从此分支新建分支...', onClick: () => {
            setInputDialog({ title: `从 ${b.name} 新建分支`, placeholder: '新分支名称',
              onConfirm: (name) => { createBranch(name, b.name); setInputDialog(null) } })
            setBranchCtx(null)
          }})
          items.push({ label: '新建标签...', onClick: () => {
            setInputDialog({ title: `在 ${b.name} 新建标签`, placeholder: '标签名称',
              onConfirm: (name) => { createTag(name, b.name); setInputDialog(null) } })
            setBranchCtx(null)
          }})
          if (!isCurrent) {
            items.push({ label: '', onClick: () => {}, separator: true })
            items.push({ label: '合并到当前分支', onClick: () => { mergeBranch(b.name); setBranchCtx(null) } })
            items.push({ label: '变基当前分支到此', onClick: () => { rebaseBranch(b.name); setBranchCtx(null) } })
            items.push({ label: '与本地比较', onClick: () => { /* compare is implicit via checkout */ setBranchCtx(null) } })
          }
          if (isCurrent) {
            items.push({ label: '', onClick: () => {}, separator: true })
            items.push({ label: '推送', onClick: () => { doPush(); setBranchCtx(null) } })
            items.push({ label: '拉取', onClick: () => { doPull(); setBranchCtx(null) } })
          }
          if (isLocal) {
            items.push({ label: '', onClick: () => {}, separator: true })
            items.push({ label: '重命名...', onClick: () => { setRenameDialog({ branchName: b.name }); setBranchCtx(null) } })
          }
          if (!isCurrent && isLocal) {
            items.push({ label: '', onClick: () => {}, separator: true })
            items.push({ label: '删除分支', onClick: () => { deleteBranch(b.name); setBranchCtx(null) }, danger: true })
          }
          return <ContextMenu x={branchCtx.x} y={branchCtx.y} items={items} onClose={() => setBranchCtx(null)} />
        })()}
      </div>

      {/* Commit list with graph + search */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center px-2 py-1 bg-bg-secondary border-b border-border gap-2 flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="文本或哈希"
            className="flex-1 bg-transparent text-[11px] text-text-primary outline-none placeholder:text-text-secondary" />
          {search && (
            <button onClick={() => setSearch('')} className="text-text-secondary hover:text-text-primary text-[10px]">✕</button>
          )}
        </div>

        {/* Commit rows with git graph */}
        <div className="flex-1 flex overflow-hidden">
          {/* Graph column - synced scroll */}
          {!search.trim() && gitGraphCommits.length > 0 && (
            <div ref={graphScrollRef} className="overflow-y-auto overflow-x-hidden flex-shrink-0 scrollbar-hide"
              onScroll={() => syncScroll('graph')}>
              <GitGraph
                commits={gitGraphCommits}
                rowHeight={ROW_HEIGHT}
                laneWidth={16}
                colorPalette={['#569cd6', '#4ec9b0', '#ce9178', '#c586c0', '#dcdcaa', '#9cdcfe', '#d7ba7d', '#b5cea8']}
                padding={{ left: 8, right: 8, top: 0, bottom: 0 }}
                style={{ display: 'block' }}
              />
            </div>
          )}
          {/* Commit rows */}
          <div ref={listScrollRef} className="flex-1 overflow-y-auto min-w-0"
            onScroll={() => syncScroll('list')}>
            {filteredCommits.map(c => (
              <div key={c.hash}
                className={`flex items-center border-b border-border/30 cursor-pointer text-[11px] ${
                  selectedHash === c.hash ? 'bg-bg-active' : 'hover:bg-bg-hover'
                }`}
                style={{ height: ROW_HEIGHT }}
                onClick={() => onSelectCommit(c)}
                onContextMenu={e => { e.preventDefault(); setCommitCtx({ x: e.clientX, y: e.clientY, commit: c }) }}>
                {/* Message */}
                <span className="flex-1 min-w-0 truncate text-text-primary px-1 relative group/row">
                  {c.message}
                  {/* Refs: show first ref inline, rest on hover */}
                  {c.refs && (() => {
                    const refs = c.refs.split(',').map(r => r.trim()).filter(Boolean)
                    if (refs.length === 0) return null
                    const first = refs[0].replace('HEAD -> ', '').replace('origin/', '⬆')
                    return (
                      <>
                        <span className="ml-1 text-[9px] bg-bg-tertiary text-text-accent px-1 rounded inline">{first}</span>
                        {refs.length > 1 && (
                          <span className="ml-0.5 text-[9px] text-text-secondary cursor-default">
                            +{refs.length - 1}
                            <span className="absolute left-0 top-full z-50 hidden group-hover/row:flex flex-wrap gap-0.5 bg-bg-tertiary border border-border rounded p-1 shadow-lg max-w-[300px]">
                              {refs.map((ref, i) => (
                                <span key={i} className="text-[9px] bg-bg-hover text-text-accent px-1 py-0.5 rounded whitespace-nowrap">
                                  {ref.replace('HEAD -> ', '').replace('origin/', '⬆')}
                                </span>
                              ))}
                            </span>
                          </span>
                        )}
                      </>
                    )
                  })()}
                </span>
                <span className="text-text-secondary flex-shrink-0 w-[65px] truncate text-right text-[10px] pr-1">{c.author_name}</span>
                <span className="text-text-secondary flex-shrink-0 w-[85px] text-right text-[10px] pr-2">
                  {new Date(c.date).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {filteredCommits.length === 0 && <div className="p-3 text-center text-text-secondary text-xs">暂无匹配提交</div>}
          </div>
        </div>
      </div>

      {/* Right: commit detail + files */}
      <div className="w-[280px] border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
        {selectedCommit ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-2 py-1.5 bg-bg-secondary border-b border-border flex-shrink-0">
              <div className="text-[11px] text-text-primary font-medium leading-relaxed">{selectedCommit.message}</div>
              <div className="flex items-center gap-2 text-[10px] text-text-secondary mt-0.5 flex-wrap">
                <span className="text-text-accent font-mono">{selectedCommit.hash.substring(0, 8)}</span>
                <span>{selectedCommit.author_name}</span>
                <span>{new Date(selectedCommit.date).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {commitFiles.map(f => (
                <div key={f.path}
                  className="px-2 py-[2px] text-[11px] cursor-pointer hover:bg-bg-hover flex items-center gap-1.5"
                  onClick={() => onClickFile(f)}
                  onContextMenu={e => { e.preventDefault(); if (selectedHash) setFileCtx({ x: e.clientX, y: e.clientY, file: f, hash: selectedHash }) }}>
                  <span className={`font-mono text-[10px] w-3 ${statusColor(f.status)}`}>{f.status}</span>
                  <span className="text-text-primary truncate">{f.path}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-[11px]">
            选择要查看更改的提交
          </div>
        )}
      </div>

      {/* Commit row context menu */}
      {commitCtx && (() => {
        const c = commitCtx.commit
        const shortH = c.hash.substring(0, 8)
        const items: MenuItem[] = [
          { label: '复制修订号', onClick: () => { navigator.clipboard.writeText(c.hash); setCommitCtx(null) } },
          { label: '复制提交信息', onClick: () => { navigator.clipboard.writeText(c.message); setCommitCtx(null) } },
          { label: '', onClick: () => {}, separator: true },
          { label: '检出此提交', onClick: () => { switchBranch(c.hash); setCommitCtx(null) } },
          { label: '优选 (Cherry-pick)', onClick: () => { cherryPick(c.hash); setCommitCtx(null) } },
          { label: '还原提交 (Revert)', onClick: () => { revertCommit(c.hash); setCommitCtx(null) } },
          { label: '', onClick: () => {}, separator: true },
          { label: `将当前分支重置到此处 (${shortH})...`, onClick: () => { setResetDialog({ hash: c.hash, shortHash: shortH }); setCommitCtx(null) }, danger: true },
          { label: '', onClick: () => {}, separator: true },
          { label: '从此提交新建分支...', onClick: () => { setInputDialog({ title: `从 ${shortH} 新建分支`, placeholder: '分支名称', onConfirm: (name) => { createBranch(name, c.hash); setInputDialog(null) } }); setCommitCtx(null) } },
          { label: '新建标签...', onClick: () => { setInputDialog({ title: `在 ${shortH} 新建标签`, placeholder: '标签名称', onConfirm: (name) => { createTag(name, c.hash); setInputDialog(null) } }); setCommitCtx(null) } },
          { label: '', onClick: () => {}, separator: true },
          { label: '与工作区比较', onClick: () => {
            // Show diff of this commit vs working tree for first changed file
            if (commitFiles.length > 0) showCommitFileDiff(c.hash, commitFiles[0])
            setCommitCtx(null)
          }},
        ]
        return <ContextMenu x={commitCtx.x} y={commitCtx.y} items={items} onClose={() => setCommitCtx(null)} />
      })()}

      {/* Commit detail file context menu */}
      {fileCtx && (() => {
        const f = fileCtx.file
        const h = fileCtx.hash
        const items: MenuItem[] = [
          { label: '显示差异', onClick: () => { showCommitFileDiff(h, f); setFileCtx(null) }, separator: false },
          { label: '', onClick: () => {}, separator: true },
          { label: '复制文件路径', onClick: () => { navigator.clipboard.writeText(f.path); setFileCtx(null) } },
          { label: '复制文件名', onClick: () => { navigator.clipboard.writeText(f.path.split('/').pop() || f.path); setFileCtx(null) } },
        ]
        return <ContextMenu x={fileCtx.x} y={fileCtx.y} items={items} onClose={() => setFileCtx(null)} />
      })()}

      {/* Input dialog (new branch / new tag / rename) */}
      {inputDialog && (
        <InputDialog title={inputDialog.title} placeholder={inputDialog.placeholder}
          onConfirm={inputDialog.onConfirm} onCancel={() => setInputDialog(null)} />
      )}

      {/* Reset branch confirmation dialog */}
      {resetDialog && (
        <ConfirmDialog title="重置当前分支" message={`将当前分支重置到 ${resetDialog.shortHash}，此操作可能丢失提交。`} danger
          onConfirm={() => { resetBranch(resetDialog.hash, resetMode); setResetDialog(null); setResetMode('mixed') }}
          onCancel={() => { setResetDialog(null); setResetMode('mixed') }}>
          <div className="flex flex-col gap-1.5 mb-2">
            {(['soft', 'mixed', 'hard'] as const).map(m => (
              <label key={m} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                <input type="radio" name="resetMode" checked={resetMode === m} onChange={() => setResetMode(m)} className="w-3 h-3" />
                <span className="font-mono">{m}</span>
                <span className="text-text-secondary text-[10px]">
                  {m === 'soft' ? '(保留暂存区和工作目录)' : m === 'mixed' ? '(保留工作目录，重置暂存区)' : '(全部重置，丢失更改)'}
                </span>
              </label>
            ))}
          </div>
        </ConfirmDialog>
      )}

      {/* Rename branch dialog */}
      {renameDialog && (
        <InputDialog title={`重命名分支: ${renameDialog.branchName}`} placeholder="新分支名称"
          onConfirm={(newName) => { renameBranch(renameDialog.branchName, newName); setRenameDialog(null) }}
          onCancel={() => setRenameDialog(null)} />
      )}
    </div>
  )
}

// ============ GIT GRAPH (rendered via git-graph-svg library) ============

// ============ BRANCH FOLDER TREE (feat/, release/ grouping) ============

interface BranchNode {
  name: string
  fullName?: string
  branch?: BranchInfo
  children: Map<string, BranchNode>
}

function buildBranchTree(branches: BranchInfo[], stripPrefix?: string): BranchNode {
  const root: BranchNode = { name: '', children: new Map() }
  for (const b of branches) {
    const name = stripPrefix ? b.name.replace(stripPrefix, '') : b.name
    const parts = name.split('/')
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, children: new Map() })
      }
      node = node.children.get(part)!
      if (i === parts.length - 1) {
        node.branch = b
        node.fullName = b.name
      }
    }
  }
  return root
}

function FolderBranchTree({ title, branches, currentBranch, onSwitch, onContext }: {
  title: string; branches: BranchInfo[]; currentBranch: string
  onSwitch: (name: string) => void
  onContext: (e: React.MouseEvent, b: BranchInfo) => void
}) {
  const tree = useMemo(() => buildBranchTree(branches), [branches])
  const [open, setOpen] = useState(true)

  return (
    <div>
      <div className="px-2 py-[3px] flex items-center gap-1 cursor-pointer hover:bg-bg-hover text-text-secondary font-medium"
        onClick={() => setOpen(!open)}>
        <span className="text-[8px]">{open ? '▼' : '▶'}</span>
        <span>{title}</span>
      </div>
      {open && <BranchTreeNodes node={tree} depth={1} currentBranch={currentBranch} onSwitch={onSwitch} onContext={onContext} />}
    </div>
  )
}

function BranchTreeNodes({ node, depth, currentBranch, onSwitch, onContext }: {
  node: BranchNode; depth: number; currentBranch: string
  onSwitch: (name: string) => void
  onContext: (e: React.MouseEvent, b: BranchInfo) => void
}) {
  return (
    <>
      {Array.from(node.children.entries()).map(([key, child]) => {
        if (child.branch) {
          // Leaf node
          const isCurrent = child.branch.name === currentBranch
          return (
            <div key={key}
              className={`pr-2 py-[2px] flex items-center gap-1 cursor-pointer truncate ${isCurrent ? 'bg-bg-active text-white' : 'hover:bg-bg-hover text-text-primary'}`}
              style={{ paddingLeft: depth * 16 + 4 }}
              onClick={() => !isCurrent && onSwitch(child.branch!.name)}
              onContextMenu={e => onContext(e, child.branch!)}>
              {isCurrent && <span className="text-[8px] text-yellow-400">★</span>}
              <span className="truncate">{child.name}</span>
            </div>
          )
        } else {
          // Folder node
          return <FolderNode key={key} node={child} depth={depth} currentBranch={currentBranch} onSwitch={onSwitch} onContext={onContext} />
        }
      })}
    </>
  )
}

function FolderNode({ node, depth, currentBranch, onSwitch, onContext }: {
  node: BranchNode; depth: number; currentBranch: string
  onSwitch: (name: string) => void
  onContext: (e: React.MouseEvent, b: BranchInfo) => void
}) {
  const [open, setOpen] = useState(true)
  const count = countBranches(node)

  return (
    <div>
      <div className="pr-2 py-[2px] flex items-center gap-1 cursor-pointer hover:bg-bg-hover text-text-secondary"
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => setOpen(!open)}>
        <span className="text-[8px]">{open ? '▼' : '▶'}</span>
        <span>{node.name}</span>
        <span className="text-[9px] text-text-secondary ml-auto">{count}</span>
      </div>
      {open && <BranchTreeNodes node={node} depth={depth + 1} currentBranch={currentBranch} onSwitch={onSwitch} onContext={onContext} />}
    </div>
  )
}

function countBranches(node: BranchNode): number {
  let count = node.branch ? 1 : 0
  for (const child of node.children.values()) {
    count += countBranches(child)
  }
  return count
}

function RemoteBranchTree({ branches, onSwitch, onContext }: {
  branches: BranchInfo[]
  onSwitch: (name: string) => void
  onContext: (e: React.MouseEvent, b: BranchInfo) => void
}) {
  const [open, setOpen] = useState(true)

  // Group by remote
  const remoteGroups = new Map<string, BranchInfo[]>()
  for (const b of branches) {
    const remote = b.name.replace('remotes/', '').split('/')[0]
    if (!remoteGroups.has(remote)) remoteGroups.set(remote, [])
    remoteGroups.get(remote)!.push(b)
  }

  return (
    <div>
      <div className="px-2 py-[3px] flex items-center gap-1 cursor-pointer hover:bg-bg-hover text-text-secondary font-medium"
        onClick={() => setOpen(!open)}>
        <span className="text-[8px]">{open ? '▼' : '▶'}</span>
        <span>远程</span>
      </div>
      {open && Array.from(remoteGroups.entries()).map(([remote, brs]) => {
        const tree = buildBranchTree(brs, `remotes/${remote}/`)
        return (
          <RemoteGroupTree key={remote} remote={remote} tree={tree} onSwitch={onSwitch} onContext={onContext} />
        )
      })}
    </div>
  )
}

function RemoteGroupTree({ remote, tree, onSwitch, onContext }: {
  remote: string; tree: BranchNode
  onSwitch: (name: string) => void
  onContext: (e: React.MouseEvent, b: BranchInfo) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <div className="pl-6 pr-2 py-[2px] flex items-center gap-1 cursor-pointer hover:bg-bg-hover text-text-secondary"
        onClick={() => setOpen(!open)}>
        <span className="text-[8px]">{open ? '▼' : '▶'}</span>
        <span>{remote}</span>
      </div>
      {open && <BranchTreeNodes node={tree} depth={2} currentBranch="" onSwitch={onSwitch} onContext={onContext} />}
    </div>
  )
}

// ============ TERMINAL ============

function TerminalPanel() {
  const { repoPath } = useGitStore()
  const [history, setHistory] = useState<{ cmd: string; output: string }[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const run = async () => {
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
        {history.length === 0 && <div className="text-text-secondary">输入 git 命令，如: status, log --oneline, diff</div>}
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
          onKeyDown={e => e.key === 'Enter' && run()}
          className="flex-1 bg-transparent text-text-primary outline-none text-[11px]" placeholder="status" autoFocus />
      </div>
    </div>
  )
}

// ============ HELPERS ============

function statusColor(s: string): string {
  switch (s) {
    case 'A': return 'text-status-added'
    case 'D': return 'text-status-deleted'
    default: return 'text-status-modified'
  }
}
