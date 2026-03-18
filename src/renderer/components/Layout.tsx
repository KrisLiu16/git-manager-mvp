import { useState, useCallback, useRef } from 'react'
import { ProjectTabs } from './ProjectTabs'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { FileTree } from './FileTree'
import { DiffView } from './DiffView'
import { CommitPanel } from './CommitPanel'
import { BottomPanel } from './BottomPanel'
import { StatusBar } from './StatusBar'
import { ErrorBanner } from './ErrorBanner'

export function Layout() {
  const [bottomPanelHeight, setBottomPanelHeight] = useState(280)
  const [bottomCollapsed, setBottomCollapsed] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(320)
  const isDraggingBottom = useRef(false)
  const isDraggingLeft = useRef(false)

  const handleBottomDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingBottom.current = true
    const startY = e.clientY
    const startH = bottomPanelHeight

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingBottom.current) return
      const delta = startY - ev.clientY
      const newH = Math.max(120, Math.min(600, startH + delta))
      setBottomPanelHeight(newH)
    }
    const onUp = () => {
      isDraggingBottom.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [bottomPanelHeight])

  const handleLeftDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingLeft.current = true
    const startX = e.clientX
    const startW = leftPanelWidth

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingLeft.current) return
      const delta = ev.clientX - startX
      const newW = Math.max(220, Math.min(500, startW + delta))
      setLeftPanelWidth(newW)
    }
    const onUp = () => {
      isDraggingLeft.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [leftPanelWidth])

  return (
    <div className="h-full flex flex-col">
      {/* Title bar */}
      <div className="h-10 titlebar-drag bg-bg-secondary border-b border-border flex items-center px-20">
        <Toolbar />
      </div>
      {/* Project tabs */}
      <ProjectTabs />
      <ErrorBanner />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        {/* Left panel: changes + commit */}
        <div className="flex flex-col border-r border-border" style={{ width: leftPanelWidth }}>
          <div className="flex-1 overflow-hidden flex flex-col">
            <FileTree />
          </div>
          <CommitPanel />
        </div>

        {/* Left panel resize handle */}
        <div
          className="w-[3px] cursor-col-resize hover:bg-border-focus active:bg-border-focus flex-shrink-0 transition-colors"
          onMouseDown={handleLeftDragStart}
        />

        {/* Right area: diff + bottom panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Diff view */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <DiffView />
          </div>

          {/* Bottom panel resize handle */}
          {!bottomCollapsed && (
            <div
              className="h-[3px] cursor-row-resize hover:bg-border-focus active:bg-border-focus flex-shrink-0 transition-colors"
              onMouseDown={handleBottomDragStart}
            />
          )}

          {/* Bottom panel: log + branches */}
          <BottomPanel
            height={bottomCollapsed ? 28 : bottomPanelHeight}
            collapsed={bottomCollapsed}
            onToggle={() => setBottomCollapsed(!bottomCollapsed)}
          />
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
