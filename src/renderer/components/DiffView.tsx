import { useState, useEffect, useMemo } from 'react'
import { DiffEditor, Editor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useGitStore, BlameInfo } from '../stores/gitStore'

loader.config({ monaco })

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', scss: 'scss', less: 'less',
    html: 'html', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    py: 'python', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin',
    rb: 'ruby', php: 'php', sh: 'shell', bash: 'shell', zsh: 'shell',
    sql: 'sql', graphql: 'graphql', proto: 'protobuf',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp',
    swift: 'swift', dart: 'dart', vue: 'html', dockerfile: 'dockerfile',
  }
  return map[ext] || 'plaintext'
}

interface ParsedHunk {
  header: string
  content: string
  startLine: number
  lineCount: number
  fullPatch: string // complete patch text including file header + this hunk
}

function parseDiffIntoHunks(diffText: string, filePath: string): ParsedHunk[] {
  if (!diffText.trim()) return []
  const hunks: ParsedHunk[] = []

  // Find the file header (everything before the first @@ line)
  const lines = diffText.split('\n')
  let fileHeaderEnd = 0
  let fileHeader = ''
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('@@')) {
      fileHeaderEnd = i
      fileHeader = lines.slice(0, i).join('\n') + '\n'
      break
    }
  }
  if (!fileHeader) return []

  // Parse hunks
  let currentHunkStart = fileHeaderEnd
  for (let i = fileHeaderEnd; i < lines.length; i++) {
    if (i > fileHeaderEnd && lines[i].startsWith('@@')) {
      // End of previous hunk
      const hunkLines = lines.slice(currentHunkStart, i)
      const header = hunkLines[0]
      const match = header.match(/@@ -(\d+)/)
      hunks.push({
        header,
        content: hunkLines.slice(1).join('\n'),
        startLine: match ? parseInt(match[1], 10) : 0,
        lineCount: hunkLines.length - 1,
        fullPatch: fileHeader + hunkLines.join('\n') + '\n'
      })
      currentHunkStart = i
    }
  }
  // Last hunk
  if (currentHunkStart < lines.length) {
    const hunkLines = lines.slice(currentHunkStart).filter((_, idx, arr) => idx < arr.length - 1 || arr[idx] !== '')
    if (hunkLines.length > 0 && hunkLines[0].startsWith('@@')) {
      const header = hunkLines[0]
      const match = header.match(/@@ -(\d+)/)
      hunks.push({
        header,
        content: hunkLines.slice(1).join('\n'),
        startLine: match ? parseInt(match[1], 10) : 0,
        lineCount: hunkLines.length - 1,
        fullPatch: fileHeader + hunkLines.join('\n') + '\n'
      })
    }
  }

  return hunks
}

export function DiffView() {
  const {
    selectedFile, repoPath, diffMode, setDiffMode, setSelectedFile,
    commitDiffOriginal, commitDiffModified, commitDiffPath, commitDiffHash, clearCommitDiff,
    fileHistoryPath, fileHistoryCommits, closeFileHistory, showCommitFileDiff,
    blameFilePath, blameData, blameFileContent, closeBlameView,
    refreshStatus
  } = useGitStore()

  const [originalContent, setOriginalContent] = useState('')
  const [modifiedContent, setModifiedContent] = useState('')
  const [hunks, setHunks] = useState<ParsedHunk[]>([])
  const [hunkLoading, setHunkLoading] = useState(false)

  const isCommitDiff = !!commitDiffPath
  const displayPath = isCommitDiff ? commitDiffPath : selectedFile?.path
  const hasContent = isCommitDiff || !!selectedFile

  // Close diff: clear both commit diff and selected file
  const closeDiff = () => {
    if (isCommitDiff) clearCommitDiff()
    else setSelectedFile(null)
  }

  useEffect(() => {
    if (isCommitDiff) return
    if (!selectedFile || !repoPath) {
      setOriginalContent('')
      setModifiedContent('')
      return
    }
    const load = async () => {
      try {
        if (selectedFile.status === 'untracked') {
          setOriginalContent('')
          setModifiedContent(await window.git.showFile(repoPath, selectedFile.path))
        } else if (selectedFile.status === 'added') {
          setOriginalContent('')
          setModifiedContent(selectedFile.staged
            ? await window.git.showOriginal(repoPath, selectedFile.path, ':0')
            : await window.git.showFile(repoPath, selectedFile.path))
        } else if (selectedFile.status === 'deleted') {
          setOriginalContent(await window.git.showOriginal(repoPath, selectedFile.path))
          setModifiedContent('')
        } else {
          setOriginalContent(await window.git.showOriginal(repoPath, selectedFile.path))
          setModifiedContent(selectedFile.staged
            ? await window.git.showOriginal(repoPath, selectedFile.path, ':0')
            : await window.git.showFile(repoPath, selectedFile.path))
        }
      } catch {
        setOriginalContent('')
        setModifiedContent('')
      }
    }
    load()
  }, [selectedFile?.path, selectedFile?.staged, selectedFile?.status, repoPath, isCommitDiff])

  // Load hunks for partial staging
  const canPartialStage = !isCommitDiff && selectedFile && selectedFile.status !== 'untracked' && selectedFile.status !== 'added'

  useEffect(() => {
    if (!canPartialStage || !repoPath || !selectedFile) {
      setHunks([])
      return
    }
    const loadHunks = async () => {
      try {
        const diff = await window.git.diffHunks(repoPath, selectedFile.path, selectedFile.staged)
        setHunks(parseDiffIntoHunks(diff, selectedFile.path))
      } catch { setHunks([]) }
    }
    loadHunks()
  }, [selectedFile?.path, selectedFile?.staged, repoPath, isCommitDiff])

  const stageHunk = async (hunk: ParsedHunk) => {
    if (!repoPath || !selectedFile) return
    setHunkLoading(true)
    try {
      await window.git.applyPatch(repoPath, hunk.fullPatch, false)
      await refreshStatus()
      // Reload hunks
      const diff = await window.git.diffHunks(repoPath, selectedFile.path, selectedFile.staged)
      setHunks(parseDiffIntoHunks(diff, selectedFile.path))
    } catch { /* ignore */ }
    setHunkLoading(false)
  }

  const unstageHunk = async (hunk: ParsedHunk) => {
    if (!repoPath || !selectedFile) return
    setHunkLoading(true)
    try {
      await window.git.applyPatch(repoPath, hunk.fullPatch, true)
      await refreshStatus()
      const diff = await window.git.diffHunks(repoPath, selectedFile.path, selectedFile.staged)
      setHunks(parseDiffIntoHunks(diff, selectedFile.path))
    } catch { /* ignore */ }
    setHunkLoading(false)
  }

  const origDisplay = isCommitDiff ? commitDiffOriginal : originalContent
  const modDisplay = isCommitDiff ? commitDiffModified : modifiedContent
  const language = displayPath ? detectLanguage(displayPath) : 'plaintext'

  // File history overlay
  if (fileHistoryPath) {
    return <FileHistoryPanel filePath={fileHistoryPath} commits={fileHistoryCommits}
      onClose={closeFileHistory} repoPath={repoPath || ''} onShowDiff={showCommitFileDiff} />
  }

  // Blame view overlay
  if (blameFilePath) {
    return <BlameView filePath={blameFilePath} blameData={blameData} content={blameFileContent} onClose={closeBlameView} />
  }

  if (!hasContent) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary text-sm bg-bg-primary">
        选择文件以查看差异
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-bg-secondary border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 text-xs min-w-0">
          {isCommitDiff && (
            <span className="text-text-accent font-mono text-[10px]">{commitDiffHash?.substring(0, 7)}</span>
          )}
          {selectedFile && !isCommitDiff && (
            <StatusBadge status={selectedFile.status} />
          )}
          <span className="text-text-primary truncate">{displayPath}</span>
          {selectedFile && !isCommitDiff && (
            <span className="text-text-secondary text-[10px]">
              ({selectedFile.staged ? '已暂存' : '工作区'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs flex-shrink-0">
          <button onClick={() => setDiffMode('unified')}
            className={`px-2 py-0.5 rounded transition-colors ${diffMode === 'unified' ? 'bg-bg-active text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}>
            内联
          </button>
          <button onClick={() => setDiffMode('side-by-side')}
            className={`px-2 py-0.5 rounded transition-colors ${diffMode === 'side-by-side' ? 'bg-bg-active text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}>
            并排
          </button>
          {/* Close button */}
          <button onClick={closeDiff}
            className="ml-1 w-5 h-5 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            title="关闭差异">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      {/* Hunk staging toolbar */}
      {canPartialStage && hunks.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 bg-bg-tertiary border-b border-border flex-shrink-0 overflow-x-auto">
          <span className="text-[10px] text-text-secondary flex-shrink-0 mr-1">
            {hunks.length} 个代码块:
          </span>
          {hunks.map((hunk, i) => (
            <div key={i} className="flex items-center gap-0.5 flex-shrink-0">
              <span className="text-[9px] text-text-secondary font-mono truncate max-w-[120px]" title={hunk.header}>
                {hunk.header.substring(0, 30)}
              </span>
              {!selectedFile?.staged ? (
                <button onClick={() => stageHunk(hunk)} disabled={hunkLoading}
                  className="px-1 py-0 text-[9px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded"
                  title="暂存此代码块">+暂存</button>
              ) : (
                <button onClick={() => unstageHunk(hunk)} disabled={hunkLoading}
                  className="px-1 py-0 text-[9px] bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded"
                  title="取消暂存此代码块">-取消</button>
              )}
              {i < hunks.length - 1 && <span className="text-border mx-0.5">|</span>}
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <DiffEditor
          original={origDisplay}
          modified={modDisplay}
          language={language}
          theme="vs-dark"
          options={{
            readOnly: true,
            renderSideBySide: diffMode === 'side-by-side',
            minimap: { enabled: false },
            fontSize: 12, lineHeight: 20,
            scrollBeyondLastLine: false,
            diffWordWrap: 'on', wordWrap: 'on',
            automaticLayout: true,
            glyphMargin: false, lineNumbersMinChars: 3,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
          }}
        />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    added: 'bg-status-added', modified: 'bg-status-modified', deleted: 'bg-status-deleted',
    renamed: 'bg-status-modified', conflict: 'bg-status-conflict', untracked: 'bg-status-untracked'
  }
  const labels: Record<string, string> = {
    added: '新增', modified: '已修改', deleted: '已删除',
    renamed: '已重命名', conflict: '冲突', untracked: '新文件'
  }
  return (
    <span className={`${colors[status]} text-white text-[10px] px-1.5 py-0.5 rounded`}>
      {labels[status] || status}
    </span>
  )
}

// ============ FILE HISTORY PANEL ============

function FileHistoryPanel({ filePath, commits, onClose, repoPath, onShowDiff }: {
  filePath: string
  commits: { hash: string; date: string; message: string; author_name: string; author_email: string; refs: string }[]
  onClose: () => void
  repoPath: string
  onShowDiff: (hash: string, file: { status: string; path: string }) => Promise<void>
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1 bg-bg-secondary border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-accent font-medium">文件历史</span>
          <span className="text-text-primary truncate">{filePath}</span>
          <span className="text-text-secondary text-[10px]">({commits.length} 条提交)</span>
        </div>
        <button onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="关闭">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {commits.map(c => (
          <div key={c.hash}
            className="flex items-center px-3 py-1.5 border-b border-border/30 cursor-pointer hover:bg-bg-hover text-[11px]"
            onClick={() => onShowDiff(c.hash, { status: 'M', path: filePath })}>
            <span className="text-text-accent font-mono text-[10px] w-[60px] flex-shrink-0">{c.hash.substring(0, 7)}</span>
            <span className="text-text-primary flex-1 min-w-0 truncate px-2">{c.message}</span>
            <span className="text-text-secondary flex-shrink-0 w-[65px] truncate text-right text-[10px]">{c.author_name}</span>
            <span className="text-text-secondary flex-shrink-0 w-[85px] text-right text-[10px] pl-2">
              {new Date(c.date).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {commits.length === 0 && <div className="p-4 text-center text-text-secondary text-xs">无提交记录</div>}
      </div>
    </div>
  )
}

// ============ BLAME VIEW ============

function BlameView({ filePath, blameData, content, onClose }: {
  filePath: string
  blameData: BlameInfo[]
  content: string
  onClose: () => void
}) {
  const language = detectLanguage(filePath)

  // Build blame gutter annotations by line
  const blameByLine = useMemo(() => {
    const map = new Map<number, BlameInfo>()
    for (const b of blameData) {
      map.set(b.line, b)
    }
    return map
  }, [blameData])

  // Generate distinct colors for commits
  const commitColors = useMemo(() => {
    const colors = ['#264027', '#26323e', '#3e2626', '#2e2640', '#403d26', '#26403a', '#40262e', '#263540']
    const hashSet = new Set(blameData.map(b => b.hash))
    const map = new Map<string, string>()
    let i = 0
    for (const h of hashSet) {
      map.set(h, colors[i % colors.length])
      i++
    }
    return map
  }, [blameData])

  // Build blame text lines to show alongside the editor
  const blameLines = useMemo(() => {
    const lines = content.split('\n')
    return lines.map((_, i) => {
      const b = blameByLine.get(i + 1)
      if (!b) return ''
      return `${b.hash.substring(0, 7)} ${b.author.padEnd(12).substring(0, 12)} ${b.date}`
    })
  }, [content, blameByLine])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1 bg-bg-secondary border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-accent font-medium">Blame</span>
          <span className="text-text-primary truncate">{filePath}</span>
        </div>
        <button onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="关闭">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Blame gutter */}
        <div className="overflow-y-auto flex-shrink-0 bg-[#1a1a1a] border-r border-border font-mono text-[10px] leading-[20px] select-none"
          style={{ minWidth: 280 }}>
          {blameLines.map((line, i) => {
            const b = blameByLine.get(i + 1)
            const bgColor = b ? commitColors.get(b.hash) || 'transparent' : 'transparent'
            return (
              <div key={i} className="px-2 truncate text-text-secondary hover:text-text-primary"
                style={{ height: 20, backgroundColor: bgColor }}
                title={b ? `${b.hash}\n${b.author}\n${b.date}\n${b.summary}` : ''}>
                {line}
              </div>
            )
          })}
        </div>
        {/* File content */}
        <div className="flex-1 min-w-0">
          <Editor
            value={content}
            language={language}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12, lineHeight: 20,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              glyphMargin: false, lineNumbersMinChars: 3,
              scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
            }}
          />
        </div>
      </div>
    </div>
  )
}
