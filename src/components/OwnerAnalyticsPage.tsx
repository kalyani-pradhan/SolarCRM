import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  PhoneCall,
  RefreshCcw,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { getFollowUpDisplayStatus, type CallRecord, type FollowUpRecord } from '../data/crmStorage'
import { type Lead } from '../data/leads'
import { StatCard } from './StatCard'

export type AnalyticsRange = 'today' | '7d' | '30d' | 'month' | 'all' | 'custom'

interface OwnerAnalyticsPageProps {
  leads: Lead[]
  callRecords: CallRecord[]
  followUps: FollowUpRecord[]
  onNavigate: (page: 'Dashboard' | 'Leads' | 'Call Logs' | 'Follow-ups' | 'Reports' | 'Owner Analytics') => void
}

function parseLocalDate(value: string | undefined) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getRangeBounds(range: AnalyticsRange, customStart = '', customEnd = '', reference = new Date()) {
  const todayStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  const todayEnd = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999)

  if (range === 'today') {
    return { start: todayStart, end: todayEnd }
  }

  if (range === '7d') {
    const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 6)
    return { start, end: todayEnd }
  }

  if (range === '30d') {
    const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 29)
    return { start, end: todayEnd }
  }

  if (range === 'month') {
    const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
    const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }

  if (range === 'custom') {
    const start = parseLocalDate(customStart)
    const end = parseLocalDate(customEnd)
    if (start && end) {
      const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
      return { start: new Date(start.getFullYear(), start.getMonth(), start.getDate()), end: normalizedEnd }
    }
    return { start: null, end: null }
  }

  return { start: null, end: null }
}

function inRange(dateValue: string | undefined, start: Date | null, end: Date | null) {
  const date = parseLocalDate(dateValue)
  if (!date) {
    return start === null && end === null
  }

  if (start && date < start) {
    return false
  }

  if (end && date > end) {
    return false
  }

  return true
}

function createCallActivity(records: CallRecord[], range: AnalyticsRange, start: Date | null, end: Date | null) {
  const relevantRecords = records.filter((record) => {
    const callDateTime = new Date(`${record.callDate}T${record.callTime || '00:00'}`)
    if (Number.isNaN(callDateTime.getTime())) {
      return false
    }

    const localDate = new Date(
      callDateTime.getFullYear(),
      callDateTime.getMonth(),
      callDateTime.getDate(),
    )

    if (start && localDate < start) {
      return false
    }

    if (end && localDate > end) {
      return false
    }

    return true
  })

  if (range === 'today') {
    const labels = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
    const totals = Array(24).fill(0)
    const connected = Array(24).fill(0)

    relevantRecords.forEach((record) => {
      const callDateTime = new Date(`${record.callDate}T${record.callTime || '00:00'}`)
      const bucketIndex = callDateTime.getHours()
      totals[bucketIndex] += 1
      if (record.callOutcome === 'Connected') {
        connected[bucketIndex] += 1
      }
    })

    return { labels, totals, connected }
  }

  const labelDates: string[] = []
  const totalsMap = new Map<string, number>()
  const connectedMap = new Map<string, number>()

  if (start && end) {
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())

    while (current <= last) {
      const key = toLocalDateString(current)
      labelDates.push(key)
      totalsMap.set(key, 0)
      connectedMap.set(key, 0)
      current.setDate(current.getDate() + 1)
    }
  } else {
    const uniqueDates = Array.from(new Set(relevantRecords.map((record) => record.callDate))).sort()
    uniqueDates.forEach((date) => {
      labelDates.push(date)
      totalsMap.set(date, 0)
      connectedMap.set(date, 0)
    })
  }

  relevantRecords.forEach((record) => {
    const key = record.callDate
    const currentTotal = totalsMap.get(key) ?? 0
    totalsMap.set(key, currentTotal + 1)
    if (record.callOutcome === 'Connected') {
      const currentConnected = connectedMap.get(key) ?? 0
      connectedMap.set(key, currentConnected + 1)
    }
  })

  return {
    labels: labelDates.map((date) => {
      const parsed = parseLocalDate(date)
      if (!parsed) {
        return date
      }
      return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }),
    totals: labelDates.map((date) => totalsMap.get(date) ?? 0),
    connected: labelDates.map((date) => connectedMap.get(date) ?? 0),
  }
}

export function OwnerAnalyticsPage({ leads, callRecords, followUps, onNavigate }: OwnerAnalyticsPageProps) {
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [refreshStamp, setRefreshStamp] = useState(() => new Date())

  const bounds = useMemo(
    () => getRangeBounds(range, customStart, customEnd),
    [customEnd, customStart, range],
  )

  const activeLeads = useMemo(() => leads.filter((lead) => !lead.isDeleted), [leads])

  const filteredCalls = useMemo(
    () =>
      callRecords.filter((record) => {
        if (range === 'all') {
          return true
        }

        const start = bounds.start
        const end = bounds.end
        const callDate = parseLocalDate(record.callDate)

        if (!callDate) {
          return !start && !end
        }

        if (start && callDate < start) {
          return false
        }

        if (end && callDate > end) {
          return false
        }

        return true
      }),
    [bounds.end, bounds.start, callRecords, range],
  )

  const filteredFollowUps = useMemo(
    () =>
      followUps.filter((followUp) => {
        if (range === 'all') {
          return followUp.status !== 'Cancelled' && followUp.status !== 'Completed'
        }

        const start = bounds.start
        const end = bounds.end
        const followUpDate = parseLocalDate(followUp.followUpDate)

        if (!followUpDate) {
          return false
        }

        if (start && followUpDate < start) {
          return false
        }

        if (end && followUpDate > end) {
          return false
        }

        return followUp.status !== 'Cancelled' && followUp.status !== 'Completed'
      }),
    [bounds.end, bounds.start, followUps, range],
  )

  const filteredLeads = useMemo(() => {
    if (range === 'all') {
      return activeLeads
    }

    return activeLeads.filter((lead) => {
      const createdDate = lead.dateAdded ?? lead.lastContact
      return inRange(createdDate, bounds.start, bounds.end)
    })
  }, [activeLeads, bounds.end, bounds.start, range])

  const summaryCards = useMemo(
    () => {
      const totalLeads = filteredLeads.length
      const newLeads = filteredLeads.filter((lead) => lead.status === 'New Lead').length
      const connectedCalls = filteredCalls.filter((record) => record.callOutcome === 'Connected').length
      const pendingFollowUps = filteredFollowUps.length
      const convertedLeads = filteredLeads.filter((lead) => lead.status === 'Converted').length

      return [
        {
          label: 'Total Leads',
          value: String(totalLeads),
          icon: Users,
          accent: 'bg-[#eef4ff] text-[#3568C8]',
        },
        {
          label: 'New Leads',
          value: String(newLeads),
          icon: FileText,
          accent: 'bg-[#eefaf5] text-[#1d9d66]',
        },
        {
          label: 'Calls Made',
          value: String(filteredCalls.length),
          icon: PhoneCall,
          accent: 'bg-[#fff5ea] text-[#d77a1d]',
        },
        {
          label: 'Connected Calls',
          value: String(connectedCalls),
          icon: CheckCircle2,
          accent: 'bg-[#ecfaf3] text-[#2aa968]',
        },
        {
          label: 'Pending Follow-ups',
          value: String(pendingFollowUps),
          icon: Clock3,
          accent: 'bg-[#fff1f1] text-[#d95a66]',
        },
        {
          label: 'Converted Leads',
          value: String(convertedLeads),
          icon: TrendingUp,
          accent: 'bg-[#f2efff] text-[#6048d9]',
        },
      ]
    },
    [filteredCalls, filteredFollowUps, filteredLeads],
  )

  const activityChart = useMemo(
    () => createCallActivity(filteredCalls, range, bounds.start, bounds.end),
    [bounds.end, bounds.start, filteredCalls, range],
  )

  const funnelStatusCounts = useMemo(() => {
    const relevantStates = ['New Lead', 'Contacted', 'Interested', 'Follow-up', 'Converted'] as const
    const totals = new Map<string, number>()
    relevantStates.forEach((status) => totals.set(status, 0))

    activeLeads.forEach((lead) => {
      if (relevantStates.includes(lead.status as typeof relevantStates[number])) {
        totals.set(lead.status, (totals.get(lead.status) ?? 0) + 1)
      }
    })

    const totalActive = activeLeads.length || 1

    return relevantStates.map((status) => ({
      status,
      count: totals.get(status) ?? 0,
      percent: totalActive ? ((totals.get(status) ?? 0) / totalActive) * 100 : 0,
    }))
  }, [activeLeads])

  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    activeLeads.forEach((lead) => {
      const source = lead.source?.trim() || 'Unknown'
      map.set(source, (map.get(source) ?? 0) + 1)
    })

    const total = activeLeads.length || 1
    return Array.from(map.entries()).map(([source, count]) => ({
      source,
      count,
      percent: (count / total) * 100,
    }))
  }, [activeLeads])

  const followUpSummary = useMemo(() => {
    const summary = {
      dueToday: 0,
      upcoming: 0,
      overdue: 0,
      completed: 0,
      cancelled: 0,
    }

    followUps.forEach((followUp) => {
      const status = getFollowUpDisplayStatus(followUp)
      if (followUp.status === 'Cancelled') {
        summary.cancelled += 1
        return
      }

      if (status === 'Due Today') summary.dueToday += 1
      if (status === 'Upcoming') summary.upcoming += 1
      if (status === 'Overdue') summary.overdue += 1
      if (status === 'Completed') summary.completed += 1
    })

    return summary
  }, [followUps])

  const telecallerRows = useMemo(() => {
    const groups = new Map<
      string,
      {
        assignedLeads: number
        calls: number
        connected: number
        pending: number
        converted: number
      }
    >()

    activeLeads.forEach((lead) => {
      const telecaller = lead.assignedTo?.trim() || 'Unassigned'
      const current = groups.get(telecaller) ?? {
        assignedLeads: 0,
        calls: 0,
        connected: 0,
        pending: 0,
        converted: 0,
      }
      current.assignedLeads += 1
      if (lead.status === 'Converted') {
        current.converted += 1
      }
      groups.set(telecaller, current)
    })

    callRecords.forEach((record) => {
      const lead = leads.find((item) => item.id === record.leadId)
      const telecaller = lead?.assignedTo?.trim() || 'Unassigned'
      const current = groups.get(telecaller) ?? {
        assignedLeads: 0,
        calls: 0,
        connected: 0,
        pending: 0,
        converted: 0,
      }
      current.calls += 1
      if (record.callOutcome === 'Connected') {
        current.connected += 1
      }
      groups.set(telecaller, current)
    })

    followUps.forEach((followUp) => {
      const lead = leads.find((item) => item.id === followUp.leadId)
      const telecaller = lead?.assignedTo?.trim() || 'Unassigned'
      const current = groups.get(telecaller) ?? {
        assignedLeads: 0,
        calls: 0,
        connected: 0,
        pending: 0,
        converted: 0,
      }
      if (followUp.status !== 'Cancelled' && followUp.status !== 'Completed') {
        current.pending += 1
      }
      groups.set(telecaller, current)
    })

    return Array.from(groups.entries())
      .map(([telecaller, values]) => ({
        telecaller,
        ...values,
        connectionRate: values.calls > 0 ? (values.connected / values.calls) * 100 : 0,
      }))
      .sort((left, right) => right.calls - left.calls)
  }, [activeLeads, callRecords, followUps, leads])

  const recentActivity = useMemo(() => {
    const events: Array<{
      id: string
      type: 'Call' | 'Follow-up' | 'Lead'
      title: string
      date: string
      description: string
      page: 'Call Logs' | 'Follow-ups' | 'Leads'
      entityId: number
    }> = []

    callRecords.forEach((record) => {
      if (record.createdAt) {
        events.push({
          id: `call-${record.id}`,
          type: 'Call',
          title: record.customerName,
          date: record.createdAt,
          description: `${record.callOutcome} • ${record.phoneNumber}`,
          page: 'Call Logs',
          entityId: record.id,
        })
      }
    })

    followUps.forEach((followUp) => {
      if (followUp.createdAt) {
        events.push({
          id: `follow-${followUp.id}`,
          type: 'Follow-up',
          title: followUp.customerName,
          date: followUp.createdAt,
          description: `${followUp.status} • ${followUp.followUpDate || 'Date not set'}`,
          page: 'Follow-ups',
          entityId: followUp.id,
        })
      }
    })

    leads.forEach((lead) => {
      if (lead.dateAdded) {
        events.push({
          id: `lead-${lead.id}`,
          type: 'Lead',
          title: lead.name,
          date: `${lead.dateAdded}T00:00:00`,
          description: `${lead.status} • ${lead.company || 'No company recorded'}`,
          page: 'Leads',
          entityId: lead.id,
        })
      }
    })

    return events.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()).slice(0, 6)
  }, [callRecords, followUps, leads])

  const maxChartValue = Math.max(1, ...activityChart.totals, ...activityChart.connected)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3568C8]">Executive Overview</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-slate-900">Owner Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Track sales activity, lead conversion and team performance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as AnalyticsRange)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {range === 'custom' && (
            <>
              <input
                aria-label="Custom start date"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
              />
              <input
                aria-label="Custom end date"
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
              />
            </>
          )}

          <button
            type="button"
            onClick={() => setRefreshStamp(new Date())}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map(({ accent, icon: Icon, label, value }) => (
          <StatCard key={label} label={label} value={value} icon={Icon} accentClass={accent} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Call Activity</h2>
              <p className="text-sm text-slate-500">Calls and connected conversations over the selected window</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#3568C8]" />Total Calls</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#1db874]" />Connected</span>
            </div>
          </div>

          {filteredCalls.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No call activity is available for this date range.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <svg viewBox="0 0 640 220" className="h-[260px] w-full">
                {[0, 1, 2, 3].map((lineIndex) => {
                  const y = 30 + lineIndex * 45
                  return (
                    <line key={lineIndex} x1="40" y1={y} x2="600" y2={y} stroke="#dfe7f5" strokeDasharray="4 6" />
                  )
                })}

                {activityChart.labels.map((label, index) => {
                  const x = 60 + (index * (520 / Math.max(1, activityChart.labels.length)))
                  return (
                    <g key={`${label}-${index}`}>
                      <line x1={x} y1="30" x2={x} y2="180" stroke="#e2e8f0" />
                      <text x={x} y="200" fontSize="10" textAnchor="middle" fill="#64748b">
                        {label.length > 8 ? label.slice(0, 6) : label}
                      </text>
                    </g>
                  )
                })}

                {activityChart.totals.map((total, index) => {
                  const x = 60 + (index * (520 / Math.max(1, activityChart.totals.length)))
                  const barWidth = Math.max(10, 520 / Math.max(1, activityChart.totals.length) * 0.45)
                  const totalHeight = (total / maxChartValue) * 120
                  const connectedHeight = (activityChart.connected[index] / maxChartValue) * 120

                  return (
                    <g key={`bar-${index}`}>
                      <rect x={x - barWidth / 2} y={180 - totalHeight} width={barWidth / 2} height={totalHeight} fill="#3568C8" rx="4" />
                      <rect x={x} y={180 - connectedHeight} width={barWidth / 2} height={connectedHeight} fill="#1db874" rx="4" />
                    </g>
                  )
                })}
              </svg>
            </div>
          )}
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Lead Conversion</h2>
              <p className="text-sm text-slate-500">Current pipeline distribution across active leads</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {activeLeads.length} active leads
            </span>
          </div>

          <div className="space-y-4">
            {funnelStatusCounts.map(({ status, count, percent }) => (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{status}</span>
                  <span className="text-slate-500">{count} ({percent.toFixed(0)}%)</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={[
                      status === 'New Lead' ? 'bg-sky-500' :
                      status === 'Contacted' ? 'bg-violet-500' :
                      status === 'Interested' ? 'bg-emerald-500' :
                      status === 'Follow-up' ? 'bg-orange-500' :
                      'bg-indigo-500',
                      'block h-full rounded-full',
                    ].join(' ')}
                    style={{ width: `${Math.max(5, percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Lead Sources</h2>
            <p className="text-sm text-slate-500">Current source mix across active leads</p>
          </div>

          {sourceBreakdown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No source tracking data is available yet. Populate at least one source value to view the breakdown.
            </div>
          ) : (
            <div className="space-y-4">
              {sourceBreakdown.map(({ source, count, percent }) => (
                <div key={source}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{source}</span>
                    <span className="text-slate-500">{count} ({percent.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#3568C8]" style={{ width: `${Math.max(4, percent)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Follow-up Overview</h2>
              <p className="text-sm text-slate-500">Current follow-up workload and due dates</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('Follow-ups')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Open Follow-ups
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Due Today', value: followUpSummary.dueToday, accent: 'bg-[#edf4ff] text-[#3568C8]' },
              { label: 'Upcoming', value: followUpSummary.upcoming, accent: 'bg-[#ebfaf2] text-[#1b9d5a]' },
              { label: 'Overdue', value: followUpSummary.overdue, accent: 'bg-[#fff5ea] text-[#d77a1d]' },
              { label: 'Completed', value: followUpSummary.completed, accent: 'bg-[#f2efff] text-[#6048d9]' },
            ].map(({ label, value, accent }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
                  <Clock3 className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Telecaller Performance</h2>
            <p className="text-sm text-slate-500">Organisation of assigned leads and call outcomes</p>
          </div>
        </div>

        {telecallerRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No telecaller assignment data is available yet. Leads need an assigned telecaller to populate this table.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Telecaller</th>
                  <th className="px-4 py-3">Assigned Leads</th>
                  <th className="px-4 py-3">Calls Made</th>
                  <th className="px-4 py-3">Connected Calls</th>
                  <th className="px-4 py-3">Pending Follow-ups</th>
                  <th className="px-4 py-3">Converted Leads</th>
                  <th className="px-4 py-3">Connection Rate</th>
                </tr>
              </thead>
              <tbody>
                {telecallerRows.map((row) => (
                  <tr key={row.telecaller} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.telecaller}</td>
                    <td className="px-4 py-3">{row.assignedLeads}</td>
                    <td className="px-4 py-3">{row.calls}</td>
                    <td className="px-4 py-3">{row.connected}</td>
                    <td className="px-4 py-3">{row.pending}</td>
                    <td className="px-4 py-3">{row.converted}</td>
                    <td className="px-4 py-3">{row.calls > 0 ? `${row.connectionRate.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
            <p className="text-sm text-slate-500">Latest sales and follow-up events from CRM data</p>
          </div>
        </div>

        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No recent activity is available. Add leads, log calls or create follow-ups to populate this feed.
            </div>
          ) : (
            recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    item.type === 'Call' ? 'bg-[#edf4ff] text-[#3568C8]' :
                    item.type === 'Follow-up' ? 'bg-[#ebfaf2] text-[#1b9d5a]' : 'bg-[#f2efff] text-[#6048d9]'
                  }`}>
                    {item.type === 'Call' ? <PhoneCall className="h-4 w-4" /> : item.type === 'Follow-up' ? <Clock3 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.type} • {new Date(item.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{item.description}</span>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.page)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    View
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        <span>Last refreshed: {refreshStamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span>{range === 'custom' ? 'Custom date range in use' : 'Range filter applied'}</span>
      </div>
    </div>
  )
}
