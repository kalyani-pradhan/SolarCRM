import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { CallOutcome, LogCallPayload } from '../data/crmStorage'
import type { Lead } from '../data/leads'

interface LogCallModalProps {
  lead: Lead | null
  teamMembers?: string[]
  onClose: () => void
  onSave: (payload: LogCallPayload) => Promise<void> | void
}

type FormState = {
  telecallerName: string
  callOutcome: CallOutcome
  callDate: string
  callTime: string
  discussionNotes: string
  scheduleFollowUp: boolean
  followUpDate: string
  followUpTime: string
  followUpNotes: string
  reminder: boolean
}

const defaultFormState = (): FormState => {
  const now = new Date()
  const dateValue = now.toISOString().slice(0, 10)
  const timeValue = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return {
    telecallerName: '',
    callOutcome: 'Connected',
    callDate: dateValue,
    callTime: timeValue,
    discussionNotes: '',
    scheduleFollowUp: false,
    followUpDate: dateValue,
    followUpTime: timeValue,
    followUpNotes: '',
    reminder: true,
  }
}

export const sanitizeTeamMembers = (teamMembers: string[] = []) =>
  Array.from(
    new Set(
      teamMembers
        .map((member) => member?.trim())
        .filter((member): member is string => Boolean(member) && member !== 'Conditions'),
    ),
  )

export const getDefaultTelecallerName = (_teamMembers: string[] = [], _lead: Lead | null) => ''

export function LogCallModal({ lead, teamMembers = [], onClose, onSave }: LogCallModalProps) {
  if (!lead) {
    return null
  }

  return <LogCallModalContent key={lead.id} lead={lead} teamMembers={teamMembers} onClose={onClose} onSave={onSave} />
}

function LogCallModalContent({ lead, teamMembers = [], onClose, onSave }: LogCallModalProps) {
  const validTeamMembers = sanitizeTeamMembers(teamMembers)

  const [form, setForm] = useState<FormState>(() => ({
    ...defaultFormState(),
    telecallerName: '',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [initialForm] = useState<FormState>(() => defaultFormState())

  useEffect(() => {
    if (!lead) {
      return
    }

    setForm((current) => {
      const currentTelecaller = current.telecallerName?.trim()
      if (!currentTelecaller || currentTelecaller === 'Conditions') {
        return { ...current, telecallerName: '' }
      }

      return current
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm)
        if (hasUnsavedChanges) {
          const shouldDiscard = window.confirm('Discard unsaved call details?')
          if (!shouldDiscard) {
            return
          }
        }
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lead, onClose])

  if (!lead) return null

  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm)

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const shouldDiscard = window.confirm('Discard unsaved call details?')
      if (!shouldDiscard) {
        return
      }
    }
    onClose()
  }

  const validateForm = (shouldScheduleFollowUp = form.scheduleFollowUp) => {
    const nextErrors: Record<string, string> = {}

    if (!form.telecallerName?.trim()) {
      nextErrors.telecallerName = 'Telecaller name is required.'
    }
    if (!form.callOutcome) {
      nextErrors.callOutcome = 'Select a call outcome.'
    }
    if (!form.callDate) {
      nextErrors.callDate = 'Call date is required.'
    }
    if (!form.callTime) {
      nextErrors.callTime = 'Call time is required.'
    }
    if (shouldScheduleFollowUp) {
      if (!form.followUpDate) {
        nextErrors.followUpDate = 'Follow-up date is required.'
      }
      if (!form.followUpTime) {
        nextErrors.followUpTime = 'Follow-up time is required.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const submitForm = async (scheduleFollowUpOverride = false) => {
    const shouldScheduleFollowUp = scheduleFollowUpOverride || form.scheduleFollowUp
    const nextForm = { ...form, scheduleFollowUp: shouldScheduleFollowUp }

    if (!validateForm(shouldScheduleFollowUp)) {
      return
    }

    setIsSaving(true)

    try {
      await onSave({
        leadId: lead.id,
        customerName: lead.name,
        phoneNumber: lead.phone,
        telecallerName: nextForm.telecallerName.trim() || '',
        callOutcome: nextForm.callOutcome,
        callDate: nextForm.callDate,
        callTime: nextForm.callTime,
        discussionNotes: nextForm.discussionNotes,
        scheduleFollowUp: nextForm.scheduleFollowUp,
        followUpDate: nextForm.followUpDate,
        followUpTime: nextForm.followUpTime,
        followUpNotes: nextForm.followUpNotes,
        reminder: nextForm.reminder,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose()
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl md:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Log Call</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
              Record a call
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Record call details and schedule your next follow-up.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close log call modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Customer</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{lead.name}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-slate-500">Phone</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{lead.phone}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-slate-500">Lead Status</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{lead.status}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="telecaller-name" className="block text-sm font-medium text-slate-700">
              Telecaller Name
            </label>
            <select
              id="telecaller-name"
              value={form.telecallerName}
              onChange={(event) => updateField('telecallerName', event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/20"
            >
              <option value="">Select telecaller</option>
              {validTeamMembers.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
            {errors.telecallerName && <p className="mt-1 text-xs text-rose-600">{errors.telecallerName}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="call-outcome" className="block text-sm font-medium text-slate-700">
              Call Outcome
            </label>
            <select
              id="call-outcome"
              value={form.callOutcome}
              onChange={(event) => updateField('callOutcome', event.target.value as CallOutcome)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/20"
            >
              <option value="Connected">Connected</option>
              <option value="No Answer">No Answer</option>
              <option value="Busy">Busy</option>
              <option value="Switched Off">Switched Off</option>
              <option value="Call Back Requested">Call Back Requested</option>
              <option value="Not Interested">Not Interested</option>
            </select>
            {errors.callOutcome && <p className="mt-1 text-xs text-rose-600">{errors.callOutcome}</p>}
          </div>

          <div>
            <label htmlFor="call-date" className="block text-sm font-medium text-slate-700">
              Call Date
            </label>
            <input
              id="call-date"
              type="date"
              value={form.callDate}
              onChange={(event) => updateField('callDate', event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/20"
            />
            {errors.callDate && <p className="mt-1 text-xs text-rose-600">{errors.callDate}</p>}
          </div>

          <div>
            <label htmlFor="call-time" className="block text-sm font-medium text-slate-700">
              Call Time
            </label>
            <input
              id="call-time"
              type="time"
              value={form.callTime}
              onChange={(event) => updateField('callTime', event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/20"
            />
            {errors.callTime && <p className="mt-1 text-xs text-rose-600">{errors.callTime}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="discussion-notes" className="block text-sm font-medium text-slate-700">
              Discussion Notes
            </label>
            <textarea
              id="discussion-notes"
              rows={4}
              value={form.discussionNotes}
              onChange={(event) => updateField('discussionNotes', event.target.value)}
              placeholder="Summarise the conversation, customer requirements and objections..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/20"
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.scheduleFollowUp}
              onChange={(event) => updateField('scheduleFollowUp', event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#3568C8] focus:ring-[#3568C8]"
            />
            <span>Schedule a follow-up</span>
          </label>
        </div>

        {form.scheduleFollowUp && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="followup-date" className="block text-sm font-medium text-slate-700">
                Follow-up Date
              </label>
              <input
                id="followup-date"
                type="date"
                value={form.followUpDate}
                onChange={(event) => updateField('followUpDate', event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/20"
              />
              {errors.followUpDate && <p className="mt-1 text-xs text-rose-600">{errors.followUpDate}</p>}
            </div>

            <div>
              <label htmlFor="followup-time" className="block text-sm font-medium text-slate-700">
                Follow-up Time
              </label>
              <input
                id="followup-time"
                type="time"
                value={form.followUpTime}
                onChange={(event) => updateField('followUpTime', event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/20"
              />
              {errors.followUpTime && <p className="mt-1 text-xs text-rose-600">{errors.followUpTime}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="followup-notes" className="block text-sm font-medium text-slate-700">
                Follow-up Notes
              </label>
              <textarea
                id="followup-notes"
                rows={3}
                value={form.followUpNotes}
                onChange={(event) => updateField('followUpNotes', event.target.value)}
                placeholder="Add callback requirements or next steps."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#3568C8] focus:outline-none focus:ring-2 focus:ring-[#3568C8]/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.reminder}
                  onChange={(event) => updateField('reminder', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#3568C8] focus:ring-[#3568C8]"
                />
                <span>Send reminder</span>
              </label>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => submitForm(false)}
            className="rounded-xl bg-[#3568C8] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#2A5FB9] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : 'Save Call'}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => submitForm(true)}
            className="rounded-xl bg-[#3568C8] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#2A5FB9] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : 'Save Call & Schedule Follow-up'}
          </button>
        </div>
      </div>
    </div>
  )
}
