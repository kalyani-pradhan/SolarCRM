import type { ReactNode } from 'react'

export interface ActionMenuItem {
  label: string
  onSelect: () => void
  destructive?: boolean
  icon?: ReactNode
}

interface ActionMenuProps {
  label?: string
  items: ActionMenuItem[]
  buttonClassName?: string
  menuClassName?: string
}

export function ActionMenu({ label = 'More actions', items, buttonClassName = '', menuClassName = '' }: ActionMenuProps) {
  return (
    <div className={['flex items-center justify-end gap-1.5', menuClassName].join(' ').trim()} aria-label={label}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          aria-label={item.label}
          title={item.label}
          onClick={(event) => {
            event.stopPropagation()
            item.onSelect()
          }}
          className={[
            buttonClassName || 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100',
            item.destructive ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-100',
          ].join(' ')}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}
