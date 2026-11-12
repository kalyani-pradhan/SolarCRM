import { CalendarDays, RefreshCcw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  formatDateLabel,
  formatTimeLabel,
  getFollowUpDisplayStatus,
  type FollowUpDisplayStatus,
  type FollowUpRecord,
} from '../data/crmStorage'
import { FollowUpStatusBadge } from './FollowUpStatusBadge'

interface FollowUpsPageProps {
  followUps: FollowUpRecord[]
  leadsCount: number
  globalSearch?: string
  onGlobalSearchChange?: (value: string) => void
  onLogCall: (leadId: number) => void
  onMarkCompleted: (followUpId: number) => void
  onCancelFollowUp: (followUpId: number) => void
}

const summaryCards: { key: 'dueToday' | 'upcoming' | 'overdue' | 'completed'; label: string }[] = [
  { key: 'dueToday', label: 'Due Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'completed', label: 'Completed' },
]

export function FollowUpsPage({ followUps, leadsCount, globalSearch = '', onGlobalSearchChange, onLogCall, onMarkCompleted, onCancelFollowUp }: FollowUpsPageProps) {
  const [searchTerm, setSearchTerm] = useState(globalSearch)
  const [statusFilter, setStatusFilter] = useState<'All' | FollowUpDisplayStatus>('All')
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'This Week' | 'Overdue'>('All')
  const [currentDate] = useState(() => new Date())
  const activeSearch = globalSearch || searchTerm

  const summary = useMemo(() => {
    const nextSummary = {
      dueToday: 0,
      upcoming: 0,
      overdue: 0,
      completed: 0,
    }

    followUps.forEach((followUp) => {
      const status = getFollowUpDisplayStatus(followUp)

      if (status === 'Due Today') nextSummary.dueToday += 1
      if (status === 'Upcoming') nextSummary.upcoming += 1
      if (status === 'Overdue') nextSummary.overdue += 1
      if (status === 'Completed') nextSummary.completed += 1
    })

    return nextSummary
  }, [followUps])

  const filteredFollowUps = useMemo(() => {
    return followUps.filter((followUp) => {
      const displayStatus = getFollowUpDisplayStatus(followUp, currentDate)
      const matchesSearch =
        followUp.customerName.toLowerCase().includes(activeSearch.toLowerCase()) ||
        followUp.phoneNumber.toLowerCase().includes(activeSearch.toLowerCase())

      const matchesStatus = statusFilter === 'All' || displayStatus === statusFilter

      let matchesDate = true
      if (dateFilter === 'Today') {
        matchesDate = getFollowUpDisplayStatus(followUp, currentDate) === 'Due Today'
      }
      if (dateFilter === 'This Week') {
        const currentWeek = new Date(currentDate)
        currentWeek.setDate(currentDate.getDate() + 7)
        const followUpDate = new Date(`${followUp.followUpDate}T${followUp.followUpTime || '00:00'}`)
        matchesDate = followUpDate >= currentDate && followUpDate <= currentWeek
      }
      if (dateFilter === 'Overdue') {
        matchesDate = displayStatus === 'Overdue'
      }

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [activeSearch, currentDate, dateFilter, followUps, statusFilter])

  const handleReset = () => {
    setSearchTerm('')
    setStatusFilter('All')
    setDateFilter('All')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-slate-900">Follow-ups</h1>
          <p className="mt-1 text-sm text-slate-500">Manage upcoming customer callbacks and overdue follow-ups.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full min-w-[220px] md:w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={activeSearch}
              onChange={(event) => {
                const nextValue = event.target.value
                setSearchTerm(nextValue)
                onGlobalSearchChange?.(nextValue)
              }}
              placeholder="Search follow-ups"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/15"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'All' | FollowUpDisplayStatus)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/15"
          >
            <option value="All">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Due Today">Due Today</option>
            <option value="Overdue">Overdue</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as 'All' | 'Today' | 'This Week' | 'Overdue')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/15"
          >
            <option value="All">All Dates</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="Overdue">Overdue</option>
          </select>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ key, label }) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.04em] text-slate-900">{summary[key]}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf4ff] text-[#3568C8]">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">Upcoming follow-ups</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {leadsCount} leads tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-slate-400">
                <th className="border-b border-slate-200 px-3 py-3 font-medium">Customer</th>
                <th className="border-b border-slate-200 px-3 py-3 font-medium">Phone</th>
                <th className="border-b border-slate-200 px-3 py-3 font-medium">Follow-up Date</th>
                <th className="border-b border-slate-200 px-3 py-3 font-medium">Follow-up Time</th>
                <th className="border-b border-slate-200 px-3 py-3 font-medium">Notes</th>
                <th className="border-b border-slate-200 px-3 py-3 font-medium">Status</th>
                <th className="border-b border-slate-200 px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredFollowUps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-500">
                    No follow-ups match the current filters.
                  </td>
                </tr>
              ) : (
                filteredFollowUps.map((followUp) => {
                  const displayStatus = getFollowUpDisplayStatus(followUp)

                  return (
                    <tr key={followUp.id} className="group transition hover:bg-slate-50/80">
                      <td className="border-b border-slate-200 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#dfeaff] to-[#b9cbff] text-[11px] font-semibold text-slate-700">
                            {followUp.customerName
                              .split(' ')
                              .map((segment) => segment[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-800">{followUp.customerName}</span>
                        </div>
                      </td>
                      <td className="border-b border-slate-200 px-3 py-3 text-sm text-slate-600">{followUp.phoneNumber}</td>
                      <td className="border-b border-slate-200 px-3 py-3 text-sm text-slate-600">
                        {formatDateLabel(followUp.followUpDate)}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-3 text-sm text-slate-600">
                        {formatTimeLabel(followUp.followUpTime)}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-3 text-sm text-slate-600">
                        {followUp.followUpNotes || '—'}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-3">
                        <FollowUpStatusBadge status={displayStatus} />
                      </td>
                      <td className="border-b border-slate-200 px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onLogCall(followUp.leadId)}
                            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Log Call
                          </button>
                          <button
                            type="button"
                            onClick={() => onMarkCompleted(followUp.id)}
                            disabled={followUp.status === 'Completed'}
                            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelFollowUp(followUp.id)}
                            disabled={followUp.status === 'Cancelled'}
                            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
