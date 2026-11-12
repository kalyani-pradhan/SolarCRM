import { BarChart3, CalendarCheck2, House, LayoutGrid, PanelLeftClose, PanelLeftOpen, PhoneCall, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  activeItem: string
  onToggle: () => void
  onSelect: (item: string) => void
  theme: 'light' | 'dark'
}

const items: { label: string; icon: LucideIcon }[] = [
  { label: 'Dashboard', icon: LayoutGrid },
  { label: 'Leads', icon: Users },
  { label: 'Team', icon: Users },
  { label: 'Call Logs', icon: PhoneCall },
  { label: 'Follow-ups', icon: CalendarCheck2 },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Owner Analytics', icon: BarChart3 },
]

export function Sidebar({ collapsed, activeItem, onToggle, onSelect, theme }: SidebarProps) {
  const isDark = theme === 'dark'

  return (
    <aside
      className={[
        'border-r transition-all duration-200',
        isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white',
        collapsed ? 'w-[86px]' : 'w-[232px]',
      ].join(' ')}
    >
      <div className="flex h-full flex-col">
        <div className={['flex items-center justify-between border-b px-4 py-4', isDark ? 'border-slate-700' : 'border-slate-200'].join(' ')}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3568C8] shadow-sm">
              <div className="grid h-5 w-5 grid-cols-2 gap-[2px]">
                <span className="rounded-sm bg-white/90" />
                <span className="rounded-sm bg-white/60" />
                <span className="rounded-sm bg-white/70" />
                <span className="rounded-sm bg-white/90" />
              </div>
            </div>
            {!collapsed && <span className={['text-sm font-semibold tracking-[0.2em]', isDark ? 'text-slate-200' : 'text-slate-700'].join(' ')}>CRM</span>}
          </div>
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggle}
            className={[
              'flex h-8 w-8 items-center justify-center rounded-lg border transition',
              isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100',
            ].join(' ')}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-4">
          {items.map(({ label, icon: Icon }) => {
            const isActive = activeItem === label
            return (
              <button
                key={label}
                type="button"
                onClick={() => onSelect(label)}
                className={[
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                  isActive
                    ? isDark
                      ? 'bg-sky-950 text-sky-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.2)]'
                      : 'bg-[#edf4ff] text-[#3568C8] shadow-[inset_0_0_0_1px_rgba(53,104,200,0.08)]'
                    : isDark
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  collapsed ? 'justify-center px-2' : '',
                ].join(' ')}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </button>
            )
          })}
        </nav>

        <div className={['border-t px-3 py-3', isDark ? 'border-slate-700' : 'border-slate-200'].join(' ')}>
          <button
            type="button"
            onClick={() => onSelect('Dashboard')}
            className={[
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
              isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100',
              collapsed ? 'justify-center px-2' : '',
            ].join(' ')}
          >
            <House className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Home</span>}
          </button>

          <div className={['mt-3 flex items-center gap-3 rounded-xl border px-2.5 py-2.5', isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'].join(' ')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-indigo-500 text-sm font-semibold text-white">
              C
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className={['truncate text-sm font-semibold', isDark ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Conditions</p>
                <p className={['text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Sales Executive</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
