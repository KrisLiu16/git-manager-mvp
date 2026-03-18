import { useEffect, useState } from 'react'
import { useGitStore } from '../stores/gitStore'

export function StashPanel() {
  const { stashes, refreshStashes, saveStash, popStash, applyStash, dropStash } = useGitStore()
  const [showSave, setShowSave] = useState(false)
  const [stashMessage, setStashMessage] = useState('')

  useEffect(() => {
    refreshStashes()
  }, [])

  const handleSave = async () => {
    await saveStash(stashMessage || undefined)
    setStashMessage('')
    setShowSave(false)
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="px-3 py-2 bg-bg-secondary border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium">暂存 ({stashes.length})</span>
        <button
          onClick={() => setShowSave(!showSave)}
          className="text-xs text-text-accent hover:text-text-link px-2 py-0.5 rounded hover:bg-bg-hover"
        >
          + 暂存变更
        </button>
      </div>

      {showSave && (
        <div className="px-3 py-2 bg-bg-tertiary border-b border-border flex gap-2">
          <input
            value={stashMessage}
            onChange={(e) => setStashMessage(e.target.value)}
            placeholder="暂存信息（可选）..."
            className="flex-1 bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-border-focus"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
          >
            保存
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {stashes.map((stash) => (
          <StashRow
            key={stash.hash}
            stash={stash}
            onPop={() => popStash(stash.index)}
            onApply={() => applyStash(stash.index)}
            onDrop={() => dropStash(stash.index)}
          />
        ))}
        {stashes.length === 0 && (
          <div className="p-4 text-center text-text-secondary text-xs">
            暂无暂存
          </div>
        )}
      </div>
    </div>
  )
}

function StashRow({ stash, onPop, onApply, onDrop }: {
  stash: any
  onPop: () => void
  onApply: () => void
  onDrop: () => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className="px-3 py-2 border-b border-border hover:bg-bg-hover"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs text-text-primary truncate">{stash.message}</div>
          <div className="text-[10px] text-text-secondary mt-0.5">
            stash@{'{' + stash.index + '}'} &middot; {stash.hash?.substring(0, 7)}
          </div>
        </div>
        {showActions && (
          <div className="flex gap-1 flex-shrink-0 ml-2">
            <button
              onClick={onApply}
              className="text-[10px] text-text-accent hover:text-text-link px-1.5 py-0.5 rounded hover:bg-bg-hover"
            >
              应用
            </button>
            <button
              onClick={onPop}
              className="text-[10px] text-status-added hover:text-green-400 px-1.5 py-0.5 rounded hover:bg-bg-hover"
            >
              弹出
            </button>
            <button
              onClick={onDrop}
              className="text-[10px] text-status-deleted hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-bg-hover"
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
