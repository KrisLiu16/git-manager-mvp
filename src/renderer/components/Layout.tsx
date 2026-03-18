import { useGitStore } from '../stores/gitStore'
import { ProjectTabs } from './ProjectTabs'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { FileTree } from './FileTree'
import { DiffView } from './DiffView'
import { CommitPanel } from './CommitPanel'
import { LogView } from './LogView'
import { BranchPanel } from './BranchPanel'
import { StashPanel } from './StashPanel'
import { RemotePanel } from './RemotePanel'
import { StatusBar } from './StatusBar'
import { ErrorBanner } from './ErrorBanner'

export function Layout() {
  const { activeTab } = useGitStore()

  const renderMainPanel = () => {
    switch (activeTab) {
      case 'changes':
        return (
          <div className="flex-1 flex h-full">
            <div className="w-[320px] min-w-[250px] flex flex-col border-r border-border">
              <FileTree />
              <CommitPanel />
            </div>
            <div className="flex-1 min-w-0">
              <DiffView />
            </div>
          </div>
        )
      case 'log':
        return <LogView />
      case 'branches':
        return <BranchPanel />
      case 'stash':
        return <StashPanel />
      case 'remotes':
        return <RemotePanel />
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Title bar with toolbar */}
      <div className="h-10 titlebar-drag bg-bg-secondary border-b border-border flex items-center px-20">
        <Toolbar />
      </div>
      {/* Project tabs */}
      <ProjectTabs />
      <ErrorBanner />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex overflow-hidden">
          {renderMainPanel()}
        </div>
      </div>
      <StatusBar />
    </div>
  )
}
