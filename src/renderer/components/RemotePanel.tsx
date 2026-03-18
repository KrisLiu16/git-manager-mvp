import { useEffect } from 'react'
import { useGitStore } from '../stores/gitStore'

export function RemotePanel() {
  const { remotes, refreshRemotes } = useGitStore()

  useEffect(() => {
    refreshRemotes()
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="px-3 py-2 bg-bg-secondary border-b border-border">
        <span className="text-xs font-medium">Remotes ({remotes.length})</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {remotes.map((remote: any) => (
          <div key={remote.name} className="px-3 py-3 border-b border-border">
            <div className="text-xs font-medium text-text-primary mb-2">{remote.name}</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-text-secondary w-10">Fetch:</span>
                <span className="text-text-accent font-mono truncate">{remote.refs?.fetch}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-text-secondary w-10">Push:</span>
                <span className="text-text-accent font-mono truncate">{remote.refs?.push}</span>
              </div>
            </div>
          </div>
        ))}
        {remotes.length === 0 && (
          <div className="p-4 text-center text-text-secondary text-xs">
            No remotes configured
          </div>
        )}
      </div>
    </div>
  )
}
