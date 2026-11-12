import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  formatDateLabel,
  formatTimeLabel,
  getFollowUpDisplayStatus,
  type CallRecord,
  type FollowUpRecord,
} from '../data/crmStorage'
import { leadSourceOptions, leadStatusOptions, type Lead, type LeadStatus } from '../data/leads'
import { CallOutcomeBadge } from './CallOutcomeBadge'
import { StatusBadge } from './StatusBadge'

export type ReportType =
  | 'Lead Report'
  | 'Call Activity Report'
  | 'Follow-up Report'
  | 'Conversion Report'
  | 'Telecaller Performance Report'

type DatePreset = 'today' | '7d' | '30d' | 'month' | 'all'

type SortDirection = 'asc' | 'desc'

interface ReportsPageProps {
  leads: Lead[]
  callRecords: CallRecord[]
  followUps: FollowUpRecord[]
  globalSearch?: string
  onGlobalSearchChange?: (value: string) => void
  onOpenLead: (leadId: number) => void
}

function parseDate(value?: string) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function getPresetRange(preset: DatePreset, referenceDate = new Date()) {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 23, 59, 59, 999)

  if (preset === 'today') {
    return { start: today, end }
  }

  if (preset === '7d') {
    const start = new Date(today)
    start.setDate(today.getDate() - 6)
    return { start, end }
  }

  if (preset === '30d') {
    const start = new Date(today)
    start.setDate(today.getDate() - 29)
    return { start, end }
  }

  if (preset === 'month') {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end: monthEnd }
  }

  return { start: null, end: null }
}

function inRange(dateValue: string | undefined, start: Date | null, end: Date | null) {
  const parsedDate = parseDate(dateValue)
  if (!parsedDate) {
    return start === null && end === null
  }

  if (start && parsedDate < start) {
    return false
  }

  if (end && parsedDate > end) {
    return false
  }

  return true
}

function exportCsv(rows: Array<Record<string, string | number | boolean | null | undefined>>, fileName: string) {
  if (!rows.length) {
    return false
  }

  const headers = Object.keys(rows[0])
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          const raw = String(value ?? '')
          const escaped = raw.replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(','),
    ),
  ].join('\n')

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
  return true
}

function getLeadStatusSummary(leads: Lead[]) {
  const totals = new Map<LeadStatus, number>()
  leadStatusOptions.forEach((status) => totals.set(status, 0))

  leads.forEach((lead) => {
    totals.set(lead.status, (totals.get(lead.status) ?? 0) + 1)
  })

  return Array.from(totals.entries()).map(([status, count]) => ({ status, count }))
}

export function ReportsPage({ leads, callRecords, followUps, globalSearch = '', onGlobalSearchChange, onOpenLead }: ReportsPageProps) {
  const [reportType, setReportType] = useState<ReportType>('Lead Report')
  const [datePreset, setDatePreset] = useState<DatePreset>('30d')
  const [searchTerm, setSearchTerm] = useState(globalSearch)
  const [statusFilter, setStatusFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [outcomeFilter, setOutcomeFilter] = useState('All')
  const [telecallerFilter, setTelecallerFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [sortKey, setSortKey] = useState<string>('createdDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [notice, setNotice] = useState<string | null>(null)
  const [refreshStamp, setRefreshStamp] = useState(() => new Date())
  const activeSearch = globalSearch || searchTerm

  const activeLeads = useMemo(() => leads.filter((lead) => !lead.isDeleted), [leads])
  const range = useMemo(() => getPresetRange(datePreset), [datePreset])

  const dateFilteredLeads = useMemo(() => {
    return activeLeads.filter((lead) => {
      const leadDate = lead.dateAdded ?? lead.lastContact
      return inRange(leadDate, range.start, range.end)
    })
  }, [activeLeads, range.end, range.start])

  const dateFilteredCalls = useMemo(() => {
    return callRecords.filter((record) => inRange(record.callDate, range.start, range.end))
  }, [callRecords, range.end, range.start])

  const dateFilteredFollowUps = useMemo(() => {
    return followUps.filter((item) => inRange(item.followUpDate, range.start, range.end))
  }, [followUps, range.end, range.start])

  const telecallerList = useMemo(() => {
    const values = new Set<string>()
    activeLeads.forEach((lead) => {
      const telecaller = (lead.assignedTo || 'Unassigned').trim() || 'Unassigned'
      if (telecaller) values.add(telecaller)
    })
    return Array.from(values).sort((left, right) => left.localeCompare(right))
  }, [activeLeads])

  const leadRows = useMemo(() => {
    const lowerSearch = activeSearch.trim().toLowerCase()

    return dateFilteredLeads.filter((lead) => {
      const matchesSearch =
        !lowerSearch ||
        lead.name.toLowerCase().includes(lowerSearch) ||
        lead.phone.toLowerCase().includes(lowerSearch) ||
        (lead.email ?? '').toLowerCase().includes(lowerSearch) ||
        (lead.company ?? '').toLowerCase().includes(lowerSearch)

      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter
      const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter
      const matchesTelecaller = telecallerFilter === 'All' || (lead.assignedTo || 'Unassigned') === telecallerFilter

      return matchesSearch && matchesStatus && matchesSource && matchesTelecaller
    })
  }, [activeSearch, dateFilteredLeads, sourceFilter, statusFilter, telecallerFilter])

  const callRows = useMemo(() => {
    const lowerSearch = activeSearch.trim().toLowerCase()

    return dateFilteredCalls.filter((record) => {
      const matchesSearch =
        !lowerSearch ||
        record.customerName.toLowerCase().includes(lowerSearch) ||
        record.phoneNumber.toLowerCase().includes(lowerSearch) ||
        record.discussionNotes.toLowerCase().includes(lowerSearch)

      const matchesOutcome = outcomeFilter === 'All' || record.callOutcome === outcomeFilter
      const matchedLead = leads.find((lead) => lead.id === record.leadId)
      const matchesTelecaller = telecallerFilter === 'All' || (matchedLead?.assignedTo || 'Unassigned') === telecallerFilter

      return matchesSearch && matchesOutcome && matchesTelecaller
    })
  }, [activeSearch, dateFilteredCalls, leads, outcomeFilter, telecallerFilter])

  const followUpRows = useMemo(() => {
    const lowerSearch = activeSearch.trim().toLowerCase()

    return dateFilteredFollowUps.filter((item) => {
      const displayStatus = getFollowUpDisplayStatus(item)
      const matchesSearch =
        !lowerSearch ||
        item.customerName.toLowerCase().includes(lowerSearch) ||
        item.phoneNumber.toLowerCase().includes(lowerSearch) ||
        (item.followUpNotes ?? '').toLowerCase().includes(lowerSearch)

      const matchesStatus = statusFilter === 'All' || displayStatus === statusFilter
      const matchedLead = leads.find((lead) => lead.id === item.leadId)
      const matchesTelecaller = telecallerFilter === 'All' || (matchedLead?.assignedTo || 'Unassigned') === telecallerFilter

      return matchesSearch && matchesStatus && matchesTelecaller
    })
  }, [activeSearch, dateFilteredFollowUps, leads, statusFilter, telecallerFilter])

  const conversionRows = useMemo(() => {
    const lowerSearch = activeSearch.trim().toLowerCase()

    return dateFilteredLeads.filter((lead) => {
      const matchesSearch =
        !lowerSearch ||
        lead.name.toLowerCase().includes(lowerSearch) ||
        lead.phone.toLowerCase().includes(lowerSearch) ||
        (lead.company ?? '').toLowerCase().includes(lowerSearch)

      const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter
      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter
      const matchesTelecaller = telecallerFilter === 'All' || (lead.assignedTo || 'Unassigned') === telecallerFilter

      return matchesSearch && matchesSource && matchesStatus && matchesTelecaller
    })
  }, [activeSearch, dateFilteredLeads, sourceFilter, statusFilter, telecallerFilter])

  const telecallerRows = useMemo(() => {
    const groups = new Map<string, { assignedLeads: number; calls: number; connected: number; pending: number; converted: number }>()

    dateFilteredLeads.forEach((lead) => {
      const telecaller = lead.assignedTo?.trim() || 'Unassigned'
      const current = groups.get(telecaller) ?? { assignedLeads: 0, calls: 0, connected: 0, pending: 0, converted: 0 }
      current.assignedLeads += 1
      if (lead.status === 'Converted') {
        current.converted += 1
      }
      groups.set(telecaller, current)
    })

    dateFilteredCalls.forEach((record) => {
      const lead = leads.find((item) => item.id === record.leadId)
      const telecaller = lead?.assignedTo?.trim() || 'Unassigned'
      const current = groups.get(telecaller) ?? { assignedLeads: 0, calls: 0, connected: 0, pending: 0, converted: 0 }
      current.calls += 1
      if (record.callOutcome === 'Connected') {
        current.connected += 1
      }
      groups.set(telecaller, current)
    })

    dateFilteredFollowUps.forEach((item) => {
      const lead = leads.find((entry) => entry.id === item.leadId)
      const telecaller = lead?.assignedTo?.trim() || 'Unassigned'
      const current = groups.get(telecaller) ?? { assignedLeads: 0, calls: 0, connected: 0, pending: 0, converted: 0 }
      if (item.status !== 'Cancelled' && item.status !== 'Completed') {
        current.pending += 1
      }
      groups.set(telecaller, current)
    })

    return Array.from(groups.entries())
      .map(([telecaller, values]) => ({
        telecaller,
        assignedLeads: values.assignedLeads,
        calls: values.calls,
        connected: values.connected,
        pending: values.pending,
        converted: values.converted,
        connectionRate: values.calls > 0 ? (values.connected / values.calls) * 100 : 0,
      }))
      .filter((row) => {
        const matchesSearch = !activeSearch.trim() || row.telecaller.toLowerCase().includes(activeSearch.trim().toLowerCase())
        const matchesTelecaller = telecallerFilter === 'All' || row.telecaller === telecallerFilter
        return matchesSearch && matchesTelecaller
      })
      .sort((left, right) => right.calls - left.calls)
  }, [activeSearch, dateFilteredCalls, dateFilteredFollowUps, dateFilteredLeads, leads, telecallerFilter])

  const currentTableRows = useMemo(() => {
    switch (reportType) {
      case 'Lead Report':
        return leadRows
      case 'Call Activity Report':
        return callRows
      case 'Follow-up Report':
        return followUpRows
      case 'Conversion Report':
        return conversionRows
      case 'Telecaller Performance Report':
        return telecallerRows
      default:
        return []
    }
  }, [callRows, conversionRows, followUpRows, leadRows, reportType, telecallerRows])

  const sortedRows = useMemo(() => {
    if (!currentTableRows.length) {
      return []
    }

    return [...currentTableRows].sort((left, right) => {
      const leftValue = (left as Record<string, string | number | boolean>)[sortKey] ?? ''
      const rightValue = (right as Record<string, string | number | boolean>)[sortKey] ?? ''

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue
      }

      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true })
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [currentTableRows, sortDirection, sortKey])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pagedRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const leadStatusSummary = useMemo(() => getLeadStatusSummary(dateFilteredLeads), [dateFilteredLeads])

  const callSummary = useMemo(() => {
    const total = dateFilteredCalls.length
    const connected = dateFilteredCalls.filter((record) => record.callOutcome === 'Connected').length
    const noAnswer = dateFilteredCalls.filter((record) => record.callOutcome === 'No Answer').length

    const groupedByDate = new Map<string, number>()
    dateFilteredCalls.forEach((record) => {
      const count = groupedByDate.get(record.callDate) ?? 0
      groupedByDate.set(record.callDate, count + 1)
    })

    return {
      total,
      connected,
      noAnswer,
      groupedByDate: Array.from(groupedByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((left, right) => left.date.localeCompare(right.date)),
    }
  }, [dateFilteredCalls])

  const followUpSummary = useMemo(() => {
    const nextResult = {
      dueToday: 0,
      upcoming: 0,
      overdue: 0,
      completed: 0,
      cancelled: 0,
    }

    dateFilteredFollowUps.forEach((item) => {
      const status = getFollowUpDisplayStatus(item)
      if (status === 'Due Today') nextResult.dueToday += 1
      if (status === 'Upcoming') nextResult.upcoming += 1
      if (status === 'Overdue') nextResult.overdue += 1
      if (status === 'Completed') nextResult.completed += 1
      if (item.status === 'Cancelled') nextResult.cancelled += 1
    })

    return nextResult
  }, [dateFilteredFollowUps])

  const conversionSummary = useMemo(() => {
    const converted = dateFilteredLeads.filter((lead) => lead.status === 'Converted').length
    const denominator = dateFilteredLeads.length || 1
    const conversionRate = (converted / denominator) * 100
    const statusBreakdown = getLeadStatusSummary(dateFilteredLeads)

    const sourceConversion = new Map<string, number>()
    dateFilteredLeads.forEach((lead) => {
      if (lead.status === 'Converted') {
        const source = lead.source || 'Unknown'
        sourceConversion.set(source, (sourceConversion.get(source) ?? 0) + 1)
      }
    })

    return {
      converted,
      conversionRate,
      statusBreakdown,
      sourceConversion: Array.from(sourceConversion.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((left, right) => right.count - left.count),
    }
  }, [dateFilteredLeads])

  const telecallerSummary = useMemo(() => {
    if (telecallerRows.length === 0) {
      return []
    }

    return telecallerRows
  }, [telecallerRows])

  const summaryCards = useMemo(() => {
    switch (reportType) {
      case 'Lead Report':
        return [
          { label: 'Total Active Leads', value: String(dateFilteredLeads.length), accent: 'bg-[#edf4ff] text-[#3568C8]' },
          { label: 'Interested', value: String(dateFilteredLeads.filter((lead) => lead.status === 'Interested').length), accent: 'bg-[#ebfaf2] text-[#1b9d5a]' },
          { label: 'Follow-up', value: String(dateFilteredLeads.filter((lead) => lead.status === 'Follow-up').length), accent: 'bg-[#fff5ea] text-[#d77a1d]' },
          { label: 'Converted', value: String(dateFilteredLeads.filter((lead) => lead.status === 'Converted').length), accent: 'bg-[#f2efff] text-[#6048d9]' },
        ]
      case 'Call Activity Report':
        return [
          { label: 'Total Calls', value: String(callSummary.total), accent: 'bg-[#edf4ff] text-[#3568C8]' },
          { label: 'Connected', value: String(callSummary.connected), accent: 'bg-[#ebfaf2] text-[#1b9d5a]' },
          { label: 'No Answer', value: String(callSummary.noAnswer), accent: 'bg-[#fff1f2] text-[#d95a66]' },
          { label: 'Date Points', value: String(callSummary.groupedByDate.length), accent: 'bg-[#fff7e6] text-[#ca8a04]' },
        ]
      case 'Follow-up Report':
        return [
          { label: 'Due Today', value: String(followUpSummary.dueToday), accent: 'bg-[#edf4ff] text-[#3568C8]' },
          { label: 'Upcoming', value: String(followUpSummary.upcoming), accent: 'bg-[#ebfaf2] text-[#1b9d5a]' },
          { label: 'Overdue', value: String(followUpSummary.overdue), accent: 'bg-[#fff5ea] text-[#d77a1d]' },
          { label: 'Completed', value: String(followUpSummary.completed), accent: 'bg-[#f2efff] text-[#6048d9]' },
        ]
      case 'Conversion Report':
        return [
          { label: 'Converted', value: String(conversionSummary.converted), accent: 'bg-[#edf4ff] text-[#3568C8]' },
          { label: 'Rate', value: `${conversionSummary.conversionRate.toFixed(1)}%`, accent: 'bg-[#ebfaf2] text-[#1b9d5a]' },
          { label: 'Active Leads', value: String(dateFilteredLeads.length), accent: 'bg-[#fff5ea] text-[#d77a1d]' },
          { label: 'Status Mix', value: String(conversionSummary.statusBreakdown.length), accent: 'bg-[#f2efff] text-[#6048d9]' },
        ]
      case 'Telecaller Performance Report':
        return [
          { label: 'Assigned Leads', value: String(telecallerSummary.reduce((sum, row) => sum + row.assignedLeads, 0)), accent: 'bg-[#edf4ff] text-[#3568C8]' },
          { label: 'Calls Made', value: String(telecallerSummary.reduce((sum, row) => sum + row.calls, 0)), accent: 'bg-[#ebfaf2] text-[#1b9d5a]' },
          { label: 'Connected', value: String(telecallerSummary.reduce((sum, row) => sum + row.connected, 0)), accent: 'bg-[#fff5ea] text-[#d77a1d]' },
          { label: 'Connection Rate', value: telecallerSummary.length ? `${(telecallerSummary.reduce((sum, row) => sum + row.connected, 0) / Math.max(1, telecallerSummary.reduce((sum, row) => sum + row.calls, 0))) * 100}`.slice(0, 5) + '%' : '0%', accent: 'bg-[#f2efff] text-[#6048d9]' },
        ]
      default:
        return []
    }
  }, [callSummary, conversionSummary, dateFilteredLeads, followUpSummary, reportType, telecallerSummary])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('All')
    setSourceFilter('All')
    setOutcomeFilter('All')
    setTelecallerFilter('All')
    setPage(1)
  }

  const handleExportCurrentReport = () => {
    const csvRows: Array<Record<string, string | number | boolean | null | undefined>> = []

    if (reportType === 'Lead Report') {
      leadRows.forEach((lead) => {
        csvRows.push({
          customerName: lead.name,
          phone: lead.phone,
          email: lead.email ?? '',
          source: lead.source,
          status: lead.status,
          assignedTo: lead.assignedTo || 'Unassigned',
          createdDate: lead.dateAdded ?? lead.lastContact,
          company: lead.company ?? '',
        })
      })

      const exported = exportCsv(csvRows, 'solarcrm-lead-report.csv')
      setNotice(exported ? `Exported ${csvRows.length} lead row(s).` : 'No lead data to export.')
      return
    }

    if (reportType === 'Call Activity Report') {
      callRows.forEach((record) => {
        csvRows.push({
          customerName: record.customerName,
          phoneNumber: record.phoneNumber,
          callDate: record.callDate,
          callTime: record.callTime,
          callOutcome: record.callOutcome,
          discussionNotes: record.discussionNotes,
          followUpDate: record.followUpDate ?? '',
          followUpTime: record.followUpTime ?? '',
          leadId: record.leadId,
        })
      })

      const exported = exportCsv(csvRows, 'solarcrm-call-activity-report.csv')
      setNotice(exported ? `Exported ${csvRows.length} call row(s).` : 'No call activity to export.')
      return
    }

    if (reportType === 'Follow-up Report') {
      followUpRows.forEach((item) => {
        csvRows.push({
          customerName: item.customerName,
          phoneNumber: item.phoneNumber,
          followUpDate: item.followUpDate,
          followUpTime: item.followUpTime,
          followUpNotes: item.followUpNotes,
          status: getFollowUpDisplayStatus(item),
          reminder: Boolean(item.reminder),
        })
      })

      const exported = exportCsv(csvRows, 'solarcrm-follow-up-report.csv')
      setNotice(exported ? `Exported ${csvRows.length} follow-up row(s).` : 'No follow-up data to export.')
      return
    }

    if (reportType === 'Conversion Report') {
      conversionRows.forEach((lead) => {
        csvRows.push({
          customerName: lead.name,
          phone: lead.phone,
          source: lead.source,
          status: lead.status,
          assignedTo: lead.assignedTo || 'Unassigned',
          conversionRate: lead.status === 'Converted' ? 'Converted' : 'Open',
        })
      })

      const exported = exportCsv(csvRows, 'solarcrm-conversion-report.csv')
      setNotice(exported ? `Exported ${csvRows.length} conversion row(s).` : 'No conversion data to export.')
      return
    }

    if (reportType === 'Telecaller Performance Report') {
      telecallerRows.forEach((row) => {
        csvRows.push({
          telecaller: row.telecaller,
          assignedLeads: row.assignedLeads,
          callsMade: row.calls,
          connectedCalls: row.connected,
          pendingFollowUps: row.pending,
          convertedLeads: row.converted,
          connectionRate: `${row.connectionRate.toFixed(1)}%`,
        })
      })

      const exported = exportCsv(csvRows, 'solarcrm-telecaller-performance.csv')
      setNotice(exported ? `Exported ${csvRows.length} telecaller row(s).` : 'No telecaller data to export.')
      return
    }

    setNotice('No export data available for this report.')
  }

  const renderReportTable = () => {
    if (reportType === 'Lead Report') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50">
              <tr>
                {[
                  ['customerName', 'Customer'],
                  ['phone', 'Phone'],
                  ['email', 'Email'],
                  ['source', 'Source'],
                  ['status', 'Status'],
                  ['assignedTo', 'Telecaller'],
                  ['createdDate', 'Created'],
                ].map(([key, label]) => (
                  <th key={key} className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" onClick={() => handleSort(key)}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No lead records match the current report filters.
                  </td>
                </tr>
              ) : (
                pagedRows.map((lead: unknown) => {
                  const row = lead as Lead
                  return (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => onOpenLead(row.id)} className="text-left font-medium text-slate-800 hover:text-[#3568C8]">
                          {row.name}
                        </button>
                      </td>
                      <td className="px-4 py-3">{row.phone}</td>
                      <td className="px-4 py-3">{row.email || '—'}</td>
                      <td className="px-4 py-3">{row.source}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">{row.assignedTo || 'Unassigned'}</td>
                      <td className="px-4 py-3">{formatDateLabel(row.dateAdded ?? row.lastContact)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (reportType === 'Call Activity Report') {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Calls by Date</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {callSummary.groupedByDate.length === 0 ? (
                <div className="text-sm text-slate-500">No calls in this period.</div>
              ) : (
                callSummary.groupedByDate.slice(0, 8).map(({ date, count }) => (
                  <div key={date} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.1em] text-slate-400">{date}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800">{count}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    ['customerName', 'Customer'],
                    ['phoneNumber', 'Phone'],
                    ['callDate', 'Date'],
                    ['callTime', 'Time'],
                    ['callOutcome', 'Outcome'],
                    ['discussionNotes', 'Notes'],
                  ].map(([key, label]) => (
                    <th key={key} className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" onClick={() => handleSort(key)}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      No call records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((record: unknown) => {
                    const row = record as CallRecord
                    return (
                      <tr key={row.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.customerName}</td>
                        <td className="px-4 py-3">{row.phoneNumber}</td>
                        <td className="px-4 py-3">{formatDateLabel(row.callDate)}</td>
                        <td className="px-4 py-3">{formatTimeLabel(row.callTime)}</td>
                        <td className="px-4 py-3"><CallOutcomeBadge outcome={row.callOutcome} /></td>
                        <td className="px-4 py-3">{row.discussionNotes || '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (reportType === 'Follow-up Report') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50">
              <tr>
                {[
                  ['customerName', 'Customer'],
                  ['phoneNumber', 'Phone'],
                  ['followUpDate', 'Date'],
                  ['followUpTime', 'Time'],
                  ['followUpNotes', 'Notes'],
                  ['status', 'Status'],
                ].map(([key, label]) => (
                  <th key={key} className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" onClick={() => handleSort(key)}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No follow-up records match the current filters.
                  </td>
                </tr>
              ) : (
                pagedRows.map((item: unknown) => {
                  const row = item as FollowUpRecord
                  const followUpStatus = getFollowUpDisplayStatus(row)
                  return (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.customerName}</td>
                      <td className="px-4 py-3">{row.phoneNumber}</td>
                      <td className="px-4 py-3">{formatDateLabel(row.followUpDate)}</td>
                      <td className="px-4 py-3">{formatTimeLabel(row.followUpTime)}</td>
                      <td className="px-4 py-3">{row.followUpNotes || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          followUpStatus === 'Overdue' ? 'bg-amber-50 text-amber-700' :
                          followUpStatus === 'Due Today' ? 'bg-blue-50 text-blue-700' :
                          followUpStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                          followUpStatus === 'Cancelled' ? 'bg-slate-100 text-slate-700' : 'bg-violet-50 text-violet-700'
                        }`}>
                          {followUpStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (reportType === 'Conversion Report') {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Status Breakdown</h3>
              <span className="text-sm text-slate-600">Denominator: {dateFilteredLeads.length || 0} active leads</span>
            </div>
            <div className="space-y-4">
              {leadStatusSummary.map(({ status, count }) => {
                const percent = dateFilteredLeads.length ? (count / dateFilteredLeads.length) * 100 : 0
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{status}</span>
                      <span className="text-slate-500">{count} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-[#3568C8]" style={{ width: `${Math.max(4, percent)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Source Conversion Mix</h3>
            {conversionSummary.sourceConversion.length === 0 ? (
              <p className="text-sm text-slate-500">No converted leads are available for the current date range.</p>
            ) : (
              <div className="space-y-3">
                {conversionSummary.sourceConversion.map(({ source, count }) => (
                  <div key={source}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{source}</span>
                      <span className="text-slate-500">{count}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-[#1b9d5a]" style={{ width: `${Math.max(6, (count / Math.max(1, conversionSummary.converted)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (reportType === 'Telecaller Performance Report') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50">
              <tr>
                {['telecaller', 'assignedLeads', 'calls', 'connected', 'pending', 'converted', 'connectionRate'].map((key) => (
                  <th key={key} className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" onClick={() => handleSort(key)}>
                    {key === 'telecaller' ? 'Telecaller' : key === 'assignedLeads' ? 'Assigned Leads' : key === 'calls' ? 'Calls Made' : key === 'connected' ? 'Connected Calls' : key === 'pending' ? 'Pending Follow-ups' : key === 'converted' ? 'Converted Leads' : 'Connection Rate'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No reliable telecaller assignment data is available for the selected filters.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row: unknown) => {
                  const item = row as {
                    telecaller: string
                    assignedLeads: number
                    calls: number
                    connected: number
                    pending: number
                    converted: number
                    connectionRate: number
                  }

                  return (
                    <tr key={item.telecaller} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.telecaller}</td>
                      <td className="px-4 py-3">{item.assignedLeads}</td>
                      <td className="px-4 py-3">{item.calls}</td>
                      <td className="px-4 py-3">{item.connected}</td>
                      <td className="px-4 py-3">{item.pending}</td>
                      <td className="px-4 py-3">{item.converted}</td>
                      <td className="px-4 py-3">{item.calls > 0 ? `${item.connectionRate.toFixed(1)}%` : '0.0%'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-6 print-surface">
      <div className="no-print flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3568C8]">Insights & Exports</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Analyse lead performance, call activity and follow-up productivity.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={datePreset}
            onChange={(event) => {
              setDatePreset(event.target.value as DatePreset)
              setPage(1)
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>

          <button
            type="button"
            onClick={() => setRefreshStamp(new Date())}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportCurrentReport}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3568C8] px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#2957ae]"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Print Summary
          </button>
        </div>
      </div>

      {notice && (
        <div className="no-print rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      <div className="no-print grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          'Lead Report',
          'Call Activity Report',
          'Follow-up Report',
          'Conversion Report',
          'Telecaller Performance Report',
        ].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setReportType(option as ReportType)
              setPage(1)
            }}
            className={[
              'rounded-2xl border px-3 py-3 text-left text-sm font-medium transition',
              reportType === option
                ? 'border-[#3568C8] bg-[#edf4ff] text-[#3568C8] shadow-[inset_0_0_0_1px_rgba(53,104,200,0.08)]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            ].join(' ')}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, accent }) => (
          <div key={label} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-[27px] font-semibold tracking-[-0.04em] text-slate-900">{value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
                <CalendarRange className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="no-print rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center gap-2 text-slate-700">
          <SlidersHorizontal className="h-4 w-4 text-[#3568C8]" />
          <h2 className="text-lg font-semibold text-slate-900">Report Filters</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={activeSearch}
              onChange={(event) => {
                const nextValue = event.target.value
                setSearchTerm(nextValue)
                onGlobalSearchChange?.(nextValue)
                setPage(1)
              }}
              placeholder="Search customer or phone"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/15"
            />
          </div>

          {(reportType === 'Lead Report' || reportType === 'Conversion Report') && (
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
            >
              <option value="All">All Status</option>
              {leadStatusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          )}

          {(reportType === 'Lead Report' || reportType === 'Conversion Report') && (
            <select
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
            >
              <option value="All">All Sources</option>
              {leadSourceOptions.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          )}

          {reportType === 'Call Activity Report' && (
            <select
              value={outcomeFilter}
              onChange={(event) => {
                setOutcomeFilter(event.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
            >
              <option value="All">All Outcomes</option>
              {['Connected', 'No Answer', 'Busy', 'Switched Off', 'Call Back Requested', 'Not Interested'].map((outcome) => (
                <option key={outcome} value={outcome}>{outcome}</option>
              ))}
            </select>
          )}

          {(reportType === 'Follow-up Report' || reportType === 'Lead Report' || reportType === 'Call Activity Report' || reportType === 'Conversion Report' || reportType === 'Telecaller Performance Report') && telecallerList.length > 0 && (
            <select
              value={telecallerFilter}
              onChange={(event) => {
                setTelecallerFilter(event.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
            >
              <option value="All">All Telecallers</option>
              {telecallerList.map((telecaller) => (
                <option key={telecaller} value={telecaller}>{telecaller}</option>
              ))}
            </select>
          )}

          {reportType === 'Follow-up Report' && (
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
            >
              <option value="All">All Status</option>
              {['Due Today', 'Upcoming', 'Overdue', 'Completed', 'Cancelled'].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleClearFilters}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{reportType}</h2>
            <p className="text-sm text-slate-500">Showing {sortedRows.length} filtered result(s) for {datePreset === 'all' ? 'all time' : datePreset === 'today' ? 'today' : datePreset === '7d' ? 'last 7 days' : datePreset === '30d' ? 'last 30 days' : 'this month'}</p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Rows</label>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:ring-2 focus:ring-[#3568C8]/15"
            >
              {[5, 8, 10, 15, 20].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        {renderReportTable()}

        {sortedRows.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-500">
              Showing {Math.min((safePage - 1) * pageSize + 1, sortedRows.length)} - {Math.min(safePage * pageSize, sortedRows.length)} of {sortedRows.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="text-sm text-slate-600">Page {safePage} of {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={safePage === pageCount}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="print-only hidden">
        <h1>SolarCRM Report Summary</h1>
        <p>Report Type: {reportType}</p>
        <p>Period: {datePreset === 'all' ? 'All Time' : datePreset === 'today' ? 'Today' : datePreset === '7d' ? 'Last 7 Days' : datePreset === '30d' ? 'Last 30 Days' : 'This Month'}</p>
        <p>Generated: {refreshStamp.toLocaleString()}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {summaryCards.map(({ label, value }) => (
            <div key={label} className="rounded border p-3">
              <p>{label}</p>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
