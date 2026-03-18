import { useGitStore } from '../stores/gitStore'

export function StatusBar() {
  const {
    repoPath, currentBranch, isLoading,
    stagedFiles, unstagedFiles, untrackedFiles
  } = useGitStore()

  const total = stagedFiles.length + unstagedFiles.length + untrackedFiles.length

  return (
    <div className="h-6 bg-blue-700 flex items-center justify-between px-3 text-[11px] text-white/90">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <BranchSmallIcon />
          {currentBranch || 'No branch'}
        </span>
        {total > 0 && (
          <span>
            {stagedFiles.length > 0 && `${stagedFiles.length} staged`}
            {stagedFiles.length > 0 && unstagedFiles.length > 0 && ' \u00b7 '}
            {unstagedFiles.length > 0 && `${unstagedFiles.length} modified`}
            {(stagedFiles.length > 0 || unstagedFiles.length > 0) && untrackedFiles.length > 0 && ' \u00b7 '}
            {untrackedFiles.length > 0 && `${untrackedFiles.length} untracked`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isLoading && <span className="animate-pulse">Refreshing...</span>}
        <span className="truncate max-w-[300px] opacity-70" title={repoPath || ''}>
          {repoPath}
        </span>
      </div>
    </div>
  )
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
