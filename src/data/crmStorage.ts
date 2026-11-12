import { defaultLeadsData, type Lead } from './leads'

export type CallOutcome =
  | 'Connected'
  | 'No Answer'
  | 'Busy'
  | 'Switched Off'
  | 'Call Back Requested'
  | 'Not Interested'

export type FollowUpStorageStatus = 'Upcoming' | 'Completed' | 'Cancelled'
export type FollowUpDisplayStatus = 'Upcoming' | 'Due Today' | 'Overdue' | 'Completed' | 'Cancelled'

export interface CallRecord {
  id: number
  leadId: number
  customerName: string
  phoneNumber: string
  telecallerName?: string
  callOutcome: CallOutcome
  callDate: string
  callTime: string
  discussionNotes: string
  followUpDate?: string
  followUpTime?: string
  followUpNotes?: string
  reminder: boolean
  createdAt: string
}

export interface FollowUpRecord {
  id: number
  leadId: number
  customerName: string
  phoneNumber: string
  followUpDate: string
  followUpTime: string
  followUpNotes: string
  reminder: boolean
  status: FollowUpStorageStatus
  createdAt: string
}

export interface LogCallPayload {
  leadId: number
  customerName: string
  phoneNumber: string
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

const LEADS_STORAGE_KEY = 'solarcrm.leads'
const CALL_RECORDS_STORAGE_KEY = 'solarcrm.call-records'
const FOLLOW_UPS_STORAGE_KEY = 'solarcrm.follow-ups'
export function normalizePhoneNumber(value: string) {
  return value.replace(/[^\d]/g, '')
}

export function isValidPhoneNumber(value: string) {
  return normalizePhoneNumber(value).length >= 8
}

export function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() || ''
}

export function getLeadInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('') || 'L'
}

export function getLeadCallHistory(leadId: number, callRecords: CallRecord[]) {
  return callRecords.filter((callRecord) => callRecord.leadId === leadId)
}

export function getLeadFollowUps(leadId: number, followUps: FollowUpRecord[]) {
  return followUps.filter((followUp) => followUp.leadId === leadId)
}
function parseStorageValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const storedValue = window.localStorage.getItem(key)
    if (!storedValue) {
      return fallback
    }

    const parsedValue = JSON.parse(storedValue) as T
    return parsedValue ?? fallback
  } catch {
    return fallback
  }
}

function persistStorageValue<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write failures so the app continues to function in restricted environments.
  }
}

export function loadLeads(): Lead[] {
  const storedValue = parseStorageValue<Lead[]>(LEADS_STORAGE_KEY, defaultLeadsData)
  if (Array.isArray(storedValue) && storedValue.length > 0) {
    return storedValue
  }

  return defaultLeadsData
}

export function saveLeads(leads: Lead[]) {
  persistStorageValue(LEADS_STORAGE_KEY, leads)
}

export function loadCallRecords(): CallRecord[] {
  const storedValue = parseStorageValue<CallRecord[]>(CALL_RECORDS_STORAGE_KEY, [])
  return Array.isArray(storedValue) ? storedValue : []
}

export function saveCallRecords(records: CallRecord[]) {
  persistStorageValue(CALL_RECORDS_STORAGE_KEY, records)
}

export function loadFollowUps(): FollowUpRecord[] {
  const storedValue = parseStorageValue<FollowUpRecord[]>(FOLLOW_UPS_STORAGE_KEY, [])
  return Array.isArray(storedValue) ? storedValue : []
}

export function saveFollowUps(followUps: FollowUpRecord[]) {
  persistStorageValue(FOLLOW_UPS_STORAGE_KEY, followUps)
}

export function getFollowUpDisplayStatus(followUp: FollowUpRecord, currentDate = new Date()): FollowUpDisplayStatus {
  if (followUp.status === 'Completed') {
    return 'Completed'
  }

  if (followUp.status === 'Cancelled') {
    return 'Cancelled'
  }

  const dueDateTime = new Date(`${followUp.followUpDate}T${followUp.followUpTime || '00:00'}`)
  const isSameDay =
    dueDateTime.getFullYear() === currentDate.getFullYear() &&
    dueDateTime.getMonth() === currentDate.getMonth() &&
    dueDateTime.getDate() === currentDate.getDate()

  if (dueDateTime < currentDate) {
    return 'Overdue'
  }

  if (isSameDay) {
    return 'Due Today'
  }

  return 'Upcoming'
}

export function formatDateLabel(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTimeLabel(time: string) {
  if (!time) {
    return '—'
  }

  const [hourString, minuteString] = time.split(':')
  const hour = Number(hourString)
  const minute = Number(minuteString)
  const date = new Date()
  date.setHours(hour, minute, 0, 0)

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}
