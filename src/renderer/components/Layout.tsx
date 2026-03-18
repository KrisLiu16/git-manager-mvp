import { useState, useCallback, useRef } from 'react'
import { ProjectTabs } from './ProjectTabs'
import { CommitPanel } from './CommitPanel'
import { BottomPanel } from './BottomPanel'
import { DiffView } from './DiffView'
import { StatusBar } from './StatusBar'
import { ErrorBanner } from './ErrorBanner'

export function Layout() {
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
