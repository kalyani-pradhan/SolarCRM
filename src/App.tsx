import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Phone, PhoneCall, Users } from 'lucide-react'

import { CallLogsPage } from './components/CallLogsPage'
import { DashboardHeader } from './components/DashboardHeader'
import { FollowUpsPage } from './components/FollowUpsPage'
import { LeadDetailsModal } from './components/LeadDetailsModal'
import { LeadFormModal } from './components/LeadFormModal'
import { LeadsManagementPage } from './components/LeadsManagementPage'
import { LeadsTable } from './components/LeadsTable'
import { LogCallModal } from './components/LogCallModal'
import { OwnerAnalyticsPage } from './components/OwnerAnalyticsPage'
import { ReportsPage } from './components/ReportsPage'
import { Sidebar } from './components/Sidebar'
import { StatCard } from './components/StatCard'
import { TopNavbar } from './components/TopNavbar'
import {
  getLeadInitials,
  loadCallRecords,
  loadFollowUps,
  loadLeads,
  normalizePhoneNumber,
  saveCallRecords,
  saveFollowUps,
  saveLeads,
  type CallOutcome,
  type CallRecord,
  type FollowUpRecord,
  type LogCallPayload,
} from './data/crmStorage'
import { type Lead, type LeadStatus } from './data/leads'

const TEAM_STORAGE_KEY = 'solarcrm-team-members'

function normalizeTeamMember(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function loadTeamMembers() {
  if (typeof window === 'undefined') {
    return ['Conditions']
  }

  try {
    const saved = window.localStorage.getItem(TEAM_STORAGE_KEY)
    if (!saved) {
      return ['Conditions']
    }

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return ['Conditions']
    }

    return Array.from(new Set(parsed.map((member) => normalizeTeamMember(String(member))).filter(Boolean)))
  } catch {
    return ['Conditions']
  }
}

function resolveLeadStatus(currentStatus: LeadStatus, outcome: CallOutcome): LeadStatus {
  switch (outcome) {
    case 'Connected':
      return 'Contacted'
    case 'Call Back Requested':
      return 'Follow-up'
    case 'Not Interested':
      return 'Not Interested'
    default:
      return currentStatus
  }
}

interface TeamPageProps {
  teamMembers: string[]
  onAddTeamMember: (member: string) => void
  onRemoveTeamMember: (member: string) => void
}

function TeamPage({ teamMembers, onAddTeamMember, onRemoveTeamMember }: TeamPageProps) {
  const [newTeamMember, setNewTeamMember] = useState('')

  return (
    <div className="space-y-6">
      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3568C8]">Team</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-slate-900">Manage employees</h1>
        <p className="mt-1 text-sm text-slate-500">Add sales team members so they can be selected while logging calls and assigning leads.</p>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <form
          className="flex flex-col gap-3 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            onAddTeamMember(newTeamMember)
            setNewTeamMember('')
          }}
        >
          <input
            value={newTeamMember}
            onChange={(event) => setNewTeamMember(event.target.value)}
            placeholder="Add employee name"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3568C8] focus:bg-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#3568C8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d57b1]"
          >
            Add Employee
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teamMembers.map((member) => (
          <div key={member} className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Employee</p>
              <p className="mt-1 text-lg font-semibold text-slate-800">{member}</p>
            </div>
            {member !== 'Conditions' && (
              <button
                type="button"
                onClick={() => onRemoveTeamMember(member)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    const storedTheme = window.localStorage.getItem('solarcrm-theme')
    return storedTheme === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    window.localStorage.setItem('solarcrm-theme', theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const [collapsed, setCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [tableSearch, setTableSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [adjustmentMenuOpen, setAdjustmentMenuOpen] = useState(false)
  const [topbarSearch, setTopbarSearch] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [leads, setLeads] = useState<Lead[]>(() => loadLeads())
  const [callRecords, setCallRecords] = useState<CallRecord[]>(() => loadCallRecords())
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>(() => loadFollowUps())
  const [teamMembers, setTeamMembers] = useState<string[]>(() => loadTeamMembers())

  useEffect(() => {
    const mergedMembers = Array.from(
      new Set([
        'Conditions',
        ...teamMembers,
        ...leads.map((lead) => normalizeTeamMember(lead.assignedTo || '')).filter(Boolean),
      ]),
    )

    if (JSON.stringify(mergedMembers) !== JSON.stringify(teamMembers)) {
      setTeamMembers(mergedMembers)
    }
  }, [leads, teamMembers])

  useEffect(() => {
    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamMembers))
  }, [teamMembers])

  const filteredLeads = useMemo(() => {
    const normalizedSearch = normalizePhoneNumber(tableSearch).toLowerCase()

    return leads.filter((lead) => {
      if (lead.isDeleted) {
        return false
      }

      const matchesSearch =
        lead.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
        lead.phone.toLowerCase().includes(tableSearch.toLowerCase()) ||
        normalizePhoneNumber(lead.phone).includes(normalizedSearch)
      const matchesStatus = statusFilter === 'All Status' || lead.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [leads, statusFilter, tableSearch])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / 5))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageLeads = filteredLeads.slice((safeCurrentPage - 1) * 5, safeCurrentPage * 5)

  const handleSelectAll = () => {
    const nextIds = pageLeads.map((lead) => lead.id)
    const allSelected = nextIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !nextIds.includes(id)))
      return
    }

    setSelectedIds((current) => [...new Set([...current, ...nextIds])])
  }

  const handleToggleLead = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((leadId) => leadId !== id) : [...current, id],
    )
  }

  const handleSave = () => {
    setSaveNotice('Local preview updated. No server sync was performed.')
    window.setTimeout(() => setSaveNotice(null), 2000)
  }

  const handleTableSearchChange = (value: string) => {
    setTableSearch(value)
    setTopbarSearch(value)
    setCurrentPage(1)
  }

  const handleTopbarSearchChange = (value: string) => {
    const normalized = value
    setTopbarSearch(normalized)
    if (activeNav === 'Dashboard') {
      setTableSearch(normalized)
    }
    setCurrentPage(1)
  }

  const globalSearchResults = useMemo(() => {
    const normalized = topbarSearch.trim().toLowerCase()
    if (!normalized) {
      return []
    }

    const results: Array<{
      id: string
      type: 'Lead' | 'Call' | 'Follow-up'
      label: string
      secondary: string
      page: 'Leads' | 'Call Logs' | 'Follow-ups'
      leadId?: number
    }> = []

    leads
      .filter((lead) => !lead.isDeleted)
      .forEach((lead) => {
        const normalizedPhone = normalizePhoneNumber(lead.phone)
        const recordText = [
          lead.name,
          normalizedPhone,
          lead.phone,
          lead.email ?? '',
          lead.company ?? '',
          lead.source,
          lead.status,
        ]
          .join(' ')
          .toLowerCase()

        if (recordText.includes(normalized) || normalizedPhone.includes(normalized)) {
          results.push({
            id: `lead-${lead.id}`,
            type: 'Lead',
            label: lead.name,
            secondary: `${lead.phone} • ${lead.status}`,
            page: 'Leads',
            leadId: lead.id,
          })
        }
      })

    callRecords.forEach((record) => {
      const recordText = [record.customerName, record.phoneNumber, record.callOutcome, record.discussionNotes]
        .join(' ')
        .toLowerCase()

      if (recordText.includes(normalized)) {
        results.push({
          id: `call-${record.id}`,
          type: 'Call',
          label: record.customerName,
          secondary: `${record.callOutcome} • ${record.callDate}`,
          page: 'Call Logs',
          leadId: record.leadId,
        })
      }
    })

    followUps.forEach((followUp) => {
      const recordText = [followUp.customerName, followUp.phoneNumber, followUp.followUpNotes ?? '', followUp.status]
        .join(' ')
        .toLowerCase()

      if (recordText.includes(normalized)) {
        results.push({
          id: `followup-${followUp.id}`,
          type: 'Follow-up',
          label: followUp.customerName,
          secondary: `${followUp.status} • ${followUp.followUpDate}`,
          page: 'Follow-ups',
          leadId: followUp.leadId,
        })
      }
    })

    return results.slice(0, 10)
  }, [callRecords, followUps, leads, topbarSearch])

  const handleGlobalSearchSelect = (result: {
    id: string
    type: 'Lead' | 'Call' | 'Follow-up'
    label: string
    secondary: string
    page: 'Leads' | 'Call Logs' | 'Follow-ups'
    leadId?: number
  }) => {
    setTopbarSearch('')
    setCurrentPage(1)

    if (result.page === 'Leads') {
      const foundLead = result.leadId ? leads.find((lead) => lead.id === result.leadId) ?? null : null
      setActiveNav('Leads')
      setDetailsLead(foundLead)
      return
    }

    if (result.page === 'Call Logs') {
      setActiveNav('Call Logs')
      if (result.leadId) {
        const foundLead = leads.find((lead) => lead.id === result.leadId) ?? null
        if (foundLead) {
          setSelectedLead(foundLead)
        }
      }
      return
    }

    setActiveNav('Follow-ups')
    if (result.leadId) {
      const foundLead = leads.find((lead) => lead.id === result.leadId) ?? null
      if (foundLead) {
        setSelectedLead(foundLead)
      }
    }
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const persistLeadCollection = (nextLeads: Lead[]) => {
    setLeads(nextLeads)
    saveLeads(nextLeads)
  }

  const handleLeadSave = (lead: Lead) => {
    const nextLead: Lead = {
      ...lead,
      name: lead.name.trim(),
      phone: lead.phone.trim(),
      email: lead.email?.trim() || undefined,
      company: lead.company?.trim() || undefined,
      assignedTo: lead.assignedTo || 'Conditions',
      source: lead.source || 'Website',
      initials: lead.initials || getLeadInitials(lead.name),
      dateAdded: lead.dateAdded || new Date().toISOString().slice(0, 10),
      lastContact: lead.lastContact || new Date().toISOString().slice(0, 10),
      status: lead.status || 'New Lead',
      notes: lead.notes?.trim() || undefined,
      isDeleted: lead.isDeleted ?? false,
    }

    const duplicateLead = leads.some(
      (existingLead) =>
        !existingLead.isDeleted &&
        existingLead.id !== nextLead.id &&
        normalizePhoneNumber(existingLead.phone) === normalizePhoneNumber(nextLead.phone),
    )

    if (duplicateLead) {
      setSaveNotice('A lead with this phone number already exists.')
      return
    }

    const hasExisting = leads.some((existingLead) => existingLead.id === nextLead.id)
    const nextLeads = hasExisting
      ? leads.map((existingLead) => (existingLead.id === nextLead.id ? nextLead : existingLead))
      : [...leads, nextLead]

    persistLeadCollection(nextLeads)
    setSaveNotice(hasExisting ? `${nextLead.name} was updated.` : `${nextLead.name} was added.`)
    window.setTimeout(() => setSaveNotice(null), 2200)
  }

  const handleLeadDelete = (leadId: number) => {
    const nextLeads = leads.map((lead) =>
      lead.id === leadId ? { ...lead, isDeleted: true } : lead,
    )
    persistLeadCollection(nextLeads)
    setSaveNotice('Lead removed from the active list. Call records are still preserved.')
    window.setTimeout(() => setSaveNotice(null), 2200)
  }

  const handleLeadImport = (rows: Partial<Lead>[]) => {
    const importedLeads: Lead[] = []

    rows.forEach((row, index) => {
      const name = (row.name ?? '').trim()
      const phone = (row.phone ?? '').trim()
      if (!name || !phone) {
        return
      }

      const duplicateLead = leads.some(
        (existingLead) =>
          !existingLead.isDeleted &&
          normalizePhoneNumber(existingLead.phone) === normalizePhoneNumber(phone),
      )

      if (duplicateLead) {
        return
      }

      importedLeads.push({
        id: Date.now() + index + 1,
        name,
        phone,
        email: row.email?.trim() || undefined,
        company: row.company?.trim() || undefined,
        source: row.source || 'Website',
        assignedTo: row.assignedTo || 'Conditions',
        status: row.status || 'New Lead',
        lastContact: new Date().toISOString().slice(0, 10),
        initials: getLeadInitials(name),
        dateAdded: new Date().toISOString().slice(0, 10),
        notes: row.notes?.trim() || undefined,
        isDeleted: false,
      })
    })

    if (!importedLeads.length) {
      setSaveNotice('No new leads were added from the CSV import.')
      return
    }

    const nextLeads = [...leads, ...importedLeads]
    persistLeadCollection(nextLeads)
    setSaveNotice(`Imported ${importedLeads.length} lead(s).`)
    window.setTimeout(() => setSaveNotice(null), 2200)
  }

  const handleLeadExport = (leadIds?: number[]) => {
    const rowsToExport = (leadIds && leadIds.length > 0
      ? leads.filter((lead) => leadIds.includes(lead.id) && !lead.isDeleted)
      : leads.filter((lead) => !lead.isDeleted)
    ).map((lead) => ({
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? '',
      company: lead.company ?? '',
      source: lead.source,
      assignedTo: lead.assignedTo,
      status: lead.status,
      lastContact: lead.lastContact,
      notes: lead.notes ?? '',
    }))

    const header = ['name', 'phone', 'email', 'company', 'source', 'assignedTo', 'status', 'lastContact', 'notes']
    const csvRows = rowsToExport.map((row) =>
      header
        .map((field) => {
          const value = row[field as keyof typeof row] ?? ''
          const escaped = String(value).replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(','),
    )

    const csvContent = [header.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = leadIds && leadIds.length > 0 ? 'selected-leads.csv' : 'solarcrm-leads.csv'
    anchor.click()
    window.URL.revokeObjectURL(url)
    setSaveNotice(`Exported ${rowsToExport.length} lead(s) to CSV.`)
    window.setTimeout(() => setSaveNotice(null), 2200)
  }

  const handleBulkStatusChange = (leadIds: number[], status: LeadStatus) => {
    const nextLeads = leads.map((lead) =>
      leadIds.includes(lead.id) ? { ...lead, status, lastContact: new Date().toISOString().slice(0, 10) } : lead,
    )
    persistLeadCollection(nextLeads)
    setSaveNotice(`${leadIds.length} lead(s) updated to ${status}.`)
    window.setTimeout(() => setSaveNotice(null), 2200)
  }

  const handleBulkAssignTelecaller = (leadIds: number[], assignedTo: string) => {
    const nextLeads = leads.map((lead) =>
      leadIds.includes(lead.id) ? { ...lead, assignedTo: assignedTo || 'Conditions' } : lead,
    )
    persistLeadCollection(nextLeads)
    setSaveNotice(`${leadIds.length} lead(s) assigned to ${assignedTo || 'Conditions'}.`)
    window.setTimeout(() => setSaveNotice(null), 2200)
  }

  const handleLogCallSave = async (payload: LogCallPayload) => {
    const lead = leads.find((item) => item.id === payload.leadId)
    if (!lead) {
      return
    }

    const telecallerName = (payload.telecallerName || lead.assignedTo || 'Unassigned').trim() || 'Unassigned'
    const contactEntry = {
      telecallerName,
      callOutcome: payload.callOutcome,
      discussionNotes: payload.discussionNotes,
      callDate: payload.callDate,
      callTime: payload.callTime,
    }

    const callRecord: CallRecord = {
      id: Date.now(),
      leadId: payload.leadId,
      customerName: payload.customerName,
      phoneNumber: payload.phoneNumber,
      telecallerName,
      callOutcome: payload.callOutcome,
      callDate: payload.callDate,
      callTime: payload.callTime,
      discussionNotes: payload.discussionNotes,
      followUpDate: payload.scheduleFollowUp ? payload.followUpDate : undefined,
      followUpTime: payload.scheduleFollowUp ? payload.followUpTime : undefined,
      followUpNotes: payload.scheduleFollowUp ? payload.followUpNotes : undefined,
      reminder: payload.scheduleFollowUp && payload.reminder,
      createdAt: new Date().toISOString(),
    }

    const nextCallRecords = [...callRecords, callRecord]
    setCallRecords(nextCallRecords)
    saveCallRecords(nextCallRecords)

    const nextLeadStatus = resolveLeadStatus(lead.status, payload.callOutcome)
    const nextLeads = leads.map((item) =>
      item.id === lead.id
        ? {
            ...item,
            assignedTo: item.assignedTo || telecallerName,
            lastContactedBy: telecallerName,
            contactHistory: [...(item.contactHistory ?? []), contactEntry].slice(-20),
            status: nextLeadStatus,
            lastContact: payload.callDate,
          }
        : item,
    )
    persistLeadCollection(nextLeads)

    if (payload.scheduleFollowUp) {
      const newFollowUp: FollowUpRecord = {
        id: Date.now() + 1,
        leadId: payload.leadId,
        customerName: payload.customerName,
        phoneNumber: payload.phoneNumber,
        followUpDate: payload.followUpDate,
        followUpTime: payload.followUpTime,
        followUpNotes: payload.followUpNotes,
        reminder: payload.reminder,
        status: 'Upcoming',
        createdAt: new Date().toISOString(),
      }

      const nextFollowUps: FollowUpRecord[] = [...followUps, newFollowUp]
      setFollowUps(nextFollowUps)
      saveFollowUps(nextFollowUps)
    }

    setSaveNotice(
      payload.scheduleFollowUp
        ? `Call recorded for ${lead.name} and follow-up scheduled.`
        : `Call recorded for ${lead.name}.`,
    )
    setSelectedLead(null)
    window.setTimeout(() => setSaveNotice(null), 2200)
  }

  const handleFollowUpComplete = (followUpId: number) => {
    const nextFollowUps: FollowUpRecord[] = followUps.map((followUp) =>
      followUp.id === followUpId ? { ...followUp, status: 'Completed' } : followUp,
    )
    setFollowUps(nextFollowUps)
    saveFollowUps(nextFollowUps)
  }

  const handleFollowUpCancel = (followUpId: number) => {
    const nextFollowUps: FollowUpRecord[] = followUps.map((followUp) =>
      followUp.id === followUpId ? { ...followUp, status: 'Cancelled' } : followUp,
    )
    setFollowUps(nextFollowUps)
    saveFollowUps(nextFollowUps)
  }

  const handleOpenLeadLog = (leadId: number) => {
    const foundLead = leads.find((lead) => lead.id === leadId)
    if (foundLead) {
      setSelectedLead(foundLead)
    }
  }

  const handleAddTeamMember = (nextMember: string) => {
    const cleanName = normalizeTeamMember(nextMember)
    if (!cleanName) {
      return
    }

    setTeamMembers((current) => Array.from(new Set([...current, cleanName])))
    setSaveNotice(`${cleanName} was added to the team list.`)
    window.setTimeout(() => setSaveNotice(null), 2200)
  }

  const handleRemoveTeamMember = (member: string) => {
    const cleanMember = normalizeTeamMember(member)
    if (!cleanMember || cleanMember === 'Conditions') {
      return
    }

    setTeamMembers((current) => current.filter((name) => name !== cleanMember))
    setSaveNotice(`${cleanMember} was removed from the team list.`)
    window.setTimeout(() => setSaveNotice(null), 2200)
  }

  const renderDashboard = () => (
    <>
      <DashboardHeader
        fileMenuOpen={fileMenuOpen}
        onToggleFileMenu={() => {
          setFileMenuOpen((current) => !current)
          setAdjustmentMenuOpen(false)
        }}
        adjustmentMenuOpen={adjustmentMenuOpen}
        onToggleAdjustmentMenu={() => {
          setAdjustmentMenuOpen((current) => !current)
          setFileMenuOpen(false)
        }}
        onNavigateToReports={() => {
          setActiveNav('Reports')
          setFileMenuOpen(false)
          setAdjustmentMenuOpen(false)
        }}
        onSaveDashboardNotice={(noticeMessage) => {
          setSaveNotice(noticeMessage)
          window.setTimeout(() => setSaveNotice(null), 2200)
        }}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My Leads" value={String(leads.length)} icon={Users} accentClass="bg-[#eaf2ff] text-[#3568C8]" />
        <StatCard
          label="Follow-ups Today"
          value={String(followUps.filter((item) => item.status === 'Upcoming').length)}
          icon={PhoneCall}
          accentClass="bg-[#fff0f1] text-[#f26b6b]"
        />
        <StatCard
          label="Calls Completed"
          value={String(callRecords.length)}
          icon={Phone}
          accentClass="bg-[#edf5ff] text-[#3568C8]"
        />
        <StatCard
          label="Conversions"
          value={String(leads.filter((lead) => lead.status === 'Converted').length)}
          icon={CheckCircle2}
          accentClass="bg-[#ecfaf3] text-[#2ca968]"
        />
      </div>

      <LeadsTable
        leads={pageLeads}
        selectedIds={selectedIds}
        search={tableSearch}
        statusFilter={statusFilter}
        onSearchChange={handleTableSearchChange}
        onStatusChange={handleStatusChange}
        onSave={handleSave}
        onToggleAll={handleSelectAll}
        onToggleLead={handleToggleLead}
        onLogCall={setSelectedLead}
        onViewLeadDetails={setDetailsLead}
        onEditLead={setEditingLead}
        onArchiveLead={handleLeadDelete}
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPrev={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        saveStatus={saveNotice}
        phoneMenuOpen={phoneMenuOpen}
        onTogglePhoneMenu={() => setPhoneMenuOpen((current) => !current)}
      />
    </>
  )

  return (
    <div className={`app-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'} h-screen`}>
      <div className="flex h-full overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          activeItem={activeNav}
          onToggle={() => setCollapsed((current) => !current)}
          onSelect={(item) => {
            setActiveNav(item)
            setSaveNotice(null)
          }}
          theme={theme}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar
            theme={theme}
            onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            onToggleSidebar={() => setCollapsed((current) => !current)}
            search={topbarSearch}
            onSearchChange={handleTopbarSearchChange}
            searchResults={globalSearchResults}
            onSelectSearchResult={handleGlobalSearchSelect}
            onClearSearch={() => setTopbarSearch('')}
            notificationsOpen={notificationsOpen}
            profileMenuOpen={profileMenuOpen}
            onToggleNotifications={() => {
              setNotificationsOpen((current) => !current)
              setProfileMenuOpen(false)
            }}
            onToggleProfileMenu={() => {
              setProfileMenuOpen((current) => !current)
              setNotificationsOpen(false)
            }}
            onNavigateToReports={() => {
              setActiveNav('Reports')
              setNotificationsOpen(false)
              setProfileMenuOpen(false)
            }}
          />

          <main className={theme === 'dark' ? 'flex-1 overflow-auto bg-slate-950 p-4 md:p-6' : 'flex-1 overflow-auto bg-[#f4f7fb] p-4 md:p-6'}>
            <div className="mx-auto max-w-[1500px]">
              {activeNav === 'Leads' ? (
                <LeadsManagementPage
                  leads={leads}
                  callRecords={callRecords}
                  followUps={followUps}
                  teamMembers={teamMembers}
                  globalSearch={topbarSearch}
                  onGlobalSearchChange={handleTopbarSearchChange}
                  onLeadSave={handleLeadSave}
                  onLeadDelete={handleLeadDelete}
                  onLeadImport={handleLeadImport}
                  onLeadExport={handleLeadExport}
                  onBulkStatusChange={handleBulkStatusChange}
                  onBulkAssignTelecaller={handleBulkAssignTelecaller}
                  onLogCall={setSelectedLead}
                />
              ) : activeNav === 'Team' ? (
                <TeamPage
                  teamMembers={teamMembers}
                  onAddTeamMember={handleAddTeamMember}
                  onRemoveTeamMember={handleRemoveTeamMember}
                />
              ) : activeNav === 'Call Logs' ? (
                <CallLogsPage
                  callRecords={callRecords}
                  leads={leads}
                  followUps={followUps}
                  globalSearch={topbarSearch}
                  onGlobalSearchChange={handleTopbarSearchChange}
                  onOpenLead={(leadId) => {
                    const foundLead = leads.find((lead) => lead.id === leadId)
                    if (foundLead) {
                      setSelectedLead(foundLead)
                    }
                  }}
                  onLogCall={setSelectedLead}
                />
              ) : activeNav === 'Follow-ups' ? (
                <FollowUpsPage
                  followUps={followUps}
                  leadsCount={leads.length}
                  globalSearch={topbarSearch}
                  onGlobalSearchChange={handleTopbarSearchChange}
                  onLogCall={handleOpenLeadLog}
                  onMarkCompleted={handleFollowUpComplete}
                  onCancelFollowUp={handleFollowUpCancel}
                />
              ) : activeNav === 'Reports' ? (
                <ReportsPage
                  leads={leads}
                  callRecords={callRecords}
                  followUps={followUps}
                  globalSearch={topbarSearch}
                  onGlobalSearchChange={handleTopbarSearchChange}
                  onOpenLead={(leadId) => {
                    const foundLead = leads.find((lead) => lead.id === leadId)
                    if (foundLead) {
                      setSelectedLead(foundLead)
                    }
                  }}
                />
              ) : activeNav === 'Owner Analytics' ? (
                <OwnerAnalyticsPage
                  leads={leads}
                  callRecords={callRecords}
                  followUps={followUps}
                  onNavigate={(page) => setActiveNav(page)}
                />
              ) : (
                renderDashboard()
              )}
            </div>
          </main>
        </div>
      </div>

      <LeadFormModal
        open={Boolean(editingLead)}
        mode="edit"
        lead={editingLead}
        leads={leads}
        onClose={() => setEditingLead(null)}
        onSave={(nextLead) => {
          handleLeadSave(nextLead)
          setEditingLead(null)
        }}
        teamMembers={teamMembers}
      />

      <LeadDetailsModal
        lead={detailsLead}
        callRecords={callRecords}
        followUps={followUps}
        onClose={() => setDetailsLead(null)}
        onEdit={(lead) => {
          setEditingLead(lead)
          setDetailsLead(null)
        }}
        onLogCall={(lead) => {
          setDetailsLead(null)
          setSelectedLead(lead)
        }}
      />

      <LogCallModal
        key={selectedLead?.id ?? 'empty-lead'}
        lead={selectedLead}
        teamMembers={teamMembers}
        onClose={() => setSelectedLead(null)}
        onSave={handleLogCallSave}
      />
    </div>
  )
}

export default App
