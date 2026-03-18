export function ConfirmDialog({ title, message, danger, onConfirm, onCancel, children }: {
  title: string
  message: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}) {
  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40" onClick={onCancel} />
      <div className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-primary border border-border rounded-lg shadow-xl p-4 w-[360px]">
        <div className="text-sm font-medium text-text-primary mb-2">{title}</div>
        <div className="text-xs text-text-secondary mb-3 leading-relaxed">{message}</div>
        {children}
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onCancel}
            className="px-3 py-1 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-hover border border-border rounded transition-colors">
            取消
          </button>
          <button onClick={onConfirm}
            className={`px-3 py-1 text-xs text-white rounded transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            确认
          </button>
        </div>
      </div>
    </>
  )
}
