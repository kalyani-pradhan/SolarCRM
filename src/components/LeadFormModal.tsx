import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Phone, UserRound, X } from 'lucide-react'

import { normalizeEmail, normalizePhoneNumber } from '../data/crmStorage'
import { leadSourceOptions, leadStatusOptions, type Lead, type LeadSource, type LeadStatus } from '../data/leads'

interface LeadFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  lead: Lead | null
  leads: Lead[]
  teamMembers?: string[]
  onClose: () => void
  onSave: (lead: Lead) => void
}

type LeadFormModalContentProps = Omit<LeadFormModalProps, 'open'>

const createDefaultDraft = (lead?: Lead | null) => ({
  id: lead?.id ?? 0,
  name: lead?.name ?? '',
  phone: lead?.phone ?? '',
  email: lead?.email ?? '',
  company: lead?.company ?? '',
  source: (lead?.source ?? 'Website') as LeadSource,
  assignedTo: lead?.assignedTo ?? 'Conditions',
  status: (lead?.status ?? 'New Lead') as LeadStatus,
  lastContact: lead?.lastContact ?? new Date().toISOString().slice(0, 10),
  initials: lead?.initials ?? 'L',
  dateAdded: lead?.dateAdded ?? new Date().toISOString().slice(0, 10),
  notes: lead?.notes ?? '',
})

export function LeadFormModal({ open, mode, lead, leads, teamMembers = ['Conditions'], onClose, onSave }: LeadFormModalProps) {
  if (!open) {
    return null
  }

  return <LeadFormModalContent key={`${mode}-${lead?.id ?? 'new'}`} mode={mode} lead={lead} leads={leads} teamMembers={teamMembers} onClose={onClose} onSave={onSave} />
}

function LeadFormModalContent({ mode, lead, leads, teamMembers, onClose, onSave }: LeadFormModalContentProps & { teamMembers: string[] }) {
  const preferredTeamMember = teamMembers.find((member) => member && member.trim() && member.trim() !== 'Conditions') || teamMembers.find((member) => member && member.trim()) || 'Conditions'

  const [draft, setDraft] = useState(() => ({
    ...createDefaultDraft(lead),
    assignedTo: preferredTeamMember || lead?.assignedTo || 'Conditions',
  }))
  const [error, setError] = useState<string | null>(null)

  const selectedLead = useMemo(() => (lead ? leads.find((item) => item.id === lead.id) ?? lead : null), [lead, leads])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!teamMembers.length) {
      return
    }

    setDraft((current) => {
      const hasValidAssignment = !!current.assignedTo?.trim() && teamMembers.includes(current.assignedTo.trim())
      if (hasValidAssignment) {
        return current
      }

      const preferredMember = teamMembers.find((member) => member && member.trim() && member.trim() !== 'Conditions') || teamMembers.find((member) => member && member.trim()) || 'Conditions'

      return {
        ...current,
        assignedTo: preferredMember,
      }
    })
  }, [teamMembers])

  const handleFieldChange = <K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = draft.name.trim()
    const phone = draft.phone.trim()
    const email = normalizeEmail(draft.email)
    const company = draft.company.trim()

    if (!name) {
      setError('Lead name is required.')
      return
    }

    if (!phone || normalizePhoneNumber(phone).length < 8) {
      setError('Phone number must include at least 8 digits.')
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email format looks invalid. Please correct it before saving.')
      return
    }

    const normalizedPhone = normalizePhoneNumber(phone)
    const duplicateLead = leads.find(
      (item) =>
        !item.isDeleted &&
        item.id !== draft.id &&
        normalizePhoneNumber(item.phone) === normalizedPhone,
    )

    if (duplicateLead) {
      setError(`A lead with phone number ${duplicateLead.phone} already exists.`)
      return
    }

    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || 'L'

    const savedLead: Lead = {
      id: draft.id || Date.now(),
      name,
      phone,
      email: email || undefined,
      company: company || undefined,
      source: draft.source,
      assignedTo: draft.assignedTo || 'Conditions',
      status: draft.status,
      lastContact: draft.lastContact || new Date().toISOString().slice(0, 10),
      initials,
      dateAdded: draft.dateAdded || new Date().toISOString().slice(0, 10),
      notes: draft.notes?.trim() || undefined,
      lastContactedBy: (selectedLead?.lastContactedBy ?? draft.assignedTo) || 'Conditions',
      contactHistory: selectedLead?.contactHistory ?? [],
      isDeleted: selectedLead?.isDeleted ?? false,
    }

    onSave(savedLead)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3568C8]">
              {mode === 'create' ? 'New Lead' : 'Edit Lead'}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-800">
              {mode === 'create' ? 'Add a new prospect' : 'Update prospect details'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close lead form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm text-slate-600">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <UserRound className="h-4 w-4 text-[#3568C8]" /> Name
              </span>
              <input
                value={draft.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
                placeholder="e.g. Surya Sharma"
              />
            </label>

            <label className="space-y-1.5 text-sm text-slate-600">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <Phone className="h-4 w-4 text-[#3568C8]" /> Phone
              </span>
              <input
                value={draft.phone}
                onChange={(event) => handleFieldChange('phone', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
                placeholder="98765 43210"
              />
            </label>

            <label className="space-y-1.5 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
                placeholder="name@example.com"
              />
            </label>

            <label className="space-y-1.5 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Company</span>
              <input
                value={draft.company}
                onChange={(event) => handleFieldChange('company', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
                placeholder="Green Horizon"
              />
            </label>

            <label className="space-y-1.5 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Source</span>
              <select
                value={draft.source}
                onChange={(event) => handleFieldChange('source', event.target.value as LeadSource)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
              >
                {leadSourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Assigned To</span>
              <input
                list="assigned-to-list"
                value={draft.assignedTo}
                onChange={(event) => handleFieldChange('assignedTo', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
                placeholder="Conditions"
              />
              <datalist id="assigned-to-list">
                {teamMembers.map((member) => (
                  <option key={member} value={member} />
                ))}
              </datalist>
            </label>

            <label className="space-y-1.5 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Lead Status</span>
              <select
                value={draft.status}
                onChange={(event) => handleFieldChange('status', event.target.value as LeadStatus)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
              >
                {leadStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm text-slate-600">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <CalendarDays className="h-4 w-4 text-[#3568C8]" /> Last Contact
              </span>
              <input
                type="date"
                value={draft.lastContact}
                onChange={(event) => handleFieldChange('lastContact', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea
              rows={4}
              value={draft.notes}
              onChange={(event) => handleFieldChange('notes', event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none transition focus:border-[#3568C8] focus:bg-white"
              placeholder="Add notes about the prospect or deal context."
            />
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3568C8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2555ab]"
            >
              <CheckCircle2 className="h-4 w-4" />
              {mode === 'create' ? 'Save Lead' : 'Update Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
