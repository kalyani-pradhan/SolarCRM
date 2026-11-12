import { Bell, ChevronDown, MoonStar, Search, SunMedium, X } from 'lucide-react'

export interface GlobalSearchResult {
  id: string
  type: 'Lead' | 'Call' | 'Follow-up'
  label: string
  secondary: string
  page: 'Leads' | 'Call Logs' | 'Follow-ups'
  leadId?: number
}

interface TopNavbarProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onToggleSidebar: () => void
  search: string
  onSearchChange: (value: string) => void
  searchResults?: GlobalSearchResult[]
  onSelectSearchResult?: (result: GlobalSearchResult) => void
  onClearSearch?: () => void
  notificationsOpen: boolean
  profileMenuOpen: boolean
  onToggleNotifications: () => void
  onToggleProfileMenu: () => void
  onNavigateToReports: () => void
}

export function TopNavbar({
  theme,
  onToggleTheme,
  onToggleSidebar,
  search,
  onSearchChange,
  searchResults = [],
  onSelectSearchResult,
  onClearSearch,
  notificationsOpen,
  profileMenuOpen,
  onToggleNotifications,
  onToggleProfileMenu,
  onNavigateToReports,
}: TopNavbarProps) {
  const hasSearchValue = search.trim().length > 0
  const isDark = theme === 'dark'

  return (
    <header
      className={[
        'relative z-40 flex h-[72px] items-center justify-between border-b px-4 md:px-6',
        isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800',
      ].join(' ')}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={[
            'flex h-9 w-9 items-center justify-center rounded-lg border',
            isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100',
          ].join(' ')}
          aria-label="Toggle sidebar"
        >
          <span className="text-lg leading-none">☰</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3568C8] text-sm font-bold text-white shadow-sm">
            S
          </div>
          <span className={['hidden text-sm font-semibold tracking-[0.12em] md:inline-block', isDark ? 'text-slate-200' : 'text-slate-700'].join(' ')}>
            SOLARCRM
          </span>
        </div>

        <div
          className={[
            'relative hidden min-w-[260px] max-w-[420px] flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 md:flex',
            isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50',
          ].join(' ')}
        >
          <Search className={['h-4 w-4', isDark ? 'text-slate-400' : 'text-slate-400'].join(' ')} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && hasSearchValue && onSelectSearchResult && searchResults[0]) {
                event.preventDefault()
                onSelectSearchResult(searchResults[0])
              }
            }}
            placeholder="Search leads, calls, follow-ups"
            className={['w-full border-0 bg-transparent text-sm focus:outline-none', isDark ? 'text-slate-100 placeholder:text-slate-400' : 'text-slate-700 placeholder:text-slate-400'].join(' ')}
            aria-label="Global CRM search"
          />

          {hasSearchValue && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className={[
                'flex h-6 w-6 items-center justify-center rounded-full',
                isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600',
              ].join(' ')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {hasSearchValue && (
            <div
              className={[
                'absolute left-0 right-0 top-[calc(100%+10px)] z-[60] overflow-hidden rounded-2xl border shadow-2xl',
                isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white',
              ].join(' ')}
            >
              {searchResults.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => onSelectSearchResult?.(result)}
                      className={[
                        'flex w-full items-start justify-between gap-3 border-b px-3 py-2.5 text-left transition last:border-b-0',
                        isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div>
                        <p className={['text-sm font-medium', isDark ? 'text-slate-100' : 'text-slate-800'].join(' ')}>{result.label}</p>
                        <p className={['text-xs', isDark ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{result.secondary}</p>
                      </div>
                      <span className={['rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]', isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'].join(' ')}>
                        {result.type}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={['px-3 py-3 text-sm', isDark ? 'text-slate-400' : 'text-slate-500'].join(' ')}>No matches found.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative flex items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={[
            'flex h-10 w-10 items-center justify-center rounded-full border transition',
            isDark ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
          ].join(' ')}
        >
          {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>

        <div className="relative z-50">
          <button
            type="button"
            onClick={onToggleNotifications}
            className={[
              'relative flex h-10 w-10 items-center justify-center rounded-full border',
              isDark ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
            ].join(' ')}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className={['absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-2xl border p-2 shadow-xl', isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'].join(' ')}>
              <div className={['px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em]', isDark ? 'text-slate-400' : 'text-slate-400'].join(' ')}>Notifications</div>
              <button type="button" onClick={onNavigateToReports} className={['w-full rounded-xl px-3 py-2 text-left text-sm transition', isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'].join(' ')}>
                3 follow-ups due today
              </button>
              <button type="button" onClick={onNavigateToReports} className={['w-full rounded-xl px-3 py-2 text-left text-sm transition', isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'].join(' ')}>
                2 new leads added this week
              </button>
              <button type="button" onClick={onNavigateToReports} className={['w-full rounded-xl px-3 py-2 text-left text-sm transition', isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'].join(' ')}>
                Telecaller conversion trend improved
              </button>
            </div>
          )}
        </div>

        <div className="relative z-50">
          <button
            type="button"
            onClick={onToggleProfileMenu}
            className={[
              'flex items-center gap-2 rounded-full border px-2 py-1.5 text-left',
              isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-slate-50 hover:bg-slate-100',
            ].join(' ')}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-indigo-500 text-xs font-semibold text-white">
              C
            </div>
            <div className="hidden text-left md:block">
              <p className={['text-xs font-semibold', isDark ? 'text-slate-100' : 'text-slate-700'].join(' ')}>Conditions</p>
              <p className={['text-[10px]', isDark ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Admin</p>
            </div>
            <ChevronDown className={['hidden h-4 w-4 md:block', isDark ? 'text-slate-400' : 'text-slate-500'].join(' ')} />
          </button>

          {profileMenuOpen && (
            <div className={['absolute right-0 top-[calc(100%+10px)] z-50 w-52 rounded-2xl border p-2 shadow-xl', isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'].join(' ')}>
              <button type="button" onClick={onNavigateToReports} className={['w-full rounded-xl px-3 py-2 text-left text-sm transition', isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'].join(' ')}>
                View reports
              </button>
              <button type="button" onClick={() => onNavigateToReports()} className={['w-full rounded-xl px-3 py-2 text-left text-sm transition', isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'].join(' ')}>
                Team performance
              </button>
              <button type="button" onClick={() => onNavigateToReports()} className={['w-full rounded-xl px-3 py-2 text-left text-sm transition', isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'].join(' ')}>
                Account settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
