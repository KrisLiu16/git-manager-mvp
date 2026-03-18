export function Sidebar() {
  return (
    <div className="w-12 bg-bg-secondary border-r border-border flex flex-col items-center py-2 gap-1">
      <SidebarIcon title="提交" active>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </SidebarIcon>
    </div>
  )
}

function SidebarIcon({ children, title, active }: {
  children: React.ReactNode
  title: string
  active?: boolean
}) {
  return (
    <div
      title={title}
      className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
        active ? 'bg-bg-active text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
      }`}
    >
      {children}
    </div>
  )
}
