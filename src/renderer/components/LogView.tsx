import { useEffect, useState } from 'react'
import { DiffEditor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useGitStore, CommitInfo } from '../stores/gitStore'

loader.config({ monaco })

interface CommitFileInfo {
  status: string
  path: string
}

export function LogView() {
  const { commits, refreshLog, repoPath, diffMode, setDiffMode } = useGitStore()
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)
  const [commitFiles, setCommitFiles] = useState<CommitFileInfo[]>([])
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [originalContent, setOriginalContent] = useState('')
  const [modifiedContent, setModifiedContent] = useState('')

  useEffect(() => {
    refreshLog()
  }, [])

  const handleSelectCommit = async (commit: CommitInfo) => {
    setSelectedCommit(commit)
    setSelectedFilePath(null)
    setOriginalContent('')
    setModifiedContent('')
    if (!repoPath) return
    try {
      const files = await window.git.commitFiles(repoPath, commit.hash)
      setCommitFiles(files)
    } catch {
      setCommitFiles([])
    }
  }

  const handleSelectFile = async (file: CommitFileInfo) => {
    if (!repoPath || !selectedCommit) return
    setSelectedFilePath(file.path)
    try {
      if (file.status === 'A') {
        setOriginalContent('')
        const content = await window.git.showCommitFile(repoPath, selectedCommit.hash, file.path)
        setModifiedContent(content)
      } else if (file.status === 'D') {
        const content = await window.git.showCommitFile(repoPath, `${selectedCommit.hash}~1`, file.path)
        setOriginalContent(content)
        setModifiedContent('')
      } else {
        const original = await window.git.showCommitFile(repoPath, `${selectedCommit.hash}~1`, file.path)
        const modified = await window.git.showCommitFile(repoPath, selectedCommit.hash, file.path)
        setOriginalContent(original)
        setModifiedContent(modified)
      }
    } catch {
      setOriginalContent('')
      setModifiedContent('')
    }
  }

  const language = selectedFilePath ? detectLanguage(selectedFilePath) : 'plaintext'

  return (
    <div className="flex-1 flex h-full">
      {/* Commit list */}
      <div className="w-[380px] min-w-[280px] border-r border-border flex flex-col">
        <div className="px-3 py-2 bg-bg-secondary border-b border-border text-xs font-medium">
          提交历史 ({commits.length})
        </div>
        <div className="flex-1 overflow-y-auto">
          {commits.map((commit) => (
            <CommitRow
              key={commit.hash}
              commit={commit}
              isSelected={selectedCommit?.hash === commit.hash}
              onClick={() => handleSelectCommit(commit)}
            />
          ))}
          {commits.length === 0 && (
            <div className="p-4 text-center text-text-secondary text-xs">
              暂无提交记录
            </div>
          )}
        </div>
      </div>

      {/* Right panel: commit detail + diff */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedCommit ? (
          <>
            {/* Commit info header */}
            <div className="px-3 py-2 bg-bg-secondary border-b border-border flex-shrink-0">
              <div className="text-xs text-text-primary font-medium mb-1">{selectedCommit.message}</div>
              <div className="flex items-center gap-3 text-[10px] text-text-secondary">
                <span className="text-text-accent font-mono">{selectedCommit.hash.substring(0, 7)}</span>
                <span>{selectedCommit.author_name} &lt;{selectedCommit.author_email}&gt;</span>
                <span>{new Date(selectedCommit.date).toLocaleString()}</span>
              </div>
            </div>

            {/* Changed files list */}
            <div className="border-b border-border bg-bg-tertiary flex-shrink-0">
              <div className="px-3 py-1 text-[10px] text-text-secondary">
                变更文件 ({commitFiles.length})
              </div>
              <div className="max-h-[120px] overflow-y-auto">
                {commitFiles.map((file) => (
                  <div
                    key={file.path}
                    className={`px-3 py-0.5 text-xs cursor-pointer flex items-center gap-2 ${
                      selectedFilePath === file.path ? 'bg-bg-active text-white' : 'hover:bg-bg-hover text-text-primary'
                    }`}
                    onClick={() => handleSelectFile(file)}
                  >
                    <span className={`font-mono text-[10px] w-3 ${fileStatusColor(file.status)}`}>
                      {file.status}
                    </span>
                    <span className="truncate">{file.path}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Diff view */}
            <div className="flex-1 min-h-0 flex flex-col">
              {selectedFilePath ? (
                <>
                  <div className="flex items-center justify-between px-3 py-1 bg-bg-secondary border-b border-border flex-shrink-0">
                    <span className="text-xs text-text-secondary">{selectedFilePath}</span>
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        onClick={() => setDiffMode('unified')}
                        className={`px-2 py-0.5 rounded ${diffMode === 'unified' ? 'bg-bg-active text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
                      >
                        内联
                      </button>
                      <button
                        onClick={() => setDiffMode('side-by-side')}
                        className={`px-2 py-0.5 rounded ${diffMode === 'side-by-side' ? 'bg-bg-active text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
                      >
                        并排
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <DiffEditor
                      original={originalContent}
                      modified={modifiedContent}
                      language={language}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        renderSideBySide: diffMode === 'side-by-side',
                        minimap: { enabled: false },
                        fontSize: 12,
                        lineHeight: 20,
                        scrollBeyondLastLine: false,
                        diffWordWrap: 'on',
                        wordWrap: 'on',
                        automaticLayout: true,
                        glyphMargin: false,
                        lineNumbersMinChars: 3,
                        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-secondary text-xs">
                  选择文件查看差异
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
            选择一个提交以查看变更
          </div>
        )}
      </div>
    </div>
  )
}

function CommitRow({ commit, isSelected, onClick }: {
  commit: CommitInfo; isSelected: boolean; onClick: () => void
}) {
  const shortHash = commit.hash.substring(0, 7)
  const date = new Date(commit.date)
  const timeStr = formatRelativeTime(date)

  const refs = commit.refs
    ? commit.refs.split(',').map((r: string) => r.trim()).filter(Boolean)
    : []

  return (
    <div
      className={`px-3 py-2 border-b border-border cursor-pointer ${
        isSelected ? 'bg-bg-active' : 'hover:bg-bg-hover'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-primary truncate">{commit.message}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
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

function fileStatusColor(status: string): string {
  switch (status) {
    case 'A': return 'text-status-added'
    case 'M': return 'text-status-modified'
    case 'D': return 'text-status-deleted'
    case 'R': return 'text-status-modified'
    default: return 'text-text-secondary'
  }
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', html: 'html', py: 'python',
    go: 'go', rs: 'rust', java: 'java', rb: 'ruby', sh: 'shell',
    yaml: 'yaml', yml: 'yaml', sql: 'sql', c: 'c', cpp: 'cpp',
    swift: 'swift', kt: 'kotlin', vue: 'html',
  }
  return map[ext] || 'plaintext'
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) return date.toLocaleDateString()
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}
