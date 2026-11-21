export type PortalMode = 'patient' | 'clinical';

export type PatientRoute =
  | 'home'
  | 'find-doctors'
  | 'doctor-profile'
  | 'appointment-confirmation'
  | 'dashboard'
  | 'ai-assistant'
  | 'support';

export type ClinicalRoute =
  | 'dashboard'
  | 'appointments'
  | 'patients'
  | 'schedule'
  | 'ai-assistant'
  | 'notifications'
  | 'settings';

export type Modality = 'in-person' | 'video';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type RiskLevel = 'High Risk' | 'Moderate' | 'Stable';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export const BLUEPRINT_LIMITS = {
  ID_MAX: 128,
  NAME_MAX: 120,
  BIO_MAX: 1500,
  REASON_MAX: 400,
  LOCATION_MAX: 160,
  MESSAGE_MAX: 4000,
  TAGS_MAX: 10,
  SLOTS_MAX: 16,
  ENCOUNTERS_MAX: 10,
  PAYERS_MAX: 12,
  REC_DOCS_MAX: 5,
} as const;

export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, BLUEPRINT_LIMITS.ID_MAX);
  return cleaned || `id_${Date.now()}`;
}

export function clampStr(val: string, max: number): string {
  return val.trim().slice(0, max);
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoUrl?: string;
  activePortal: PortalMode;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: PortalMode;
  mrn: string;
  phone?: string;
  createdAt: string;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  phone?: string;
  mrn?: string;
  bloodType?: string;
  address?: string;
  updatedAt?: unknown;
}

export interface Doctor {
  id: string;
  ownerId: string;
  name: string;
  title?: string;
  specialty: string;
  location: string;
  rating: number;
  reviewCount: number;
  fee: number;
  avatarUrl?: string;
  bio?: string;
  experience?: string;
  education?: string;
  tags?: string[];
  slots?: string[];
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DoctorProfileSettings {
  uid: string;
  fullName: string;
  credentials?: string;
  specialty: string;
  npiNumber?: string;
  bio?: string;
  practiceName?: string;
  clinicAddress?: string;
  consultationFee: number;
  videoFee?: number;
  acceptedPayers?: string[];
  bufferMinutes: number;
  maxDailyConsults: number;
  acceptingNewPatients: boolean;
  twoFactorEnabled?: boolean;
  smsAlerts?: boolean;
  emailDigest?: boolean;
  avatarUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PatientRecord {
  id: string;
  clinicianUid: string;
  mrn: string;
  name: string;
  age: number;
  gender?: string;
  avatarUrl?: string;
  condition?: string;
  riskLevel: RiskLevel;
  bloodPressure: string;
  heartRate: number;
  spo2: number;
  temp?: string;
  lastVisit?: string;
  encounters?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Appointment {
  id: string;
  bookingCode: string;
  patientUid: string;
  clinicianUid: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorAvatar?: string;
  clinicLocation?: string;
  dateLabel: string;
  timeSlot: string;
  modality: Modality;
  status: AppointmentStatus;
  reason?: string;
  fee: number;
  preCheckedIn: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ScheduleSlot {
  id: string;
  clinicianUid: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  modality: 'in-person' | 'video' | 'hybrid';
  status: 'available' | 'booked' | 'blocked';
  patientName?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationItem {
  id: string;
  recipientUid: string;
  category: 'request' | 'cancellation' | 'reminder' | 'lab';
  title: string;
  description?: string;
  patientName?: string;
  relatedAppointmentId?: string;
  isRead: boolean;
  actionStatus: 'pending' | 'accepted' | 'declined' | 'reviewed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Prescription {
  id: string;
  patientUid: string;
  medication: string;
  dosage: string;
  doctorName?: string;
  refillsLeft: number;
  refillStatus: 'active' | 'requested' | 'approved';
  lastFilled?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AiSession {
  id: string;
  ownerUid: string;
  portal: PortalMode;
  title: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AiMessage {
  id: string;
  sessionId: string;
  ownerUid: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendedDoctorIds?: string[];
  createdAt?: unknown;
}
