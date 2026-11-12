import { Archive, ArrowLeft, ArrowRight, Eye, PencilLine, Phone, Search } from 'lucide-react'

import type { Lead } from '../data/leads'
import { ActionMenu } from './ActionMenu'
import { StatusBadge } from './StatusBadge'

interface LeadsTableProps {
  leads: Lead[]
  selectedIds: number[]
  search: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSave: () => void
  onToggleAll: () => void
  onToggleLead: (id: number) => void
  onLogCall: (lead: Lead) => void
  onViewLeadDetails: (lead: Lead) => void
  onEditLead: (lead: Lead) => void
  onArchiveLead: (leadId: number) => void
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  saveStatus: string | null
  phoneMenuOpen: boolean
  onTogglePhoneMenu: () => void
}

export function LeadsTable({
  leads,
  selectedIds,
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onSave,
  onToggleAll,
  onToggleLead,
  onLogCall,
  onViewLeadDetails,
  onEditLead,
  onArchiveLead,
  currentPage,
  totalPages,
  onPrev,
  onNext,
  saveStatus,
  phoneMenuOpen,
  onTogglePhoneMenu,
}: LeadsTableProps) {
  const allVisibleSelected = leads.length > 0 && leads.every((lead) => selectedIds.includes(lead.id))

  return (
    <section className="mt-6 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 md:p-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Professional Leads</h2>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block">
            <select
              value={statusFilter}
              onChange={(event) => onStatusChange(event.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-600 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/15"
            >
              <option>All Status</option>
              <option>Interested</option>
              <option>Follow-up</option>
              <option>New Lead</option>
              <option>Contacted</option>
              <option>Not Interested</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">▾</span>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={onTogglePhoneMenu}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Phone className="h-4 w-4" />
              <span>Phone</span>
            </button>

            {phoneMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1 text-sm text-slate-600">Phone actions are available in the next release.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/15"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-[#3568C8] px-3.5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#2A5FB9]"
          >
            Save
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={currentPage >= totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {saveStatus && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {saveStatus}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.08em] text-slate-400">
              <th className="border-b border-slate-200 px-3 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-[#3568C8] focus:ring-[#3568C8]"
                  aria-label="Select all rows"
                />
              </th>
              <th className="border-b border-slate-200 px-3 py-3 font-medium">Customer Name</th>
              <th className="border-b border-slate-200 px-3 py-3 font-medium">Phone</th>
              <th className="border-b border-slate-200 px-3 py-3 font-medium">Status</th>
              <th className="border-b border-slate-200 px-3 py-3 font-medium">Last Contact</th>
              <th className="border-b border-slate-200 px-3 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                  No leads match the current filters.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const checked = selectedIds.includes(lead.id)

                return (
                  <tr
                    key={lead.id}
                    className="group cursor-pointer transition hover:bg-slate-50/80"
                    onClick={() => onViewLeadDetails(lead)}
                  >
                    <td className="border-b border-slate-200 px-3 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={checked}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => onToggleLead(lead.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#3568C8] focus:ring-[#3568C8]"
                        aria-label={`Select ${lead.name}`}
                      />
                    </td>
                    <td className="border-b border-slate-200 px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#dfeaff] to-[#b9cbff] text-[11px] font-semibold text-slate-700">
                          {lead.initials}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{lead.name}</span>
                      </div>
                    </td>
                    <td className="border-b border-slate-200 px-3 py-3 text-sm text-slate-600">{lead.phone}</td>
                    <td className="border-b border-slate-200 px-3 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="border-b border-slate-200 px-3 py-3 text-sm text-slate-600">{lead.lastContact}</td>
                    <td className="border-b border-slate-200 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onLogCall(lead)
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Log Call
                        </button>
                        <ActionMenu
                          label={`More actions for ${lead.name}`}
                          buttonClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                          items={[
                            {
                              label: 'View details',
                              icon: <Eye className="h-4 w-4" />,
                              onSelect: () => onViewLeadDetails(lead),
                            },
                            {
                              label: 'Edit lead',
                              icon: <PencilLine className="h-4 w-4" />,
                              onSelect: () => onEditLead(lead),
                            },
                            
                            {
                              label: 'Archive lead',
                              icon: <Archive className="h-4 w-4 text-red-500" />,
                              destructive: true,
                              onSelect: () => {
                                if (window.confirm(`Archive ${lead.name}? This removes them from the active list while keeping their history.`)) {
                                  onArchiveLead(lead.id)
                                }
                              },
                            },
                          ]}
                        />
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
  )
}
