import { useState, useEffect, useCallback, useRef } from 'react'
import { DiffEditor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useGitStore, BlameInfo } from '../stores/gitStore'

// Configure Monaco to load from node_modules
loader.config({ monaco })

// Detect language from file extension
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
    swift: 'swift', dart: 'dart', lua: 'lua', r: 'r',
    vue: 'html', svelte: 'html', dockerfile: 'dockerfile',
    makefile: 'makefile', cmake: 'cmake',
  }
  return map[ext] || 'plaintext'
}

export function DiffView() {
  const { selectedFile, repoPath, diffMode, setDiffMode, getBlame } = useGitStore()
  const [originalContent, setOriginalContent] = useState('')
  const [modifiedContent, setModifiedContent] = useState('')
  const [blameData, setBlameData] = useState<BlameInfo[]>([])
  const [tooltip, setTooltip] = useState<{ x: number; y: number; info: BlameInfo } | null>(null)
  const editorRef = useRef<any>(null)

  // Load file contents when file is selected
  useEffect(() => {
    if (!selectedFile || !repoPath) {
      setOriginalContent('')
      setModifiedContent('')
      setBlameData([])
      return
    }

    const loadContents = async () => {
      try {
        if (selectedFile.status === 'untracked') {
          setOriginalContent('')
          const content = await window.git.showFile(repoPath, selectedFile.path)
          setModifiedContent(content)
        } else if (selectedFile.status === 'added') {
          setOriginalContent('')
          if (selectedFile.staged) {
            const content = await window.git.showOriginal(repoPath, selectedFile.path, ':0')
            setModifiedContent(content)
          } else {
            const content = await window.git.showFile(repoPath, selectedFile.path)
            setModifiedContent(content)
          }
        } else if (selectedFile.status === 'deleted') {
          const original = await window.git.showOriginal(repoPath, selectedFile.path)
          setOriginalContent(original)
          setModifiedContent('')
        } else {
          // modified, renamed etc.
          const original = await window.git.showOriginal(repoPath, selectedFile.path)
          setOriginalContent(original)
          if (selectedFile.staged) {
            // Staged: show index version vs HEAD
            const staged = await window.git.showOriginal(repoPath, selectedFile.path, ':0')
            setModifiedContent(staged)
          } else {
            // Unstaged: show working copy vs HEAD
            const current = await window.git.showFile(repoPath, selectedFile.path)
            setModifiedContent(current)
          }
        }
      } catch {
        setOriginalContent('')
        setModifiedContent('')
      }
    }

    loadContents()

    // Load blame
    if (selectedFile.status !== 'untracked') {
      getBlame(selectedFile.path).then(setBlameData).catch(() => setBlameData([]))
    } else {
      setBlameData([])
    }
  }, [selectedFile?.path, selectedFile?.staged, selectedFile?.status, repoPath])

  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor

    // Add blame hover on modified editor
    const modifiedEditor = editor.getModifiedEditor()
    if (modifiedEditor && blameData.length > 0) {
      modifiedEditor.onMouseMove((e: any) => {
        if (e.target?.position?.lineNumber && blameData.length > 0) {
          const lineNum = e.target.position.lineNumber
          const info = blameData.find(b => b.line === lineNum)
          if (info) {
            setTooltip({
              x: e.event.posx + 12,
              y: e.event.posy - 10,
              info
            })
          } else {
            setTooltip(null)
          }
        } else {
          setTooltip(null)
        }
      })
      modifiedEditor.onMouseLeave(() => setTooltip(null))
    }
  }, [blameData])

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary text-sm">
        选择文件以查看差异
      </div>
    )
  }

  const language = detectLanguage(selectedFile.path)

  return (
    <div className="h-full flex flex-col">
      {/* Diff toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <StatusBadge status={selectedFile.status} />
          <span className="text-text-primary">{selectedFile.path}</span>
          <span className="text-text-secondary">
            ({selectedFile.staged ? '已暂存' : '工作区'})
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setDiffMode('unified')}
            className={`px-2 py-0.5 rounded transition-colors ${
              diffMode === 'unified' ? 'bg-bg-active text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            内联视图
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
      {/* Monaco Diff Editor */}
      <div className="flex-1 min-h-0">
        <DiffEditor
          original={originalContent}
          modified={modifiedContent}
          language={language}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            renderSideBySide: diffMode === 'side-by-side',
            minimap: { enabled: false },
            fontSize: 12,
            lineHeight: 20,
            scrollBeyondLastLine: false,
            renderOverviewRuler: true,
            diffWordWrap: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            glyphMargin: false,
            folding: true,
            lineNumbersMinChars: 3,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8
            }
          }}
        />
      </div>
      {/* Blame tooltip */}
      {tooltip && <BlameTooltip x={tooltip.x} y={tooltip.y} info={tooltip.info} />}
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
