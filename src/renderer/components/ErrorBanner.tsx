import { useEffect } from 'react'
import { useGitStore } from '../stores/gitStore'

export function ErrorBanner() {
  const { error, setError } = useGitStore()

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  if (!error) return null

  return (
    <div className="bg-red-900/50 border-b border-red-700 px-3 py-1.5 flex items-center justify-between">
      <span className="text-xs text-red-300">{error}</span>
      <button
        onClick={() => setError(null)}
        className="text-red-400 hover:text-red-300 text-xs px-1"
      >
        \u2715
      </button>
    </div>
  )
}
