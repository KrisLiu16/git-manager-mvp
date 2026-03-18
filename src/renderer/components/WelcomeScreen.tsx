import { useGitStore } from '../stores/gitStore'

export function WelcomeScreen() {
  const { addProject, setError } = useGitStore()

  const handleOpen = async () => {
    const path = await window.windowApi.openDirectory()
    if (path) {
      const isRepo = await window.git.isRepo(path)
      if (isRepo) {
        addProject(path)
      } else {
        setError(`"${path}" 不是一个 Git 仓库`)
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 titlebar-drag bg-bg-secondary border-b border-border flex items-center px-20">
        <span className="text-text-secondary text-xs">Git Manager</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 opacity-20">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <circle cx="12" cy="12" r="4"/>
              <line x1="1.05" y1="12" x2="7" y2="12"/>
              <line x1="17.01" y1="12" x2="22.96" y2="12"/>
            </svg>
          </div>
          <h1 className="text-xl font-light text-text-primary mb-2">Git Manager</h1>
          <p className="text-text-secondary mb-8 text-sm">打开一个 Git 仓库开始使用</p>
          <button
            onClick={handleOpen}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            打开仓库
          </button>
          <p className="text-text-secondary mt-4 text-xs">
            或使用 文件 &rarr; 打开仓库 (Cmd+O)
          </p>
        </div>
      </div>
    </div>
  )
}
