import { useMemo } from 'react'
import { useGitStore } from '../stores/gitStore'
import { html, Diff2HtmlConfig } from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'

export function DiffView() {
  const { diffContent, selectedFile, diffMode, setDiffMode } = useGitStore()

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

  if (!diffContent) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary text-sm">
        {selectedFile ? 'No diff available' : 'Select a file to view diff'}
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
                ({selectedFile.staged ? 'staged' : 'working tree'})
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
            Unified
          </button>
          <button
            onClick={() => setDiffMode('side-by-side')}
            className={`px-2 py-0.5 rounded transition-colors ${
              diffMode === 'side-by-side' ? 'bg-bg-active text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            Side by Side
          </button>
        </div>
      </div>
      {/* Diff content */}
      <div
        className="flex-1 overflow-auto p-0"
        dangerouslySetInnerHTML={{ __html: diffHtml }}
      />
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
    added: 'Added',
    modified: 'Modified',
    deleted: 'Deleted',
    renamed: 'Renamed',
    conflict: 'Conflict',
    untracked: 'New'
  }
  return (
    <span className={`${colors[status]} text-white text-[10px] px-1.5 py-0.5 rounded`}>
      {labels[status] || status}
    </span>
  )
}
