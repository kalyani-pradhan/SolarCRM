import type { LeadStatus } from '../data/leads'

const statusStyles: Record<LeadStatus, string> = {
  Interested: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  'Follow-up': 'bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-200',
  'New Lead': 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  Contacted: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
  Converted: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
  'Not Interested': 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  )
}
