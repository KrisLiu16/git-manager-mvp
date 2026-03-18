import { useState, useEffect } from 'react'
import { DiffEditor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useGitStore } from '../stores/gitStore'

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

export function DiffView() {
  const {
    selectedFile, repoPath, diffMode, setDiffMode, setSelectedFile,
    commitDiffOriginal, commitDiffModified, commitDiffPath, commitDiffHash, clearCommitDiff
  } = useGitStore()

  const [originalContent, setOriginalContent] = useState('')
  const [modifiedContent, setModifiedContent] = useState('')

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

  const origDisplay = isCommitDiff ? commitDiffOriginal : originalContent
  const modDisplay = isCommitDiff ? commitDiffModified : modifiedContent
  const language = displayPath ? detectLanguage(displayPath) : 'plaintext'

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
