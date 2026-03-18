import { useGitStore } from '../stores/gitStore'

export function ProjectTabs() {
  const { projects, activeProjectIndex, switchProject, removeProject, setError } = useGitStore()

  const handleAddProject = async () => {
    const path = await window.windowApi.openDirectory()
    if (path) {
      const isRepo = await window.git.isRepo(path)
      if (isRepo) {
        useGitStore.getState().addProject(path)
      } else {
        setError(`"${path}" 不是一个 Git 仓库`)
      }
    }
  }

  if (projects.length === 0) {
    return <div className="h-9 bg-bg-secondary border-b border-border titlebar-drag" style={{ paddingLeft: 80 }} />
  }

  return (
    <div className="flex items-center bg-bg-secondary border-b border-border overflow-hidden titlebar-drag h-9" style={{ paddingLeft: 80 }}>
      <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide titlebar-no-drag">
        {projects.map((project, index) => {
          const isActive = index === activeProjectIndex
          const changesCount = project.stagedFiles.length + project.unstagedFiles.length + project.untrackedFiles.length

          return (
            <div
              key={project.repoPath}
              className={`
                group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-border
                min-w-0 max-w-[200px] flex-shrink-0 relative
                ${isActive
                  ? 'bg-bg-primary text-text-primary'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }
              `}
              onClick={() => switchProject(index)}
            >
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />
              )}
              <span className="truncate text-xs font-medium">{project.name}</span>
              {project.currentBranch && (
                <span className="text-[10px] text-text-secondary truncate flex-shrink-0">
                  {project.currentBranch}
                </span>
              )}
              {changesCount > 0 && (
                <span className="bg-blue-600 text-white text-[9px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 flex-shrink-0">
                  {changesCount > 99 ? '99+' : changesCount}
                </span>
              )}
              {projects.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeProject(index)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary text-[10px] ml-0.5 flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-bg-hover"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button
        onClick={handleAddProject}
        className="px-2 py-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-hover flex-shrink-0 titlebar-no-drag"
        title="打开仓库"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
