import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  PencilLine,
  Plus,
  Search,
  Phone,
  ShieldAlert,
  Users,
} from 'lucide-react'

import { normalizePhoneNumber } from '../data/crmStorage'
import { leadSourceOptions, leadStatusOptions, type Lead, type LeadSource, type LeadStatus } from '../data/leads'
import { ActionMenu } from './ActionMenu'
import { LeadDetailsModal } from './LeadDetailsModal'
import { LeadFormModal } from './LeadFormModal'

interface LeadsManagementPageProps {
  leads: Lead[]
  callRecords: Array<{ id: number; leadId: number; customerName: string; phoneNumber: string }>
  followUps: Array<{ id: number; leadId: number; customerName: string; status: string; followUpDate: string; followUpTime: string }>
  teamMembers?: string[]
  globalSearch?: string
  onGlobalSearchChange?: (value: string) => void
  onLeadSave: (lead: Lead) => void
  onLeadDelete: (leadId: number) => void
  onLeadImport: (rows: Partial<Lead>[]) => void
  onLeadExport: (leadIds?: number[]) => void
  onBulkStatusChange: (leadIds: number[], status: LeadStatus) => void
  onBulkAssignTelecaller: (leadIds: number[], assignedTo: string) => void
  onLogCall: (lead: Lead) => void
}

type ImportPreviewRow = {
  name: string
  phone: string
  email?: string
  company?: string
  source: LeadSource
  assignedTo: string
  status: LeadStatus
  notes?: string
}

const PAGE_SIZE = 6

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

function getLeadStatusFromString(value?: string): LeadStatus {
  const normalized = (value ?? '').trim().toLowerCase()
  const statusMap: Record<string, LeadStatus> = {
    'new lead': 'New Lead',
    contacted: 'Contacted',
    interested: 'Interested',
    'follow-up': 'Follow-up',
    followup: 'Follow-up',
    converted: 'Converted',
    'not interested': 'Not Interested',
  }

  return statusMap[normalized] ?? 'New Lead'
}

function getLeadSourceFromString(value?: string): LeadSource {
  const normalized = (value ?? '').trim().toLowerCase()
  const sourceMap: Record<string, LeadSource> = {
    website: 'Website',
    facebook: 'Facebook',
    instagram: 'Instagram',
    'google ads': 'Google Ads',
    referral: 'Referral',
    'phone call': 'Phone Call',
    other: 'Other',
  }

  return sourceMap[normalized] ?? 'Other'
}

function matchesDateFilter(lead: Lead, dateFilter: string) {
  if (!lead.dateAdded) {
    return dateFilter === 'all'
  }

  const dateAdded = new Date(lead.dateAdded)
  if (Number.isNaN(dateAdded.getTime())) {
    return dateFilter === 'all'
  }

  const today = new Date()
  const diffInDays = Math.floor((today.getTime() - dateAdded.getTime()) / (1000 * 60 * 60 * 24))

  switch (dateFilter) {
    case '7d':
      return diffInDays <= 7
    case '30d':
      return diffInDays <= 30
    case '90d':
      return diffInDays <= 90
    default:
      return true
  }
}

export function LeadsManagementPage({
  leads,
  callRecords,
  followUps,
  teamMembers = ['Conditions'],
  globalSearch = '',
  onGlobalSearchChange,
  onLeadSave,
  onLeadDelete,
  onLeadImport,
  onLeadExport,
  onBulkStatusChange,
  onBulkAssignTelecaller,
  onLogCall,
}: LeadsManagementPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [search, setSearch] = useState(globalSearch)
  const [statusFilter, setStatusFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>('New Lead')
  const [bulkAssignee, setBulkAssignee] = useState('Conditions')
  const [showCreateLead, setShowCreateLead] = useState(false)

  useEffect(() => {
    if (!teamMembers.length) {
      return
    }

    setBulkAssignee((current) => {
      const cleanedCurrent = current.trim()
      if (cleanedCurrent && teamMembers.includes(cleanedCurrent)) {
        return cleanedCurrent
      }

      const preferredMember = teamMembers.find((member) => member && member.trim() && member.trim() !== 'Conditions') || teamMembers.find((member) => member && member.trim()) || 'Conditions'
      return preferredMember
    })
  }, [teamMembers])
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null)
  const [csvRows, setCsvRows] = useState<ImportPreviewRow[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)

  const activeSearch = globalSearch || search

  const activeLeads = useMemo(() => leads.filter((lead) => !lead.isDeleted), [leads])

  const filteredLeads = useMemo(() => {
    const lowerSearch = activeSearch.trim().toLowerCase()

    return activeLeads.filter((lead) => {
      const matchesSearch =
        !lowerSearch ||
        lead.name.toLowerCase().includes(lowerSearch) ||
        lead.phone.toLowerCase().includes(lowerSearch) ||
        (lead.company ?? '').toLowerCase().includes(lowerSearch)

      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter
      const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter
      const matchesDate = matchesDateFilter(lead, dateFilter)

      return matchesSearch && matchesStatus && matchesSource && matchesDate
    })
  }, [activeLeads, activeSearch, dateFilter, sourceFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const currentPageLeads = filteredLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const summaryCards = useMemo(
    () => [
      {
        label: 'Total leads',
        value: String(activeLeads.length),
        accent: 'bg-[#eaf2ff] text-[#3568C8]',
      },
      {
        label: 'Interested',
        value: String(activeLeads.filter((lead) => lead.status === 'Interested').length),
        accent: 'bg-[#edfaf3] text-[#229c66]',
      },
      {
        label: 'Follow-ups',
        value: String(activeLeads.filter((lead) => lead.status === 'Follow-up').length),
        accent: 'bg-[#fff1e6] text-[#d76f19]',
      },
      {
        label: 'Converted',
        value: String(activeLeads.filter((lead) => lead.status === 'Converted').length),
        accent: 'bg-[#eef5ff] text-[#355fc9]',
      },
    ],
    [activeLeads],
  )

  const handlePageChange = (nextPage: number) => setPage(Math.min(Math.max(1, nextPage), totalPages))

  const handleToggleLead = (leadId: number) => {
    setSelectedIds((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId],
    )
  }

  const handleSelectAll = () => {
    const nextIds = currentPageLeads.map((lead) => lead.id)
    const allSelected = nextIds.every((id) => selectedIds.includes(id))

    setSelectedIds((current) => {
      if (allSelected) {
        return current.filter((id) => !nextIds.includes(id))
      }

      return [...new Set([...current, ...nextIds])]
    })
  }

  const handleSaveLead = (lead: Lead) => {
    onLeadSave(lead)
    setSelectedIds((current) => current.filter((id) => id !== lead.id))
  }

  const handleBulkApplyStatus = () => {
    if (selectedIds.length === 0) {
      return
    }

    onBulkStatusChange(selectedIds, bulkStatus)
    setSelectedIds([])
  }

  const handleBulkAssign = () => {
    if (selectedIds.length === 0) {
      return
    }

    onBulkAssignTelecaller(selectedIds, bulkAssignee)
    setSelectedIds([])
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length < 2) {
        throw new Error('The CSV file must include a header row and at least one lead entry.')
      }

      const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase())
      const requiredKeys = ['name', 'phone']
      const missingHeaders = requiredKeys.filter((key) => !headers.some((header) => header.includes(key)))

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required CSV columns: ${missingHeaders.join(', ')}.`)
      }

      const parsedRows: ImportPreviewRow[] = []
      const normalizedHeaders = headers.map((header) => header.replace(/[^a-z]/g, ''))

      for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
        const values = parseCsvLine(lines[lineIndex])
        const row: Record<string, string> = {}

        normalizedHeaders.forEach((headerKey, headerIndex) => {
          row[headerKey] = values[headerIndex] ?? ''
        })

        const name = (row.name ?? row.customername ?? row.customer ?? '').trim()
        const phone = (row.phone ?? row.mobile ?? row.contact ?? '').trim()
        if (!name || !phone) {
          continue
        }

        const lead: ImportPreviewRow = {
          name,
          phone,
          email: (row.email ?? '').trim() || undefined,
          company: (row.company ?? row.business ?? '').trim() || undefined,
          source: getLeadSourceFromString(row.source ?? row.channel ?? 'Website'),
          assignedTo: (row.assignedto ?? row.assignee ?? row.telecaller ?? '').trim() || 'Conditions',
          status: getLeadStatusFromString(row.status ?? row.leadstatus ?? 'New Lead'),
          notes: (row.notes ?? row.comment ?? '').trim() || undefined,
        }

        parsedRows.push(lead)
      }

      if (parsedRows.length === 0) {
        throw new Error('No valid rows were detected in the CSV file.')
      }

      const duplicates = parsedRows.filter((row) => {
        const normalized = normalizePhoneNumber(row.phone)
        return activeLeads.some((lead) => normalizePhoneNumber(lead.phone) === normalized)
      })

      if (duplicates.length > 0) {
        setCsvError('Some imported rows already match existing leads and were skipped from the preview.')
      } else {
        setCsvError(null)
      }

      setCsvRows(parsedRows)
    } catch (error) {
      setCsvRows([])
      setCsvError(error instanceof Error ? error.message : 'Unable to parse this CSV file.')
    } finally {
      event.target.value = ''
    }
  }

  const commitCsvImport = () => {
    if (!csvRows.length) {
      return
    }

    onLeadImport(
      csvRows.map((row) => ({
        name: row.name,
        phone: row.phone,
        email: row.email,
        company: row.company,
        source: row.source,
        assignedTo: row.assignedTo,
        status: row.status,
        notes: row.notes,
      })),
    )
    setCsvRows([])
    setCsvError(null)
  }

  const handleDeleteLead = (leadId: number) => {
    const lead = activeLeads.find((item) => item.id === leadId)
    if (!lead) {
      return
    }

    if (window.confirm(`Delete ${lead.name}? This hides the lead from the active list while preserving call history.`)) {
      onLeadDelete(leadId)
      setSelectedIds((current) => current.filter((id) => id !== leadId))
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3568C8]">Leads management</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-800">Prospect pipeline</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateLead(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3568C8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2b57b1]"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Import CSV
            </button>

            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileImport} className="hidden" />

            <button
              type="button"
              onClick={() => onLeadExport(selectedIds.length > 0 ? selectedIds : undefined)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, accent }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        {csvRows.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">CSV preview ready</p>
                <p className="text-sm text-amber-700">
                  {csvRows.length} valid lead records were detected and are ready to import.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCsvRows([])
                    setCsvError(null)
                  }}
                  className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commitCsvImport}
                  className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
                >
                  Import {csvRows.length} Leads
                </button>
              </div>
            </div>
          </div>
        )}

        {csvError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {csvError}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row">
              <label className="relative block flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={activeSearch}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setSearch(nextValue)
                    onGlobalSearchChange?.(nextValue)
                    setPage(1)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
                  placeholder="Search by name, phone, company"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:bg-white"
              >
                <option value="All">All statuses</option>
                {leadStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={sourceFilter}
                onChange={(event) => {
                  setSourceFilter(event.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:bg-white"
              >
                <option value="All">All sources</option>
                {leadSourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:bg-white"
              >
                <option value="all">All dates</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('All')
                setSourceFilter('All')
                setDateFilter('all')
                setPage(1)
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <Filter className="h-4 w-4" />
              Clear filters
            </button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ShieldAlert className="h-4 w-4 text-[#3568C8]" />
                {selectedIds.length} lead(s) selected
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value as LeadStatus)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#3568C8]"
                >
                  {leadStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleBulkApplyStatus}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Apply status
                </button>

                <input
                  list="bulk-assignee-list"
                  value={bulkAssignee}
                  onChange={(event) => setBulkAssignee(event.target.value)}
                  className="min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#3568C8]"
                  placeholder="Assign to"
                />
                <datalist id="bulk-assignee-list">
                  {teamMembers.map((member) => (
                    <option key={member} value={member} />
                  ))}
                </datalist>

                <button
                  type="button"
                  onClick={handleBulkAssign}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Assign
                </button>

                <button
                  type="button"
                  onClick={() => onLeadExport(selectedIds)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Export selected
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={currentPageLeads.length > 0 && currentPageLeads.every((lead) => selectedIds.includes(lead.id))}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-[#3568C8] focus:ring-[#3568C8]"
                    />
                  </th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Last Contact</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPageLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      No leads match the current filters.
                    </td>
                  </tr>
                ) : (
                  currentPageLeads.map((lead) => (
                    <tr key={lead.id} className="border-t border-slate-200 align-middle hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => handleToggleLead(lead.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#3568C8] focus:ring-[#3568C8]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4ff] text-sm font-semibold text-[#3568C8]">
                            {lead.initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{lead.name}</p>
                            <p className="text-xs text-slate-500">{lead.company || 'No company'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.source}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.assignedTo || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.lastContact}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <ActionMenu
                            label={`More actions for ${lead.name}`}
                            buttonClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                            items={[
                              {
                                label: 'View details',
                                icon: <Eye className="h-4 w-4" />,
                                onSelect: () => setDetailsLead(lead),
                              },
                              {
                                label: 'Edit lead',
                                icon: <PencilLine className="h-4 w-4" />,
                                onSelect: () => setEditingLead(lead),
                              },
                              {
                                label: 'Log call',
                                icon: <Phone className="h-4 w-4" />,
                                onSelect: () => onLogCall(lead),
                              },
                              {
                                label: 'Archive lead',
                                icon: <Archive className="h-4 w-4 text-red-500" />,
                                destructive: true,
                                onSelect: () => handleDeleteLead(lead.id),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {filteredLeads.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length} leads
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-100"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700">
                {safePage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-100"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <LeadFormModal
        open={showCreateLead || Boolean(editingLead)}
        mode={editingLead ? 'edit' : 'create'}
        lead={editingLead}
        leads={activeLeads}
        teamMembers={teamMembers}
        onClose={() => {
          setShowCreateLead(false)
          setEditingLead(null)
        }}
        onSave={handleSaveLead}
      />

      <LeadDetailsModal
        lead={detailsLead}
        callRecords={callRecords as any[]}
        followUps={followUps as any[]}
        onClose={() => setDetailsLead(null)}
        onEdit={(lead) => {
          setEditingLead(lead)
          setDetailsLead(null)
        }}
        onLogCall={(lead) => {
          setDetailsLead(null)
          onLogCall(lead)
        }}
      />
    </>
  )
}
