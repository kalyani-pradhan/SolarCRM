import type { FollowUpDisplayStatus } from '../data/crmStorage'

const statusStyles: Record<FollowUpDisplayStatus, string> = {
  Upcoming: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  'Due Today': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  Overdue: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  Cancelled: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
}

export function FollowUpStatusBadge({ status }: { status: FollowUpDisplayStatus }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  )
}
