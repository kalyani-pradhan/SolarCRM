import type { CallOutcome } from '../data/crmStorage'

const outcomeStyles: Record<CallOutcome, string> = {
  Connected: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  'No Answer': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  Busy: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
  'Switched Off': 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  'Call Back Requested': 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
  'Not Interested': 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
}

export function CallOutcomeBadge({ outcome }: { outcome: CallOutcome }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${outcomeStyles[outcome]}`}>
      {outcome}
    </span>
  )
}
