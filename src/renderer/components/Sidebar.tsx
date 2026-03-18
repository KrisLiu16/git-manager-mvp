import { useGitStore, ViewTab } from '../stores/gitStore'

const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
  { id: 'changes', label: 'Changes', icon: <ChangesIcon /> },
  { id: 'log', label: 'Log', icon: <LogIcon /> },
  { id: 'branches', label: 'Branches', icon: <BranchIcon /> },
  { id: 'stash', label: 'Stash', icon: <StashIcon /> },
  { id: 'remotes', label: 'Remotes', icon: <RemoteIcon /> }
]

export function Sidebar() {
  const { activeTab, setActiveTab, stagedFiles, unstagedFiles, untrackedFiles } = useGitStore()
  const changesCount = stagedFiles.length + unstagedFiles.length + untrackedFiles.length

  return (
    <div className="w-12 bg-bg-secondary border-r border-border flex flex-col items-center py-2 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          title={tab.label}
          className={`
            w-10 h-10 flex flex-col items-center justify-center rounded relative
            transition-colors text-xs
            ${activeTab === tab.id
              ? 'bg-bg-active text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }
          `}
        >
          {tab.icon}
          {tab.id === 'changes' && changesCount > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[9px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
              {changesCount > 99 ? '99+' : changesCount}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function ChangesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

function LogIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}

function BranchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}

function StashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  )
}

function RemoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}
