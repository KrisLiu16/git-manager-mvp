import { useEffect, useRef } from 'react'

export interface MenuItem {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

export function ContextMenu({ x, y, items, onClose }: {
  x: number; y: number; items: MenuItem[]; onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Adjust position if menu goes off-screen
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - rect.width - 4}px`
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${window.innerHeight - rect.height - 4}px`
    }
  }, [x, y])

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose() }} />
      <div ref={menuRef} className="context-menu z-50" style={{ left: x, top: y }}>
        {items.map((item, i) => {
          if (item.separator) {
            return <div key={i} className="context-menu-separator" />
          }
          return (
            <div key={i}
              className={`context-menu-item ${item.danger ? 'text-status-deleted' : ''} ${item.disabled ? 'opacity-40 pointer-events-none' : ''}`}
              onClick={() => { if (!item.disabled) item.onClick() }}>
              {item.label}
            </div>
          )
        })}
      </div>
    </>
  )
}
