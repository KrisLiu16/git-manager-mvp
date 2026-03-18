import { useState, useCallback } from 'react'
import { useGitStore, GitFile } from '../stores/gitStore'

export function CommitPanel() {
  const {
    stagedFiles, unstagedFiles, untrackedFiles,
    selectedFile, selectFileAndShowDiff, commitMessage, setCommitMessage,
    amendMode, setAmendMode,
    stageFile, unstageFile, stageAll, unstageAll, discardFile,
    doCommit, doCommitAndPush, refreshAll,
    doPush, doPull, doFetch
  } = useGitStore()

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: GitFile } | null>(null)
  const closeCtx = useCallback(() => setContextMenu(null), [])

  const allChanges = [...unstagedFiles, ...untrackedFiles]
  const canCommit = commitMessage.trim().length > 0 && stagedFiles.length > 0

  return (
    <div className="flex flex-col h-full select-none" onClick={closeCtx}>
      {/* Header toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-bg-secondary border-b border-border flex-shrink-0">
        <span className="text-xs font-medium text-text-primary mr-auto">提交</span>
        <ToolBtn title="刷新" onClick={refreshAll}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </ToolBtn>
        <ToolBtn title="拉取" onClick={doFetch}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </ToolBtn>
        <ToolBtn title="全部暂存" onClick={stageAll}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
        </ToolBtn>
        <ToolBtn title="全部取消暂存" onClick={unstageAll}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </ToolBtn>
      </div>

      {/* File changes */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Staged */}
        {stagedFiles.length > 0 && (
          <FileSection
            title="已暂存的更改"
            count={stagedFiles.length}
            color="text-status-added"
            files={stagedFiles}
            selectedFile={selectedFile}
            onSelect={selectFileAndShowDiff}
            onContextMenu={(e, f) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }) }}
          />
        )}

        {/* Unstaged changes */}
        {allChanges.length > 0 && (
          <FileSection
            title="更改"
            count={allChanges.length}
            color="text-status-modified"
            files={allChanges}
            selectedFile={selectedFile}
            onSelect={selectFileAndShowDiff}
            onContextMenu={(e, f) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }) }}
          />
        )}

        {stagedFiles.length === 0 && allChanges.length === 0 && (
          <div className="p-4 text-center text-text-secondary text-xs">无更改</div>
        )}
      </div>

      {/* Commit area */}
      <div className="border-t border-border p-2 flex flex-col gap-1.5 flex-shrink-0 bg-bg-primary">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[11px] text-text-secondary cursor-pointer">
            <input type="checkbox" checked={amendMode} onChange={e => setAmendMode(e.target.checked)} className="rounded w-3 h-3" />
            修正(M)
          </label>
        </div>
        <textarea
          value={commitMessage}
          onChange={e => setCommitMessage(e.target.value)}
          placeholder="提交信息"
          className="w-full h-[72px] bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs text-text-primary resize-none focus:outline-none focus:border-border-focus placeholder:text-text-secondary"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canCommit) {
              e.preventDefault()
              doCommit()
            }
          }}
        />
        <div className="flex gap-1.5">
          <button onClick={doCommit} disabled={!canCommit}
            className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/30 disabled:cursor-not-allowed text-white text-[11px] rounded transition-colors">
            提交 (I)
          </button>
          <button onClick={doCommitAndPush} disabled={!canCommit}
            className="flex-1 py-1 bg-bg-tertiary hover:bg-bg-hover border border-border disabled:opacity-30 disabled:cursor-not-allowed text-text-primary text-[11px] rounded transition-colors">
            提交并推送(P)...
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x} y={contextMenu.y} file={contextMenu.file}
          onClose={closeCtx}
          onStage={() => { stageFile(contextMenu.file); closeCtx() }}
          onUnstage={() => { unstageFile(contextMenu.file); closeCtx() }}
          onDiscard={() => { discardFile(contextMenu.file); closeCtx() }}
          onDiff={() => { selectFileAndShowDiff(contextMenu.file); closeCtx() }}
        />
      )}
    </div>
  )
}

function ToolBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title}
      className="w-6 h-6 flex items-center justify-center rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors">
      {children}
    </button>
  )
}

function FileSection({ title, count, color, files, selectedFile, onSelect, onContextMenu }: {
  title: string; count: number; color: string
  files: GitFile[]; selectedFile: GitFile | null
  onSelect: (f: GitFile) => void
  onContextMenu: (e: React.MouseEvent, f: GitFile) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-secondary/50 cursor-pointer hover:bg-bg-hover" onClick={() => setOpen(!open)}>
        <span className="text-[9px] text-text-secondary">{open ? '▼' : '▶'}</span>
        <span className="text-[11px] text-text-primary font-medium">{title}</span>
        <span className={`text-[10px] ${color}`}>{count}</span>
      </div>
      {open && files.map(f => (
        <FileRow key={`${f.path}-${f.staged}`} file={f}
          isSelected={selectedFile?.path === f.path && selectedFile?.staged === f.staged}
          onClick={() => onSelect(f)} onContextMenu={e => onContextMenu(e, f)} />
      ))}
    </div>
  )
}

function FileRow({ file, isSelected, onClick, onContextMenu }: {
  file: GitFile; isSelected: boolean; onClick: () => void; onContextMenu: (e: React.MouseEvent) => void
}) {
  const statusColors: Record<string, string> = {
    added: 'text-status-added', modified: 'text-status-modified', deleted: 'text-status-deleted',
    renamed: 'text-status-modified', conflict: 'text-status-conflict', untracked: 'text-status-untracked'
  }
  const statusLabels: Record<string, string> = {
    added: 'A', modified: 'M', deleted: 'D', renamed: 'R', conflict: 'C', untracked: '?'
  }
  const fileName = file.path.split('/').pop() || file.path
  const dirPath = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) + '/' : ''

  return (
    <div className={`flex items-center gap-1.5 px-3 py-[3px] cursor-pointer text-[11px] ${isSelected ? 'bg-bg-active' : 'hover:bg-bg-hover'}`}
      onClick={onClick} onContextMenu={onContextMenu}>
      <span className="truncate flex-1">
        <span className="text-text-primary">{fileName}</span>
        {dirPath && <span className="text-text-secondary ml-1 text-[10px]">{dirPath}</span>}
      </span>
      <span className={`${statusColors[file.status]} font-mono text-[10px] flex-shrink-0`}>
        {statusLabels[file.status]}
      </span>
    </div>
  )
}

function FileContextMenu({ x, y, file, onClose, onStage, onUnstage, onDiscard, onDiff }: {
  x: number; y: number; file: GitFile; onClose: () => void
  onStage: () => void; onUnstage: () => void; onDiscard: () => void; onDiff: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="context-menu z-50" style={{ left: x, top: y }}>
        <div className="context-menu-item" onClick={onDiff}>显示差异</div>
        <div className="context-menu-separator" />
        {file.staged ? (
          <div className="context-menu-item" onClick={onUnstage}>取消暂存</div>
        ) : (
          <div className="context-menu-item" onClick={onStage}>暂存文件</div>
        )}
        <div className="context-menu-separator" />
        <div className="context-menu-item" onClick={() => { navigator.clipboard.writeText(file.path); onClose() }}>复制文件路径</div>
        <div className="context-menu-item" onClick={() => { navigator.clipboard.writeText(file.path.split('/').pop() || file.path); onClose() }}>复制文件名</div>
        {file.status !== 'untracked' && !file.staged && (
          <>
            <div className="context-menu-separator" />
            <div className="context-menu-item text-status-deleted" onClick={onDiscard}>回滚更改</div>
          </>
        )}
      </div>
    </>
  )
}
