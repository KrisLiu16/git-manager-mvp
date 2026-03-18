import { useEffect, useRef } from 'react'
import { useGitStore } from './stores/gitStore'
import { Layout } from './components/Layout'
import { WelcomeScreen } from './components/WelcomeScreen'

export default function App() {
  const { projects, addProject, refreshAll, setError } = useGitStore()
  const autoFetchRef = useRef<number | null>(null)

  useEffect(() => {
    window.windowApi.onRepoOpened(async (path: string) => {
      const isRepo = await window.git.isRepo(path)
      if (isRepo) {
        addProject(path)
      } else {
        setError(`"${path}" 不是一个 Git 仓库`)
      }
    })

    window.windowApi.onRepoChanged((_path: string) => {
      refreshAll()
    })

    // Listen for auto-fetch completion
    const { ipcRenderer } = window.electron
    if (ipcRenderer) {
      ipcRenderer.on('auto:fetched', () => {
        refreshAll()
      })
    }
  }, [])

  useEffect(() => {
    if (projects.length > 0) {
      refreshAll()
    }
  }, [projects.length])

  if (projects.length === 0) {
    return <WelcomeScreen />
  }

  return <Layout />
}
