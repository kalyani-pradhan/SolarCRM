import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  accentClass: string
}

export function StatCard({ label, value, icon: Icon, accentClass }: StatCardProps) {
  return (
    <div className="flex min-h-[116px] items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="flex flex-col justify-between gap-5">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.04em] text-slate-900">{value}</p>
        </div>
      </div>

      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accentClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  )
}
