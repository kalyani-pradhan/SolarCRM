import { CalendarDays, Clock3, FileText, Phone, UserRound, X } from 'lucide-react'
import { useEffect } from 'react'

import { formatDateLabel, formatTimeLabel, type CallRecord } from '../data/crmStorage'
import type { Lead } from '../data/leads'

interface CallDetailsModalProps {
  record: CallRecord | null
  lead: Lead | null
  onClose: () => void
  onOpenLead: (lead: Lead) => void
}

export function CallDetailsModal({ record, lead, onClose, onOpenLead }: CallDetailsModalProps) {
  useEffect(() => {
    if (!record) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, record])

  if (!record) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl md:p-6" role="dialog" aria-modal="true" aria-label="Call details dialog">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3568C8]">Call Details</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{record.customerName}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close call details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <UserRound className="h-4 w-4 text-[#3568C8]" />
              Customer
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-800">{record.customerName}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Phone className="h-4 w-4 text-[#3568C8]" />
              Phone Number
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-800">{record.phoneNumber}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4 text-[#3568C8]" />
              Call Date
            </div>
            <p className="mt-2 text-base font-medium text-slate-800">{formatDateLabel(record.callDate)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock3 className="h-4 w-4 text-[#3568C8]" />
              Call Time
            </div>
            <p className="mt-2 text-base font-medium text-slate-800">{formatTimeLabel(record.callTime)}</p>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <UserRound className="h-4 w-4 text-[#3568C8]" />
              Contacted By
            </div>
            <p className="mt-2 text-base font-medium text-slate-800">{record.telecallerName || 'Unassigned'}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FileText className="h-4 w-4 text-[#3568C8]" />
            Outcome
          </div>
          <div className="mt-3">
            <span className="inline-flex rounded-full bg-[#edf4ff] px-2.5 py-1 text-xs font-semibold text-[#3568C8]">
              {record.callOutcome}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">Discussion Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {record.discussionNotes || 'No discussion notes recorded for this call.'}
          </p>
        </div>

        {(record.followUpDate || record.followUpTime || record.followUpNotes || record.reminder) && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Follow-up Details</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Date</p>
                <p className="mt-1 text-sm text-slate-700">{record.followUpDate ? formatDateLabel(record.followUpDate) : '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Time</p>
                <p className="mt-1 text-sm text-slate-700">{record.followUpTime ? formatTimeLabel(record.followUpTime) : '—'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {record.followUpNotes || 'No follow-up notes recorded.'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Reminder</p>
                <p className="mt-1 text-sm text-slate-700">{record.reminder ? 'Reminder requested' : 'No reminder set'}</p>
              </div>
            </div>
          </div>
        )}

        {lead && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => onOpenLead(lead)}
              className="rounded-xl bg-[#3568C8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d57b1]"
            >
              Open Associated Lead
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
