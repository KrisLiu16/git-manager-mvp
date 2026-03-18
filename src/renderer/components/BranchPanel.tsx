import { useEffect, useState } from 'react'
import { useGitStore } from '../stores/gitStore'

export function BranchPanel() {
  const {
    branches, currentBranch, refreshBranches,
    switchBranch, createBranch, deleteBranch, mergeBranch
  } = useGitStore()

  const [showCreate, setShowCreate] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')

  useEffect(() => {
    refreshBranches()
  }, [])

  const localBranches = branches.filter(b => !b.isRemote)
  const remoteBranches = branches.filter(b => b.isRemote)

  const handleCreate = async () => {
    if (newBranchName.trim()) {
      await createBranch(newBranchName.trim())
      setNewBranchName('')
      setShowCreate(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="px-3 py-2 bg-bg-secondary border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium">分支</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-xs text-text-accent hover:text-text-link px-2 py-0.5 rounded hover:bg-bg-hover"
        >
          + 新建分支
        </button>
      </div>

      {showCreate && (
        <div className="px-3 py-2 bg-bg-tertiary border-b border-border flex gap-2">
          <input
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="分支名称..."
            className="flex-1 bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-border-focus"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={!newBranchName.trim()}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs rounded"
          >
            创建
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Local branches */}
        <div className="px-3 py-1.5 bg-bg-secondary border-b border-border text-[10px] text-text-secondary uppercase tracking-wider">
          本地 ({localBranches.length})
        </div>
        {localBranches.map((branch) => (
          <BranchRow
            key={branch.name}
            branch={branch}
            isCurrent={branch.name === currentBranch}
            onSwitch={() => switchBranch(branch.name)}
            onMerge={() => mergeBranch(branch.name)}
            onDelete={() => deleteBranch(branch.name)}
          />
        ))}

        {/* Remote branches */}
        <div className="px-3 py-1.5 bg-bg-secondary border-b border-border text-[10px] text-text-secondary uppercase tracking-wider mt-2">
          远程 ({remoteBranches.length})
        </div>
        {remoteBranches.map((branch) => (
          <BranchRow
            key={branch.name}
            branch={branch}
            isCurrent={false}
            onSwitch={() => switchBranch(branch.name)}
          />
        ))}
      </div>
    </div>
  )
}

function BranchRow({ branch, isCurrent, onSwitch, onMerge, onDelete }: {
  branch: any
  isCurrent: boolean
  onSwitch: () => void
  onMerge?: () => void
  onDelete?: () => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`
        flex items-center justify-between px-3 py-1.5 border-b border-border text-xs cursor-pointer
        ${isCurrent ? 'bg-bg-active' : 'hover:bg-bg-hover'}
      `}
      onClick={onSwitch}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isCurrent && (
          <span className="text-status-added text-[10px]">\u25CF</span>
        )}
        <span className={`truncate ${isCurrent ? 'text-white font-medium' : 'text-text-primary'}`}>
          {branch.name}
        </span>
        <span className="text-[10px] text-text-secondary font-mono flex-shrink-0">
          {branch.commit?.substring(0, 7)}
        </span>
      </div>
      {showActions && !isCurrent && (
        <div className="flex gap-1 flex-shrink-0">
          {onMerge && (
            <button
              onClick={(e) => { e.stopPropagation(); onMerge() }}
              className="text-[10px] text-text-accent hover:text-text-link px-1.5 py-0.5 rounded hover:bg-bg-hover"
              title="合并到当前分支"
            >
              合并
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="text-[10px] text-status-deleted hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-bg-hover"
              title="删除分支"
            >
              删除
            </button>
          )}
        </div>
      )}
    </div>
  )
}
