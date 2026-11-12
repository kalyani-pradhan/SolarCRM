import { CalendarRange, Download, FileText, Filter, PhoneCall, RefreshCcw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { formatDateLabel, formatTimeLabel, type CallOutcome, type CallRecord } from '../data/crmStorage'
import type { Lead } from '../data/leads'
import { CallDetailsModal } from './CallDetailsModal'
import { CallOutcomeBadge } from './CallOutcomeBadge'

interface CallLogsPageProps {
  callRecords: CallRecord[]
  leads: Lead[]
  followUps: Array<{ id: number; leadId: number; status: string; followUpDate: string; followUpTime: string }>
  globalSearch?: string
  onGlobalSearchChange?: (value: string) => void
  onOpenLead: (leadId: number) => void
  onLogCall: (lead: Lead) => void
}

const outcomeOptions: Array<'All' | CallOutcome> = [
  'All',
  'Connected',
  'No Answer',
  'Busy',
  'Switched Off',
  'Call Back Requested',
  'Not Interested',
]

function parseDate(value: string) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function dateMatchesPreset(record: CallRecord, preset: string, referenceDate = new Date()) {
  const recordDate = new Date(`${record.callDate}T${record.callTime || '00:00'}`)

  if (Number.isNaN(recordDate.getTime())) {
    return false
  }

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (preset === 'today') {
    return recordDate >= today && recordDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
  }

  if (preset === '7d') {
    const start = new Date(today)
    start.setDate(today.getDate() - 6)
    return recordDate >= start && recordDate <= new Date(today.getTime() + 24 * 60 * 60 * 1000)
  }

  if (preset === '30d') {
    const start = new Date(today)
    start.setDate(today.getDate() - 29)
    return recordDate >= start && recordDate <= new Date(today.getTime() + 24 * 60 * 60 * 1000)
  }

  if (preset === 'yesterday') {
    return recordDate >= yesterday && recordDate < today
  }

  return true
}

function escapeCsvValue(value: string | number | null | undefined) {
  const raw = String(value ?? '')
  const escaped = raw.replace(/"/g, '""')
  return `"${escaped}"`
}

export function CallLogsPage({ callRecords, leads, followUps, globalSearch = '', onGlobalSearchChange, onOpenLead, onLogCall }: CallLogsPageProps) {
  const [searchTerm, setSearchTerm] = useState(globalSearch)
  const [outcomeFilter, setOutcomeFilter] = useState<'All' | CallOutcome>('All')
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7d' | '30d' | 'yesterday'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date())
  const activeSearch = globalSearch || searchTerm

  const leadMap = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads])

  const summary = useMemo(() => {
    const connected = callRecords.filter((record) => record.callOutcome === 'Connected').length
    const noAnswer = callRecords.filter((record) => record.callOutcome === 'No Answer').length
    const scheduledFollowUpKeys = new Set(
      callRecords
        .filter((record) => Boolean(record.followUpDate || record.followUpTime))
        .map(
          (record) => `${record.leadId}|${record.followUpDate ?? ''}|${record.followUpTime ?? ''}`,
        ),
    )

    followUps
      .filter((followUp) => followUp.status !== 'Cancelled')
      .forEach((followUp) => {
        scheduledFollowUpKeys.add(`${followUp.leadId}|${followUp.followUpDate}|${followUp.followUpTime}`)
      })

    return {
      total: callRecords.length,
      connected,
      followUpsScheduled: scheduledFollowUpKeys.size,
      noAnswer,
    }
  }, [callRecords, followUps])

  const filteredRecords = useMemo(() => {
    const lowerSearch = activeSearch.trim().toLowerCase()

    return callRecords.filter((record) => {
      const lead = leadMap.get(record.leadId)
      const matchesSearch =
        !lowerSearch ||
        record.customerName.toLowerCase().includes(lowerSearch) ||
        record.phoneNumber.toLowerCase().includes(lowerSearch) ||
        (record.telecallerName ?? '').toLowerCase().includes(lowerSearch) ||
        (lead?.company ?? '').toLowerCase().includes(lowerSearch)

      const matchesOutcome = outcomeFilter === 'All' || record.callOutcome === outcomeFilter

      const recordDate = parseDate(record.callDate)
      let matchesDate = true

      if (datePreset !== 'all') {
        matchesDate = dateMatchesPreset(record, datePreset)
      }

      if (startDate || endDate) {
        const start = parseDate(startDate)
        const end = parseDate(endDate)

        if (start && recordDate) {
          matchesDate = recordDate >= start
        }

        if (end && recordDate) {
          matchesDate = matchesDate && recordDate <= end
        }
      }

      return matchesSearch && matchesOutcome && matchesDate
    })
  }, [activeSearch, callRecords, datePreset, endDate, leadMap, outcomeFilter, startDate])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRecords = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize)

  const handleClearFilters = () => {
    setSearchTerm('')
    setOutcomeFilter('All')
    setDatePreset('all')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const handleExportCsv = () => {
    if (!filteredRecords.length) {
      setNotice('No filtered call records to export.')
      window.setTimeout(() => setNotice(null), 2200)
      return
    }

    const headers = ['customerName', 'phoneNumber', 'telecallerName', 'callDate', 'callTime', 'callOutcome', 'discussionNotes', 'followUpDate', 'followUpTime', 'followUpNotes', 'reminder', 'leadId']
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map((record) =>
        headers
          .map((header) => {
            const value = record[header as keyof CallRecord]
            return escapeCsvValue(
              typeof value === 'boolean' ? (value ? 'true' : 'false') : value,
            )
          })
          .join(','),
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'solarcrm-call-logs.csv'
    anchor.click()
    URL.revokeObjectURL(url)

    setNotice(`Exported ${filteredRecords.length} filtered call record(s).`)
    window.setTimeout(() => setNotice(null), 2200)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3568C8]">Call Centre</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-slate-900">Call Logs</h1>
          <p className="mt-1 text-sm text-slate-500">Review customer conversations, call outcomes and follow-up activity.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <select
            value={datePreset}
            onChange={(event) => {
              setDatePreset(event.target.value as typeof datePreset)
              setPage(1)
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="yesterday">Yesterday</option>
          </select>

          <button
            type="button"
            onClick={() => setLastSyncedAt(new Date())}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Calls', value: String(summary.total), accent: 'bg-[#edf4ff] text-[#3568C8]' },
          { label: 'Connected Calls', value: String(summary.connected), accent: 'bg-[#ebfaf2] text-[#1b9d5a]' },
          { label: 'Follow-ups Scheduled', value: String(summary.followUpsScheduled), accent: 'bg-[#fff4e6] text-[#d06d2c]' },
          { label: 'No Answer', value: String(summary.noAnswer), accent: 'bg-[#fff1f2] text-[#d95b64]' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
              <PhoneCall className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={activeSearch}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setSearchTerm(nextValue)
                  onGlobalSearchChange?.(nextValue)
                  setPage(1)
                }}
                placeholder="Search by customer or phone"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:bg-white"
              />
            </label>

            <select
              value={outcomeFilter}
              onChange={(event) => {
                setOutcomeFilter(event.target.value as 'All' | CallOutcome)
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:bg-white"
            >
              {outcomeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'All' ? 'All Outcomes' : option}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  setPage(1)
                }}
                className="bg-transparent text-sm text-slate-700 outline-none"
                aria-label="Start date"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value)
                  setPage(1)
                }}
                className="bg-transparent text-sm text-slate-700 outline-none"
                aria-label="End date"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            Clear Filters
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filteredRecords.length}</span> filtered call(s) • Last refreshed {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Telecaller</th>
                <th className="px-4 py-3">Call Date</th>
                <th className="px-4 py-3">Call Time</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Discussion Notes</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {pageRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText className="h-10 w-10 text-slate-300" />
                      <div>
                        <p className="text-base font-medium text-slate-700">No calls found</p>
                        <p className="text-sm text-slate-500">Try widening the filters or log a new call from the dashboard or leads page.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRecords.map((record) => {
                  const associatedLead = leadMap.get(record.leadId) ?? null
                  const previewNotes = record.discussionNotes ? `${record.discussionNotes.slice(0, 72)}${record.discussionNotes.length > 72 ? '…' : ''}` : '—'
                  const followUpLabel = record.followUpDate || record.followUpTime
                    ? `${record.followUpDate ? formatDateLabel(record.followUpDate) : '—'}${record.followUpTime ? ` • ${formatTimeLabel(record.followUpTime)}` : ''}`
                    : 'No follow-up'

                  return (
                    <tr key={record.id} className="border-t border-slate-200 align-top hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf4ff] text-[11px] font-semibold text-[#3568C8]">
                            {record.customerName
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase() ?? '')
                              .join('') || 'C'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{record.customerName}</p>
                            {associatedLead ? (
                              <button
                                type="button"
                                onClick={() => onOpenLead(associatedLead.id)}
                                className="mt-0.5 text-left text-[11px] font-medium text-[#3568C8] underline-offset-2 hover:underline"
                              >
                                Open lead
                              </button>
                            ) : (
                              <span className="mt-0.5 block text-[11px] text-slate-400">Historical call</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{record.phoneNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{record.telecallerName || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateLabel(record.callDate)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTimeLabel(record.callTime)}</td>
                      <td className="px-4 py-3">
                        <CallOutcomeBadge outcome={record.callOutcome} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span title={record.discussionNotes || undefined} className="block max-w-[220px] truncate">
                          {previewNotes}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{followUpLabel}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            View Details
                          </button>
                          {associatedLead && (
                            <button
                              type="button"
                              onClick={() => onOpenLead(associatedLead.id)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Open Lead
                            </button>
                          )}
                          {associatedLead && (
                            <button
                              type="button"
                              onClick={() => onLogCall(associatedLead)}
                              className="rounded-lg border border-[#3568C8] bg-[#edf4ff] px-2.5 py-2 text-xs font-medium text-[#3568C8] transition hover:bg-[#ddeaff]"
                            >
                              Log Another Call
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>Total filtered records: {filteredRecords.length}</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none transition focus:border-[#3568C8]"
            >
              <option value={5}>5 per page</option>
              <option value={8}>8 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-100"
            >
              ‹
            </button>
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700">
              {safePage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-100"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      <CallDetailsModal
        record={selectedRecord}
        lead={selectedRecord ? leadMap.get(selectedRecord.leadId) ?? null : null}
        onClose={() => setSelectedRecord(null)}
        onOpenLead={(lead) => {
          setSelectedRecord(null)
          onOpenLead(lead.id)
        }}
      />
    </div>
  )
}
