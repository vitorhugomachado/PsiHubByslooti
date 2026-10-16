export type Role = 'ADMIN' | 'PSYCHOLOGIST' | 'SECRETARY' | 'PATIENT'
export type PatientStatus = 'ACTIVE' | 'INACTIVE'
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELED' | 'NO_SHOW'
export type Modality = 'IN_PERSON' | 'ONLINE'
export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE'
export type PaymentMethod = 'PIX' | 'CASH' | 'CARD' | 'TRANSFER'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  clinicId: string
  clinicName: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface Patient {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  birthDate?: string | null
  document?: string | null
  notes?: string | null
  address?: string | null
  emergencyContact?: string | null
  emergencyPhone?: string | null
  referralSource?: string | null
  defaultSessionPrice?: number | null
  consentAt?: string | null
  status: PatientStatus
  deletedAt?: string | null
  createdAt: string
}

export type PatientOrder = 'name' | 'recent' | 'next' | 'open'
// ACTIVE | INACTIVE | ALL (todos) | TRASH (lixeira)
export type PatientFilter = PatientStatus | 'ALL' | 'TRASH'

// Paciente com os dados agregados que a lista usa.
export interface PatientListItem extends Patient {
  nextAppointment: { id: string; startAt: string; modality: Modality; status: AppointmentStatus } | null
  lastSessionAt: string | null
  sessionCount: number
  openAmount: number
  openCount: number
  paidTotal: number
}

export interface PatientStats {
  sessionCount: number
  canceledCount: number
  noShowCount: number
  totalAppointments: number
  totalPaid: number
  paidCount: number
  openAmount: number
  openCount: number
  overdueAmount: number
  overdueCount: number
  ticketMedio: number
  firstSessionAt: string | null
  lastSessionAt: string | null
  nextAppointment: Appointment | null
  frequencyDays: number | null
}

export interface PatientProfile extends Patient {
  appointments: Appointment[]
  payments: Payment[]
  stats: PatientStats
}

export interface PatientStatsResponse {
  total: number
  active: number
  inactive: number
  trash: number
  newThisMonth: number
  birthdays: { id: string; name: string; phone?: string | null; day: number; birthDate: string }[]
}

export interface Appointment {
  id: string
  patientId: string
  patient?: Patient
  psychologistId: string
  psychologist?: { id: string; name: string }
  startAt: string
  endAt: string
  status: AppointmentStatus
  modality: Modality
  notes?: string | null
  meetLink?: string | null
  sessionStartedAt?: string | null
  sessionEndedAt?: string | null
  payments?: { id: string; status: PaymentStatus; amount: number; dueDate: string }[]
}

export interface Payment {
  id: string
  patientId: string
  patient?: { id: string; name: string; phone?: string | null; email?: string | null }
  amount: number
  status: PaymentStatus
  method?: PaymentMethod | null
  description?: string | null
  dueDate: string
  paidAt?: string | null
  createdAt: string
}

export interface FinanceSummary {
  receivedMonth: number
  receivedPrevMonth: number
  trend: number | null
  ticketMedio: number
  paidCountMonth: number
  pendingAmount: number
  pendingCount: number
  overdueAmount: number
  overdueCount: number
  forecast: number
  series: { key: string; label: string; year: number; total: number }[]
  byMethod: { method: string; total: number }[]
  topPatients: { id: string; name: string; total: number }[]
  upcoming: Payment[]
}

export interface DashboardSummary {
  patients: number
  appointmentsToday: number
  appointmentsWeek: number
  pendingPayments: number
  overduePayments: number
  revenueMonth: number
  inProgress: number
  doneToday: number
  nextAppointment: { id: string; startAt: string; patientName: string } | null
}
