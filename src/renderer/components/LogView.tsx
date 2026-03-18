import { useEffect, useMemo } from 'react'
import { useGitStore } from '../stores/gitStore'
import { html as diff2html, Diff2HtmlConfig } from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'

export function LogView() {
  const { commits, refreshLog, showCommitDiff, diffContent, diffMode, setDiffMode } = useGitStore()

  useEffect(() => {
    refreshLog()
  }, [])

  return (
    <div className="flex-1 flex h-full">
      {/* Commit list */}
      <div className="w-[480px] min-w-[350px] border-r border-border flex flex-col">
        <div className="px-3 py-2 bg-bg-secondary border-b border-border text-xs font-medium">
          提交历史 ({commits.length})
        </div>
        <div className="flex-1 overflow-y-auto">
          {commits.map((commit) => (
            <CommitRow
              key={commit.hash}
              commit={commit}
              onClick={() => showCommitDiff(commit.hash)}
            />
          ))}
          {commits.length === 0 && (
            <div className="p-4 text-center text-text-secondary text-xs">
              暂无提交记录
            </div>
          )}
        </div>
      </div>

      {/* Diff panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {diffContent ? (
          <DiffPanel diffContent={diffContent} diffMode={diffMode} setDiffMode={setDiffMode} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
            选择一个提交以查看变更
          </div>
        )}
      </div>
    </div>
  )
}

function CommitRow({ commit, onClick }: { commit: any; onClick: () => void }) {
  const shortHash = commit.hash.substring(0, 7)
  const date = new Date(commit.date)
  const timeStr = formatRelativeTime(date)

  const refs = commit.refs
    ? commit.refs.split(',').map((r: string) => r.trim()).filter(Boolean)
    : []

  return (
    <div
      className="px-3 py-2 border-b border-border cursor-pointer hover:bg-bg-hover"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-primary truncate">
            {commit.message}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-text-accent font-mono">{shortHash}</span>
            {refs.map((ref: string, i: number) => (
              <span key={i} className="text-[10px] bg-bg-tertiary text-text-accent px-1.5 py-0.5 rounded">
                {ref}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] text-text-secondary">{commit.author_name}</div>
          <div className="text-[10px] text-text-secondary">{timeStr}</div>
        </div>
      </div>
    </div>
  )
}

function DiffPanel({ diffContent, diffMode, setDiffMode }: {
  diffContent: string
  diffMode: string
  setDiffMode: (mode: any) => void
}) {
  const diffHtml = useMemo(() => {
    const config: Diff2HtmlConfig = {
      outputFormat: diffMode === 'side-by-side' ? 'side-by-side' : 'line-by-line',
      drawFileList: true,
      matching: 'lines'
    }
    return diff2html(diffContent, config)
  }, [diffContent, diffMode])

  return (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border">
        <span className="text-xs text-text-secondary">提交差异</span>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setDiffMode('unified')}
            className={`px-2 py-0.5 rounded ${diffMode === 'unified' ? 'bg-bg-active text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
          >
            统一视图
          </button>
          <button
            onClick={() => setDiffMode('side-by-side')}
            className={`px-2 py-0.5 rounded ${diffMode === 'side-by-side' ? 'bg-bg-active text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
          >
            并排视图
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto" dangerouslySetInnerHTML={{ __html: diffHtml }} />
    </>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) {
    return date.toLocaleDateString()
  } else if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}
