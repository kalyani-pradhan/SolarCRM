export type LeadSource =
  | 'Website'
  | 'Facebook'
  | 'Instagram'
  | 'Google Ads'
  | 'Referral'
  | 'Phone Call'
  | 'Other'

export type LeadStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up'
  | 'Converted'
  | 'Not Interested'

export const leadStatusOptions: LeadStatus[] = [
  'New Lead',
  'Contacted',
  'Interested',
  'Follow-up',
  'Converted',
  'Not Interested',
]

export const leadSourceOptions: LeadSource[] = [
  'Website',
  'Facebook',
  'Instagram',
  'Google Ads',
  'Referral',
  'Phone Call',
  'Other',
]

export interface LeadContactHistoryEntry {
  telecallerName: string
  callOutcome: string
  discussionNotes: string
  callDate: string
  callTime: string
}

export interface Lead {
  id: number
  name: string
  phone: string
  email?: string
  company?: string
  source: LeadSource
  assignedTo: string
  status: LeadStatus
  lastContact: string
  initials: string
  dateAdded?: string
  notes?: string
  lastContactedBy?: string
  contactHistory?: LeadContactHistoryEntry[]
  isDeleted?: boolean
}

export const defaultLeadsData: Lead[] = [
  {
    id: 1,
    name: 'Rahul Sharma',
    phone: '98765 43210',
    email: 'rahul.sharma@example.com',
    company: 'BluePeak',
    source: 'Website',
    assignedTo: 'Conditions',
    status: 'Interested',
    lastContact: 'Today',
    initials: 'RS',
    dateAdded: '2024-01-12',
    notes: 'Interested in rooftop installation plans.',
  },
  {
    id: 2,
    name: 'Lalu Karmja',
    phone: '98765 43211',
    email: 'lalu.karmja@example.com',
    company: 'AquaNest',
    source: 'Facebook',
    assignedTo: 'Conditions',
    status: 'Interested',
    lastContact: 'Today',
    initials: 'LK',
    dateAdded: '2024-01-14',
    notes: 'Needs pricing for a 2BHK project.',
  },
  {
    id: 3,
    name: 'Manik Jungann',
    phone: '98765 43212',
    email: 'manik.j@example.com',
    company: 'UrbanBuild',
    source: 'Google Ads',
    assignedTo: 'Conditions',
    status: 'Interested',
    lastContact: 'Today',
    initials: 'MJ',
    dateAdded: '2024-01-16',
    notes: 'Requested a callback with financing options.',
  },
  {
    id: 4,
    name: 'Rahul Sharma',
    phone: '98765 43213',
    email: 'rahul.s2@example.com',
    company: 'Novus Homes',
    source: 'Referral',
    assignedTo: 'Conditions',
    status: 'Follow-up',
    lastContact: 'Jan 1, 2022',
    initials: 'RS',
    dateAdded: '2022-01-01',
    notes: 'Follow-up pending after previous conversation.',
  },
  {
    id: 5,
    name: 'Priya Das',
    phone: '98765 43214',
    email: 'priya.das@example.com',
    company: 'Mithila Builders',
    source: 'Instagram',
    assignedTo: 'Conditions',
    status: 'New Lead',
    lastContact: 'Yesterday',
    initials: 'PD',
    dateAdded: '2024-01-18',
    notes: 'Initial enquiry about solar rooftop packages.',
  },
  {
    id: 6,
    name: 'Amit Kumar',
    phone: '98765 43215',
    email: 'amit.kumar@example.com',
    company: 'EcoLogic',
    source: 'Phone Call',
    assignedTo: 'Conditions',
    status: 'Contacted',
    lastContact: 'Today',
    initials: 'AK',
    dateAdded: '2024-01-20',
    notes: 'Customer interested but requested final quote by email.',
  },
  {
    id: 7,
    name: 'Nisha Verma',
    phone: '98765 43216',
    email: 'nisha.v@example.com',
    company: 'Solar Vista',
    source: 'Website',
    assignedTo: 'Conditions',
    status: 'Interested',
    lastContact: 'Today',
    initials: 'NV',
    dateAdded: '2024-01-21',
    notes: 'Requested proposal for a residential installation.',
  },
  {
    id: 8,
    name: 'Vikram Singh',
    phone: '98765 43217',
    email: 'vikram.s@example.com',
    company: 'Sunrise Energy',
    source: 'Referral',
    assignedTo: 'Conditions',
    status: 'Follow-up',
    lastContact: 'Jan 2, 2022',
    initials: 'VS',
    dateAdded: '2022-01-02',
    notes: 'Waiting for customer to confirm budget.',
  },
  {
    id: 9,
    name: 'Suman Rao',
    phone: '98765 43218',
    email: 'suman.r@example.com',
    company: 'GreenGrid',
    source: 'Facebook',
    assignedTo: 'Conditions',
    status: 'New Lead',
    lastContact: 'Yesterday',
    initials: 'SR',
    dateAdded: '2024-02-02',
    notes: 'Lead came via social campaign.',
  },
  {
    id: 10,
    name: 'Rohit Sen',
    phone: '98765 43219',
    email: 'rohit.s@example.com',
    company: 'Renew Labs',
    source: 'Other',
    assignedTo: 'Conditions',
    status: 'Contacted',
    lastContact: 'Today',
    initials: 'RS',
    dateAdded: '2024-02-05',
    notes: 'Customer responded to a marketing flyer.',
  },
]

export const leadsData = defaultLeadsData
