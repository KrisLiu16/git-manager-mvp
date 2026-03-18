import { useGitStore } from '../stores/gitStore'

export function StatusBar() {
  const {
    repoPath, currentBranch, isLoading, lastFetchAt,
    stagedFiles, unstagedFiles, untrackedFiles,
    ahead, behind
  } = useGitStore()

  const total = stagedFiles.length + unstagedFiles.length + untrackedFiles.length
  const fetchTimeStr = lastFetchAt ? formatFetchTime(lastFetchAt) : null

  return (
    <div className="h-6 bg-blue-700 flex items-center justify-between px-3 text-[11px] text-white/90">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <BranchSmallIcon />
          {currentBranch || '无分支'}
          {/* Ahead/behind indicators */}
          {(ahead > 0 || behind > 0) && (
            <span className="flex items-center gap-0.5 ml-0.5 text-[10px]">
              {ahead > 0 && <span title={`领先远程 ${ahead} 个提交`}>↑{ahead}</span>}
              {behind > 0 && <span title={`落后远程 ${behind} 个提交`}>↓{behind}</span>}
            </span>
          )}
        </span>
        {total > 0 && (
          <span>
            {stagedFiles.length > 0 && `${stagedFiles.length} 已暂存`}
            {stagedFiles.length > 0 && unstagedFiles.length > 0 && ' \u00b7 '}
            {unstagedFiles.length > 0 && `${unstagedFiles.length} 已修改`}
            {(stagedFiles.length > 0 || unstagedFiles.length > 0) && untrackedFiles.length > 0 && ' \u00b7 '}
            {untrackedFiles.length > 0 && `${untrackedFiles.length} 未跟踪`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isLoading && <span className="animate-pulse">刷新中...</span>}
        {fetchTimeStr && (
          <span className="opacity-70" title="上次自动拉取时间">
            <FetchSmallIcon /> {fetchTimeStr}
          </span>
        )}
        <span className="truncate max-w-[300px] opacity-70" title={repoPath || ''}>
          {repoPath}
        </span>
      </div>
    </div>
  )
}

function formatFetchTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return '刚刚拉取'
  if (minutes < 60) return `${minutes}分钟前拉取`
  return `${Math.floor(minutes / 60)}小时前拉取`
}

function BranchSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}

function FetchSmallIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
