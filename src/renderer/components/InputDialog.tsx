import { useState, useEffect, useRef } from 'react'

export function InputDialog({ title, placeholder, onConfirm, onCancel }: {
  title: string
  placeholder: string
  onConfirm: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed) onConfirm(trimmed)
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40" onClick={onCancel} />
      <div className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-primary border border-border rounded-lg shadow-xl p-4 w-[320px]">
        <div className="text-sm font-medium text-text-primary mb-3">{title}</div>
        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-bg-tertiary border border-border rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-border-focus"
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onCancel()
          }}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onCancel}
            className="px-3 py-1 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-hover border border-border rounded transition-colors">
            取消
          </button>
          <button onClick={handleSubmit} disabled={!value.trim()}
            className="px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/30 disabled:cursor-not-allowed rounded transition-colors">
            确定
          </button>
        </div>
      </div>
    </>
  )
}
