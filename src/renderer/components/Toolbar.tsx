import { useGitStore } from '../stores/gitStore'

export function Toolbar() {
  const { doPush, doPull, doFetch, refreshAll, isLoading } = useGitStore()

  return (
    <div className="titlebar-no-drag flex items-center gap-1 text-xs">
      <ToolbarButton onClick={doFetch} disabled={isLoading} title="拉取信息">
        <FetchIcon />
        <span>拉取信息</span>
      </ToolbarButton>
      <ToolbarButton onClick={doPull} disabled={isLoading} title="拉取">
        <PullIcon />
        <span>拉取</span>
      </ToolbarButton>
      <ToolbarButton onClick={doPush} disabled={isLoading} title="推送">
        <PushIcon />
        <span>推送</span>
      </ToolbarButton>
      <div className="w-px h-4 bg-border mx-1" />
      <ToolbarButton onClick={refreshAll} disabled={isLoading} title="刷新">
        <RefreshIcon />
        <span>刷新</span>
      </ToolbarButton>
    </div>
  )
}

function ToolbarButton({ children, onClick, disabled, title }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1 px-2 py-1 rounded hover:bg-bg-hover disabled:opacity-40 transition-colors"
    >
      {children}
    </button>
  )
}

function FetchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function PullIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  )
}

function PushIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      <polyline points="16 16 12 12 8 16" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}
