import { useEffect } from 'react'
import { useGitStore } from './stores/gitStore'
import { Layout } from './components/Layout'
import { WelcomeScreen } from './components/WelcomeScreen'

export default function App() {
  const { repoPath, setRepoPath, refreshAll, setError } = useGitStore()

  useEffect(() => {
    window.windowApi.onRepoOpened(async (path: string) => {
      const isRepo = await window.git.isRepo(path)
      if (isRepo) {
        setRepoPath(path)
      } else {
        setError(`"${path}" is not a git repository`)
      }
    })

    window.windowApi.onRepoChanged(() => {
      refreshAll()
    })
  }, [])

  useEffect(() => {
    if (repoPath) {
      refreshAll()
    }
  }, [repoPath])

  if (!repoPath) {
    return <WelcomeScreen />
  }

  return <Layout />
}
