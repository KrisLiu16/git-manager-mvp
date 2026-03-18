import { useState, useCallback, useRef, useEffect } from 'react'
import { ProjectTabs } from './ProjectTabs'
import { CommitPanel } from './CommitPanel'
import { BottomPanel } from './BottomPanel'
import { DiffView } from './DiffView'
import { StatusBar } from './StatusBar'
import { ErrorBanner } from './ErrorBanner'
import { useGitStore } from '../stores/gitStore'

export function Layout() {
  const { doPush, stageAll, refreshAll, doCommitAndPush } = useGitStore()

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      const shift = e.shiftKey

      // Cmd+K: focus commit message textarea
      if (meta && !shift && e.key === 'k') {
        e.preventDefault()
        const ta = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="提交信息"]')
        ta?.focus()
        return
      }
      // Cmd+Shift+K: push
      if (meta && shift && e.key === 'K') {
        e.preventDefault()
        doPush()
        return
      }
      // Cmd+Shift+A: stage all
      if (meta && shift && e.key === 'A') {
        // Only if not in a text input
        if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
        e.preventDefault()
        stageAll()
        return
      }
      // Cmd+Shift+Enter: commit and push
      if (meta && shift && e.key === 'Enter') {
        e.preventDefault()
        doCommitAndPush()
        return
      }
      // F5 or Cmd+R: refresh all (Cmd+R is already handled by Electron reload, so use F5)
      if (e.key === 'F5') {
        e.preventDefault()
        refreshAll()
        return
      }
      // Cmd+T: open project (trigger directory dialog)
      if (meta && !shift && e.key === 't') {
        e.preventDefault()
        window.windowApi.openDirectory().then(path => {
          if (path) useGitStore.getState().addProject(path)
        })
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doPush, stageAll, refreshAll, doCommitAndPush])
  const [bottomHeight, setBottomHeight] = useState(300)
  const [bottomCollapsed, setBottomCollapsed] = useState(false)
  const [leftWidth, setLeftWidth] = useState(350)
  const dragging = useRef<'left' | 'bottom' | null>(null)

  const handleLeftDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = leftWidth
    const onMove = (ev: MouseEvent) => {
      setLeftWidth(Math.max(240, Math.min(550, startW + ev.clientX - startX)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [leftWidth])

  const handleBottomDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = bottomHeight
    const onMove = (ev: MouseEvent) => {
      setBottomHeight(Math.max(100, Math.min(600, startH + startY - ev.clientY)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [bottomHeight])

  return (
    <div className="h-full flex flex-col">
      {/* Project tabs (top bar) */}
      <ProjectTabs />
      <ErrorBanner />

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: commit */}
        <div className="flex flex-col bg-bg-primary" style={{ width: leftWidth }}>
          <CommitPanel />
        </div>

        {/* Resize handle */}
        <div className="w-[3px] cursor-col-resize hover:bg-border-focus active:bg-border-focus flex-shrink-0" onMouseDown={handleLeftDrag} />

        {/* Right area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Diff / main editor area */}
          <div className="flex-1 min-h-0">
            <DiffView />
          </div>

          {/* Bottom resize handle */}
          {!bottomCollapsed && (
            <div className="h-[3px] cursor-row-resize hover:bg-border-focus active:bg-border-focus flex-shrink-0" onMouseDown={handleBottomDrag} />
          )}

          {/* Bottom panel: Git log + terminal */}
          <BottomPanel
            height={bottomCollapsed ? 28 : bottomHeight}
            collapsed={bottomCollapsed}
            onToggle={() => setBottomCollapsed(!bottomCollapsed)}
          />
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
