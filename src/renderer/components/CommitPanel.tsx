import { useGitStore } from '../stores/gitStore'

export function CommitPanel() {
  const {
    commitMessage, setCommitMessage,
    amendMode, setAmendMode,
    stagedFiles, doCommit, doCommitAndPush
  } = useGitStore()

  const canCommit = commitMessage.trim().length > 0 && stagedFiles.length > 0

  return (
    <div className="border-t border-border bg-bg-secondary p-3 flex flex-col gap-2">
      <textarea
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        placeholder="提交信息..."
        className="w-full h-20 bg-bg-primary border border-border rounded px-2 py-1.5 text-xs text-text-primary resize-none focus:outline-none focus:border-border-focus placeholder:text-text-secondary"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            if (canCommit) doCommit()
          }
        }}
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={amendMode}
            onChange={(e) => setAmendMode(e.target.checked)}
            className="rounded"
          />
          修改上次提交
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={doCommit}
          disabled={!canCommit}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
        >
          提交 ({stagedFiles.length})
        </button>
        <button
          onClick={doCommitAndPush}
          disabled={!canCommit}
          className="flex-1 py-1.5 bg-green-700 hover:bg-green-800 disabled:bg-green-700/40 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
        >
          提交并推送
        </button>
      </div>
    </div>
  )
}
