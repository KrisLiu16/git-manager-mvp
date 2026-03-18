import { useState, useCallback } from 'react'
import { useGitStore, GitFile } from '../stores/gitStore'

export function FileTree() {
  const {
    stagedFiles, unstagedFiles, untrackedFiles,
    selectedFile, selectFileAndShowDiff,
    stageFile, unstageFile, stageAll, unstageAll, discardFile
  } = useGitStore()

  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; file: GitFile
  } | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, file: GitFile) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }, [])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  return (
    <div className="flex-1 overflow-y-auto select-none" onClick={closeContextMenu}>
      {/* Staged Files */}
      <FileGroup
        title="Staged Changes"
        files={stagedFiles}
        badge={stagedFiles.length}
        badgeColor="bg-status-added"
        selectedFile={selectedFile}
        onSelect={selectFileAndShowDiff}
        onContextMenu={handleContextMenu}
        action={{ label: 'Unstage All', onClick: unstageAll }}
      />

      {/* Unstaged Files */}
      <FileGroup
        title="Changes"
        files={unstagedFiles}
        badge={unstagedFiles.length}
        badgeColor="bg-status-modified"
        selectedFile={selectedFile}
        onSelect={selectFileAndShowDiff}
        onContextMenu={handleContextMenu}
        action={{ label: 'Stage All', onClick: stageAll }}
      />

      {/* Untracked Files */}
      <FileGroup
        title="Untracked Files"
        files={untrackedFiles}
        badge={untrackedFiles.length}
        badgeColor="bg-status-untracked"
        selectedFile={selectedFile}
        onSelect={selectFileAndShowDiff}
        onContextMenu={handleContextMenu}
        action={{ label: 'Stage All', onClick: stageAll }}
      />

      {stagedFiles.length === 0 && unstagedFiles.length === 0 && untrackedFiles.length === 0 && (
        <div className="p-4 text-center text-text-secondary text-xs">
          No changes detected
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={closeContextMenu}
          onStage={() => { stageFile(contextMenu.file); closeContextMenu() }}
          onUnstage={() => { unstageFile(contextMenu.file); closeContextMenu() }}
          onDiscard={() => { discardFile(contextMenu.file); closeContextMenu() }}
        />
      )}
    </div>
  )
}

function FileGroup({
  title, files, badge, badgeColor, selectedFile, onSelect, onContextMenu, action
}: {
  title: string
  files: GitFile[]
  badge: number
  badgeColor: string
  selectedFile: GitFile | null
  onSelect: (file: GitFile) => void
  onContextMenu: (e: React.MouseEvent, file: GitFile) => void
  action: { label: string; onClick: () => void }
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (files.length === 0) return null

  return (
    <div>
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border cursor-pointer hover:bg-bg-hover"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px]">{collapsed ? '\u25B6' : '\u25BC'}</span>
          <span className="text-xs font-medium">{title}</span>
          <span className={`${badgeColor} text-white text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1`}>
            {badge}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); action.onClick() }}
          className="text-[10px] text-text-accent hover:text-text-link px-1.5 py-0.5 rounded hover:bg-bg-hover"
        >
          {action.label}
        </button>
      </div>
      {!collapsed && (
        <div>
          {files.map((file) => (
            <FileItem
              key={`${file.path}-${file.staged}`}
              file={file}
              isSelected={selectedFile?.path === file.path && selectedFile?.staged === file.staged}
              onClick={() => onSelect(file)}
              onContextMenu={(e) => onContextMenu(e, file)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FileItem({
  file, isSelected, onClick, onContextMenu
}: {
  file: GitFile
  isSelected: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const statusColors: Record<string, string> = {
    added: 'text-status-added',
    modified: 'text-status-modified',
    deleted: 'text-status-deleted',
    renamed: 'text-status-modified',
    conflict: 'text-status-conflict',
    untracked: 'text-status-untracked'
  }

  const statusLabels: Record<string, string> = {
    added: 'A',
    modified: 'M',
    deleted: 'D',
    renamed: 'R',
    conflict: 'C',
    untracked: 'U'
  }

  const fileName = file.path.split('/').pop() || file.path
  const dirPath = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : ''

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1 cursor-pointer text-xs
        ${isSelected ? 'bg-bg-active' : 'hover:bg-bg-hover'}
      `}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <span className={`${statusColors[file.status]} font-mono text-[10px] w-3 text-center flex-shrink-0`}>
        {statusLabels[file.status]}
      </span>
      <span className="truncate flex-1">
        <span className="text-text-primary">{fileName}</span>
        {dirPath && <span className="text-text-secondary ml-1">{dirPath}</span>}
      </span>
    </div>
  )
}

function ContextMenu({
  x, y, file, onClose, onStage, onUnstage, onDiscard
}: {
  x: number; y: number; file: GitFile
  onClose: () => void
  onStage: () => void
  onUnstage: () => void
  onDiscard: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        className="context-menu z-50"
        style={{ left: x, top: y }}
      >
        {file.staged ? (
          <div className="context-menu-item" onClick={onUnstage}>Unstage</div>
        ) : (
          <div className="context-menu-item" onClick={onStage}>Stage</div>
        )}
        {file.status !== 'untracked' && !file.staged && (
          <>
            <div className="context-menu-separator" />
            <div className="context-menu-item text-status-deleted" onClick={onDiscard}>
              Discard Changes
            </div>
          </>
        )}
      </div>
    </>
  )
}
