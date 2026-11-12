import { useEffect } from 'react'
import { CalendarDays, MessageSquareText, Phone, UserRound, X } from 'lucide-react'

import { formatDateLabel, formatTimeLabel, getLeadCallHistory, getLeadFollowUps } from '../data/crmStorage'
import type { CallRecord, FollowUpRecord } from '../data/crmStorage'
import type { Lead } from '../data/leads'

interface LeadDetailsModalProps {
  lead: Lead | null
  callRecords: CallRecord[]
  followUps: FollowUpRecord[]
  onClose: () => void
  onEdit: (lead: Lead) => void
  onLogCall: (lead: Lead) => void
}
// This is dummy comment

export function LeadDetailsModal({ lead, callRecords, followUps, onClose, onEdit, onLogCall }: LeadDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!lead) {
    return null
  }

  const relatedCalls = getLeadCallHistory(lead.id, callRecords)
  const relatedFollowUps = getLeadFollowUps(lead.id, followUps)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eaf2ff] text-lg font-semibold text-[#3568C8]">
              {lead.initials}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3568C8]">Lead Overview</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-800">{lead.name}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close lead details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid max-h-[calc(90vh-88px)] gap-6 overflow-y-auto p-6 lg:grid-cols-[1.2fr_1.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-slate-500">Status</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {lead.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#3568C8]" />
                  <span>{lead.phone}</span>
                </div>

                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-[#3568C8]" />
                  <span>{lead.company || 'Company not added'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#3568C8]" />
                  <span>{lead.assignedTo || 'Unassigned'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-[#3568C8]" />
                  <span>{lead.lastContactedBy || 'No contact logged yet'}</span>
                </div>

                {lead.email && (
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4 text-[#3568C8]" />
                    <span>{lead.email}</span>
                  </div>
                )}
				{lead.notes && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notes</p>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                  </div>
				)}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onEdit(lead)}
                className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Edit Lead
              </button>
              <button
                type="button"
                onClick={() => onLogCall(lead)}
                className="rounded-xl border border-[#3568C8] bg-[#edf4ff] px-3.5 py-2 text-sm font-medium text-[#3568C8] transition hover:bg-[#dfeaff]"
              >
                Log Call
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Recent call history</p>
              {relatedCalls.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {relatedCalls.slice(0, 4).map((call) => (
                    <div key={call.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">{call.callOutcome}</span>
                        <span className="rounded-full bg-[#edf4ff] px-2 py-0.5 text-[11px] font-semibold text-[#3568C8]">
                          {call.telecallerName || 'Unknown'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateLabel(call.callDate)} • {formatTimeLabel(call.callTime)}
                      </p>
                      <p className="mt-2 text-xs font-medium text-slate-500">Contacted by: {call.telecallerName || 'Unassigned'}</p>
                      <p className="mt-2 text-sm text-slate-600">{call.discussionNotes || 'No discussion notes captured.'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No call history yet for this lead.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Upcoming follow-ups</p>
              {relatedFollowUps.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {relatedFollowUps.slice(0, 4).map((followUp) => (
                    <div key={followUp.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">{followUp.status}</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {followUp.reminder ? 'Reminder' : 'No reminder'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateLabel(followUp.followUpDate)} • {formatTimeLabel(followUp.followUpTime)}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{followUp.followUpNotes || 'No follow-up notes yet.'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No follow-up tasks scheduled for this lead.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
