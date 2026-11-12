import { ChevronDown, SlidersHorizontal } from 'lucide-react'

interface DashboardHeaderProps {
  fileMenuOpen: boolean
  onToggleFileMenu: () => void
  adjustmentMenuOpen: boolean
  onToggleAdjustmentMenu: () => void
  onNavigateToReports: () => void
  onSaveDashboardNotice: (message: string) => void
}

export function DashboardHeader({
  fileMenuOpen,
  onToggleFileMenu,
  adjustmentMenuOpen,
  onToggleAdjustmentMenu,
  onNavigateToReports,
  onSaveDashboardNotice,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-[24px] font-semibold tracking-[-0.04em] text-slate-900">Telecaller Dashboard</h1>

      <div className="flex items-center gap-3">
        <div className="relative z-20">
          <button
            type="button"
            onClick={onToggleFileMenu}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <span>File saved</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {fileMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  onSaveDashboardNotice('Dashboard draft is open and synced with current leads.')
                  onNavigateToReports()
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
              >
                View drafts
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveDashboardNotice('Opening the latest report export for this dashboard view.')
                  onNavigateToReports()
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
              >
                Export report
              </button>
            </div>
          )}
        </div>

        <div className="relative z-20">
          <button
            type="button"
            onClick={onToggleAdjustmentMenu}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Adjustment</span>
          </button>

          {adjustmentMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <button
                type="button"
                onClick={() => onSaveDashboardNotice('Dashboard card layout is preview-only in this front-end build.')}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
              >
                Reorder columns
              </button>
              <button
                type="button"
                onClick={() => onSaveDashboardNotice('Default dashboard filters are saved for this session.')}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
              >
                Filter defaults
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
