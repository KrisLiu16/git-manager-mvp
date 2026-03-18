import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { useGitStore, BlameInfo } from '../stores/gitStore'
import { html, Diff2HtmlConfig } from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'

export function DiffView() {
  const { diffContent, selectedFile, diffMode, setDiffMode, getBlame, repoPath } = useGitStore()
  const [blameData, setBlameData] = useState<BlameInfo[]>([])
  const [tooltip, setTooltip] = useState<{ x: number; y: number; info: BlameInfo } | null>(null)
  const diffRef = useRef<HTMLDivElement>(null)

  const diffHtml = useMemo(() => {
    if (!diffContent) return ''
    const config: Diff2HtmlConfig = {
      outputFormat: diffMode === 'side-by-side' ? 'side-by-side' : 'line-by-line',
      drawFileList: false,
      matching: 'lines',
      highlight: true
    }
    return html(diffContent, config)
  }, [diffContent, diffMode])

  // Load blame data when a file is selected
  useEffect(() => {
    if (selectedFile && selectedFile.status !== 'untracked' && repoPath) {
      getBlame(selectedFile.path).then(setBlameData).catch(() => setBlameData([]))
    } else {
      setBlameData([])
    }
  }, [selectedFile?.path, repoPath])

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    if (blameData.length === 0) return
    const target = e.target as HTMLElement
    // Find the line number element
    const lineNumEl = target.closest('.d2h-code-linenumber')
    if (!lineNumEl) {
      setTooltip(null)
      return
    }
    const lineText = lineNumEl.textContent?.trim()
    if (!lineText) return
    const lineNum = parseInt(lineText, 10)
    if (isNaN(lineNum)) return

    const info = blameData.find(b => b.line === lineNum)
    if (info) {
      const rect = lineNumEl.getBoundingClientRect()
      setTooltip({ x: rect.right + 8, y: rect.top, info })
    }
  }, [blameData])

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  if (!diffContent) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary text-sm">
        {selectedFile ? '无差异内容' : '选择文件以查看差异'}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Diff toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border">
        <div className="flex items-center gap-2 text-xs">
          {selectedFile && (
            <>
              <StatusBadge status={selectedFile.status} />
              <span className="text-text-primary">{selectedFile.path}</span>
              <span className="text-text-secondary">
                ({selectedFile.staged ? '已暂存' : '工作区'})
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setDiffMode('unified')}
            className={`px-2 py-0.5 rounded transition-colors ${
              diffMode === 'unified' ? 'bg-bg-active text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            统一视图
          </button>
          <button
            onClick={() => setDiffMode('side-by-side')}
            className={`px-2 py-0.5 rounded transition-colors ${
              diffMode === 'side-by-side' ? 'bg-bg-active text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            并排视图
          </button>
        </div>
      </div>
      {/* Diff content */}
      <div
        ref={diffRef}
        className="flex-1 overflow-auto p-0 relative"
        dangerouslySetInnerHTML={{ __html: diffHtml }}
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
      />
      {/* Blame tooltip */}
      {tooltip && (
        <BlameTooltip x={tooltip.x} y={tooltip.y} info={tooltip.info} />
      )}
    </div>
  )
}

function BlameTooltip({ x, y, info }: { x: number; y: number; info: BlameInfo }) {
  const shortHash = info.hash.substring(0, 7)
  return (
    <div
      className="fixed z-50 bg-bg-tertiary border border-border rounded-md shadow-lg px-3 py-2 max-w-[360px] pointer-events-none"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-text-accent font-mono text-[11px]">{shortHash}</span>
        <span className="text-text-primary text-xs font-medium">{info.author}</span>
      </div>
      <div className="text-text-secondary text-[11px] mb-1">{info.date}</div>
      <div className="text-text-primary text-xs leading-relaxed">{info.summary}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    added: 'bg-status-added',
    modified: 'bg-status-modified',
    deleted: 'bg-status-deleted',
    renamed: 'bg-status-modified',
    conflict: 'bg-status-conflict',
    untracked: 'bg-status-untracked'
  }
  const labels: Record<string, string> = {
    added: '新增',
    modified: '已修改',
    deleted: '已删除',
    renamed: '已重命名',
    conflict: '冲突',
    untracked: '新文件'
  }
  return (
    <span className={`${colors[status]} text-white text-[10px] px-1.5 py-0.5 rounded`}>
      {labels[status] || status}
    </span>
  )
}
