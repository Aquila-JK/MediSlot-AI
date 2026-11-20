import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  Appointment,
  AppointmentStatus,
  Doctor,
  DoctorProfileSettings,
  Modality,
  NotificationItem,
  PatientRecord,
  Prescription,
  ScheduleSlot,
  sanitizeId,
  clampStr,
  BLUEPRINT_LIMITS,
} from '../types.ts';
import {
  ASSETS,
  INITIAL_DOCTORS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PATIENTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_SCHEDULES,
} from '../data/seedData.ts';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_KEY) &&
    !SUPABASE_URL.includes('your-project-id') &&
    !SUPABASE_KEY.includes('your-supabase') &&
    !SUPABASE_KEY.includes('your-anon-key')
  );
};

export const supabaseServer: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// =============================================================================
// In-Memory Fallback State (Ensures dev resilience if DB credentials are unconfigured)
// =============================================================================
interface MemoryStore {
  doctors: Doctor[];
  doctorProfiles: Record<string, DoctorProfileSettings>;
  patients: PatientRecord[];
  appointments: Appointment[];
  schedules: ScheduleSlot[];
  notifications: NotificationItem[];
  prescriptions: Prescription[];
}

const memoryStore: MemoryStore = {
  doctors: [...INITIAL_DOCTORS].map((d) => ({
    ...d,
    ownerId: 'medislot_workspace_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  doctorProfiles: {
    medislot_workspace_user: {
      uid: 'medislot_workspace_user',
      fullName: 'Dr. Sarah Jenkins',
      credentials: 'MD, FACC — Non-Invasive Cardiology',
      specialty: 'Cardiology',
      npiNumber: '1497820341',
      bio: 'Chief of Non-Invasive Cardiology at Pavilion B Heart & Vascular Center. Focused on preventive diagnostics, ambulatory telemetry, and patient-centered care.',
      practiceName: 'Pavilion B — Heart & Vascular Center',
      clinicAddress: '450 Meridian Parkway, Pavilion B, Suite 204',
      consultationFee: 240,
      videoFee: 195,
      acceptedPayers: ['Aetna Premier', 'BlueCross PPO', 'UnitedHealthcare', 'Medicare Part B'],
      bufferMinutes: 10,
      maxDailyConsults: 18,
      acceptingNewPatients: true,
      twoFactorEnabled: true,
      smsAlerts: true,
      emailDigest: true,
      avatarUrl: ASSETS.drSarahJenkins,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  patients: [...INITIAL_PATIENTS].map((p) => ({
    ...p,
    clinicianUid: 'medislot_workspace_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  appointments: [
    {
      id: 'appt_seed_1',
      bookingCode: '#MS-94821',
      patientUid: 'medislot_workspace_user',
      clinicianUid: 'medislot_workspace_user',
      patientName: 'Eleanor Vance',
      doctorId: 'dr_sarah_jenkins',
      doctorName: 'Dr. Sarah Jenkins, MD, FACC',
      doctorSpecialty: 'Cardiology',
      doctorAvatar: ASSETS.drSarahJenkins,
      clinicLocation: 'Pavilion B — Heart & Vascular Center',
      dateLabel: 'Tomorrow, Nov 19',
      timeSlot: '09:30 AM',
      modality: 'in-person',
      status: 'confirmed',
      reason: 'Annual preventive echocardiogram & blood pressure telemetry review',
      fee: 240,
      preCheckedIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'appt_seed_2',
      bookingCode: '#MS-94855',
      patientUid: 'medislot_workspace_user',
      clinicianUid: 'medislot_workspace_user',
      patientName: 'Julian Thorne',
      doctorId: 'dr_alistair_finch',
      doctorName: 'Dr. Alistair Finch, MD',
      doctorSpecialty: 'Neurology',
      doctorAvatar: ASSETS.drAlistairFinch,
      clinicLocation: 'Midtown Medical Plaza — Suite 410',
      dateLabel: 'Nov 20, 2026',
      timeSlot: '11:00 AM',
      modality: 'video',
      status: 'pending',
      reason: 'Migraine frequency evaluation & preventive titration',
      fee: 260,
      preCheckedIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'appt_seed_3',
      bookingCode: '#MS-94710',
      patientUid: 'medislot_workspace_user',
      clinicianUid: 'medislot_workspace_user',
      patientName: 'Marcus Sterling',
      doctorId: 'dr_sarah_jenkins',
      doctorName: 'Dr. Sarah Jenkins, MD, FACC',
      doctorSpecialty: 'Cardiology',
      doctorAvatar: ASSETS.drSarahJenkins,
      clinicLocation: 'Pavilion B — Heart & Vascular Center',
      dateLabel: 'Nov 14, 2026',
      timeSlot: '02:30 PM',
      modality: 'in-person',
      status: 'completed',
      reason: 'Post-stent routine follow-up & ECG clearance',
      fee: 240,
      preCheckedIn: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  schedules: [...INITIAL_SCHEDULES].map((s) => ({
    ...s,
    clinicianUid: 'medislot_workspace_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  notifications: [...INITIAL_NOTIFICATIONS].map((n) => ({
    ...n,
    recipientUid: 'medislot_workspace_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  prescriptions: [...INITIAL_PRESCRIPTIONS].map((r) => ({
    ...r,
    patientUid: 'medislot_workspace_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
};

// =============================================================================
// Supabase Health Check
// =============================================================================
export async function checkSupabaseHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  url: string;
  message: string;
}> {
  if (!supabaseServer || !isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      url: SUPABASE_URL || 'Not specified',
      message: 'Supabase credentials not configured or using default placeholders. Running in local fallback mode.',
    };
  }

  try {
    const { error } = await supabaseServer.from('doctors').select('id').limit(1);
    if (error) {
      return {
        configured: true,
        connected: false,
        url: SUPABASE_URL,
        message: `Connected to Supabase endpoint, but table query returned: ${error.message}. Please run supabase/schema.sql.`,
      };
    }
    return {
      configured: true,
      connected: true,
      url: SUPABASE_URL,
      message: 'Successfully connected to Supabase PostgreSQL database.',
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      url: SUPABASE_URL,
      message: `Failed to connect to Supabase: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// =============================================================================
// Model Mappers (DB snake_case <-> TypeScript camelCase)
// =============================================================================
function mapDoctorFromRow(row: Record<string, unknown>): Doctor {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id || ''),
    name: String(row.name),
    title: row.title ? String(row.title) : undefined,
    specialty: String(row.specialty),
    location: String(row.location),
    rating: Number(row.rating) || 5.0,
    reviewCount: Number(row.review_count) || 0,
    fee: Number(row.fee) || 0,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    bio: row.bio ? String(row.bio) : undefined,
    experience: row.experience ? String(row.experience) : undefined,
    education: row.education ? String(row.education) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    slots: Array.isArray(row.slots) ? (row.slots as string[]) : [],
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDoctorProfileFromRow(row: Record<string, unknown>): DoctorProfileSettings {
  return {
    uid: String(row.uid),
    fullName: String(row.full_name),
    credentials: row.credentials ? String(row.credentials) : undefined,
    specialty: String(row.specialty || 'Cardiology'),
    npiNumber: row.npi_number ? String(row.npi_number) : undefined,
    bio: row.bio ? String(row.bio) : undefined,
    practiceName: row.practice_name ? String(row.practice_name) : undefined,
    clinicAddress: row.clinic_address ? String(row.clinic_address) : undefined,
    consultationFee: Number(row.consultation_fee) || 240,
    videoFee: Number(row.video_fee) || 195,
    acceptedPayers: Array.isArray(row.accepted_payers) ? (row.accepted_payers as string[]) : [],
    bufferMinutes: Number(row.buffer_minutes) || 10,
    maxDailyConsults: Number(row.max_daily_consults) || 18,
    acceptingNewPatients: Boolean(row.accepting_new_patients),
    twoFactorEnabled: Boolean(row.two_factor_enabled),
    smsAlerts: Boolean(row.sms_alerts),
    emailDigest: Boolean(row.email_digest),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPatientFromRow(row: Record<string, unknown>): PatientRecord {
  return {
    id: String(row.id),
    clinicianUid: String(row.clinician_uid),
    mrn: String(row.mrn),
    name: String(row.name),
    age: Number(row.age) || 0,
    gender: row.gender ? String(row.gender) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    condition: row.condition ? String(row.condition) : undefined,
    riskLevel: (row.risk_level as PatientRecord['riskLevel']) || 'Stable',
    bloodPressure: String(row.blood_pressure || '120/80'),
    heartRate: Number(row.heart_rate) || 72,
    spo2: Number(row.spo2) || 98,
    temp: row.temp ? String(row.temp) : '98.6°F',
    lastVisit: row.last_visit ? String(row.last_visit) : undefined,
    encounters: Array.isArray(row.encounters) ? (row.encounters as string[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAppointmentFromRow(row: Record<string, unknown>): Appointment {
  return {
    id: String(row.id),
    bookingCode: String(row.booking_code),
    patientUid: String(row.patient_uid),
    clinicianUid: String(row.clinician_uid),
    patientName: String(row.patient_name),
    doctorId: String(row.doctor_id),
    doctorName: String(row.doctor_name),
    doctorSpecialty: row.doctor_specialty ? String(row.doctor_specialty) : undefined,
    doctorAvatar: row.doctor_avatar ? String(row.doctor_avatar) : undefined,
    clinicLocation: row.clinic_location ? String(row.clinic_location) : undefined,
    dateLabel: String(row.date_label),
    timeSlot: String(row.time_slot),
    modality: row.modality as Modality,
    status: row.status as AppointmentStatus,
    reason: row.reason ? String(row.reason) : undefined,
    fee: Number(row.fee) || 0,
    preCheckedIn: Boolean(row.pre_checked_in),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapScheduleFromRow(row: Record<string, unknown>): ScheduleSlot {
  return {
    id: String(row.id),
    clinicianUid: String(row.clinician_uid),
    dayOfWeek: row.day_of_week as ScheduleSlot['dayOfWeek'],
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    modality: row.modality as ScheduleSlot['modality'],
    status: row.status as ScheduleSlot['status'],
    patientName: row.patient_name ? String(row.patient_name) : '',
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotificationFromRow(row: Record<string, unknown>): NotificationItem {
  return {
    id: String(row.id),
    recipientUid: String(row.recipient_uid),
    category: row.category as NotificationItem['category'],
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    patientName: row.patient_name ? String(row.patient_name) : undefined,
    relatedAppointmentId: row.related_appointment_id ? String(row.related_appointment_id) : undefined,
    isRead: Boolean(row.is_read),
    actionStatus: row.action_status as NotificationItem['actionStatus'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPrescriptionFromRow(row: Record<string, unknown>): Prescription {
  return {
    id: String(row.id),
    patientUid: String(row.patient_uid),
    medication: String(row.medication),
    dosage: String(row.dosage),
    doctorName: row.doctor_name ? String(row.doctor_name) : undefined,
    refillsLeft: Number(row.refills_left) || 0,
    refillStatus: row.refill_status as Prescription['refillStatus'],
    lastFilled: row.last_filled ? String(row.last_filled) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// Backend Data Repositories (Supabase with Memory Fallback)
// =============================================================================

export async function dbGetDoctors(): Promise<Doctor[]> {
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('doctors')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(mapDoctorFromRow);
      }
    } catch {
      // Fallback below
    }
  }
  return memoryStore.doctors.filter((d) => d.isActive);
}

export async function dbGetDoctorById(id: string): Promise<Doctor | null> {
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer.from('doctors').select('*').eq('id', id).single();
      if (!error && data) {
        return mapDoctorFromRow(data);
      }
    } catch {
      // Fallback below
    }
  }
  return memoryStore.doctors.find((d) => d.id === id) || null;
}

export async function dbGetDoctorProfile(uid: string): Promise<DoctorProfileSettings | null> {
  const safeUid = sanitizeId(uid);
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('doctor_profiles')
        .select('*')
        .eq('uid', safeUid)
        .single();
      if (!error && data) {
        return mapDoctorProfileFromRow(data);
      }
    } catch {
      // Fallback below
    }
  }
  return memoryStore.doctorProfiles[safeUid] || memoryStore.doctorProfiles['medislot_workspace_user'] || null;
}

export async function dbUpsertDoctorProfile(
  uid: string,
  updates: Partial<DoctorProfileSettings>
): Promise<DoctorProfileSettings> {
  const safeUid = sanitizeId(uid);
  const now = new Date().toISOString();

  const payload = {
    uid: safeUid,
    full_name: clampStr(updates.fullName || 'Dr. Sarah Jenkins', BLUEPRINT_LIMITS.NAME_MAX),
    credentials: clampStr(updates.credentials || '', 120),
    specialty: clampStr(updates.specialty || 'Cardiology', 80),
    npi_number: clampStr(updates.npiNumber || '', 40),
    bio: clampStr(updates.bio || '', BLUEPRINT_LIMITS.BIO_MAX),
    practice_name: clampStr(updates.practiceName || '', 160),
    clinic_address: clampStr(updates.clinicAddress || '', 240),
    consultation_fee: Math.max(0, Math.round(updates.consultationFee ?? 240)),
    video_fee: Math.max(0, Math.round(updates.videoFee ?? 195)),
    accepted_payers: (updates.acceptedPayers || []).slice(0, BLUEPRINT_LIMITS.PAYERS_MAX).map((p) => clampStr(p, 64)),
    buffer_minutes: Math.min(120, Math.max(0, Math.round(updates.bufferMinutes ?? 10))),
    max_daily_consults: Math.min(100, Math.max(1, Math.round(updates.maxDailyConsults ?? 18))),
    accepting_new_patients: Boolean(updates.acceptingNewPatients),
    two_factor_enabled: Boolean(updates.twoFactorEnabled),
    sms_alerts: Boolean(updates.smsAlerts),
    email_digest: Boolean(updates.emailDigest),
    updated_at: now,
  };

  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('doctor_profiles')
        .upsert(payload)
        .select('*')
        .single();
      if (!error && data) {
        return mapDoctorProfileFromRow(data);
      }
    } catch {
      // Fallback below
    }
  }

  const existing = memoryStore.doctorProfiles[safeUid] || memoryStore.doctorProfiles['medislot_workspace_user'];
  const updated: DoctorProfileSettings = {
    ...existing,
    ...updates,
    uid: safeUid,
    updatedAt: now,
  } as DoctorProfileSettings;
  memoryStore.doctorProfiles[safeUid] = updated;
  return updated;
}

export async function dbGetPatients(clinicianUid: string): Promise<PatientRecord[]> {
  const safeUid = sanitizeId(clinicianUid);
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('patients')
        .select('*')
        .eq('clinician_uid', safeUid)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(mapPatientFromRow);
      }
    } catch {
      // Fallback below
    }
  }
  return memoryStore.patients.filter((p) => p.clinicianUid === safeUid || safeUid === 'medislot_workspace_user');
}

export async function dbCreatePatient(
  clinicianUid: string,
  input: {
    name: string;
    age: number;
    gender?: string;
    condition?: string;
    riskLevel?: 'High Risk' | 'Moderate' | 'Stable';
    bloodPressure?: string;
    heartRate?: number;
    spo2?: number;
  }
): Promise<PatientRecord> {
  const safeUid = sanitizeId(clinicianUid);
  const id = sanitizeId(`pat_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const mrn = `MRN-${Math.floor(10000 + Math.random() * 89999)}`;
  const now = new Date().toISOString();

  const record: PatientRecord = {
    id,
    clinicianUid: safeUid,
    mrn,
    name: clampStr(input.name, BLUEPRINT_LIMITS.NAME_MAX),
    age: Math.min(130, Math.max(0, Math.round(input.age))),
    gender: clampStr(input.gender || 'Unspecified', 24),
    avatarUrl: ASSETS.patientJulianThorne,
    condition: clampStr(input.condition || 'General Evaluation', 160),
    riskLevel: input.riskLevel || 'Stable',
    bloodPressure: clampStr(input.bloodPressure || '120/80', 24),
    heartRate: Math.min(260, Math.max(20, Math.round(input.heartRate ?? 72))),
    spo2: Math.min(100, Math.max(50, Math.round(input.spo2 ?? 98))),
    temp: '98.6°F',
    lastVisit: 'Today',
    encounters: [`${new Date().toLocaleDateString()} — Registered via MediSlot Clinical Suite`],
    createdAt: now,
    updatedAt: now,
  };

  if (supabaseServer) {
    try {
      const { error } = await supabaseServer.from('patients').insert({
        id: record.id,
        clinician_uid: record.clinicianUid,
        mrn: record.mrn,
        name: record.name,
        age: record.age,
        gender: record.gender,
        avatar_url: record.avatarUrl,
        condition: record.condition,
        risk_level: record.riskLevel,
        blood_pressure: record.bloodPressure,
        heart_rate: record.heartRate,
        spo2: record.spo2,
        temp: record.temp,
        last_visit: record.lastVisit,
        encounters: record.encounters,
      });
      if (!error) return record;
    } catch {
      // Fallback below
    }
  }

  memoryStore.patients = [record, ...memoryStore.patients];
  return record;
}

export async function dbGetAppointments(params: {
  patientUid?: string;
  clinicianUid?: string;
}): Promise<Appointment[]> {
  if (supabaseServer) {
    try {
      let query = supabaseServer.from('appointments').select('*').order('created_at', { ascending: false });
      if (params.patientUid) {
        query = query.eq('patient_uid', sanitizeId(params.patientUid));
      } else if (params.clinicianUid) {
        query = query.eq('clinician_uid', sanitizeId(params.clinicianUid));
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map(mapAppointmentFromRow);
      }
    } catch {
      // Fallback below
    }
  }

  return memoryStore.appointments.filter((a) => {
    if (params.patientUid && a.patientUid !== sanitizeId(params.patientUid)) return false;
    if (params.clinicianUid && a.clinicianUid !== sanitizeId(params.clinicianUid)) return false;
    return true;
  });
}

export async function dbCreateAppointment(params: {
  patientUid: string;
  patientName: string;
  doctor: Doctor;
  dateLabel: string;
  timeSlot: string;
  modality: Modality;
  reason?: string;
}): Promise<Appointment> {
  const id = sanitizeId(`appt_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const bookingCode = `#MS-${String(Math.floor(10000 + Math.random() * 89999))}`;
  const patientUid = sanitizeId(params.patientUid);
  const clinicianUid = sanitizeId(params.doctor.ownerId || params.patientUid);
  const now = new Date().toISOString();

  const newAppt: Appointment = {
    id,
    bookingCode,
    patientUid,
    clinicianUid,
    patientName: clampStr(params.patientName || 'Patient', BLUEPRINT_LIMITS.NAME_MAX),
    doctorId: sanitizeId(params.doctor.id),
    doctorName: clampStr(params.doctor.name, BLUEPRINT_LIMITS.NAME_MAX),
    doctorSpecialty: clampStr(params.doctor.specialty, 80),
    doctorAvatar: clampStr(params.doctor.avatarUrl || '', 600),
    clinicLocation: clampStr(params.doctor.location, BLUEPRINT_LIMITS.LOCATION_MAX),
    dateLabel: clampStr(params.dateLabel, 60),
    timeSlot: clampStr(params.timeSlot, 32),
    modality: params.modality,
    status: 'confirmed',
    reason: clampStr(params.reason || 'Specialist Consultation', BLUEPRINT_LIMITS.REASON_MAX),
    fee: Math.max(0, Math.round(params.doctor.fee)),
    preCheckedIn: false,
    createdAt: now,
    updatedAt: now,
  };

  const notifId = sanitizeId(`notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const newNotif: NotificationItem = {
    id: notifId,
    recipientUid: patientUid,
    category: 'reminder',
    title: `Confirmed: ${clampStr(params.doctor.name, 80)}`,
    description: `${clampStr(params.dateLabel, 40)} at ${clampStr(params.timeSlot, 20)} (${params.modality}) • ${bookingCode}`,
    patientName: clampStr(params.patientName || 'Patient', BLUEPRINT_LIMITS.NAME_MAX),
    relatedAppointmentId: id,
    isRead: false,
    actionStatus: 'accepted',
    createdAt: now,
    updatedAt: now,
  };

  if (supabaseServer) {
    try {
      await supabaseServer.from('appointments').insert({
        id: newAppt.id,
        booking_code: newAppt.bookingCode,
        patient_uid: newAppt.patientUid,
        clinician_uid: newAppt.clinicianUid,
        patient_name: newAppt.patientName,
        doctor_id: newAppt.doctorId,
        doctor_name: newAppt.doctorName,
        doctor_specialty: newAppt.doctorSpecialty,
        doctor_avatar: newAppt.doctorAvatar,
        clinic_location: newAppt.clinicLocation,
        date_label: newAppt.dateLabel,
        time_slot: newAppt.timeSlot,
        modality: newAppt.modality,
        status: newAppt.status,
        reason: newAppt.reason,
        fee: newAppt.fee,
        pre_checked_in: newAppt.preCheckedIn,
      });

      await supabaseServer.from('notifications').insert({
        id: newNotif.id,
        recipient_uid: newNotif.recipientUid,
        category: newNotif.category,
        title: newNotif.title,
        description: newNotif.description,
        patient_name: newNotif.patientName,
        related_appointment_id: newNotif.relatedAppointmentId,
        is_read: newNotif.isRead,
        action_status: newNotif.actionStatus,
      });

      return newAppt;
    } catch {
      // Fallback below
    }
  }

  memoryStore.appointments = [newAppt, ...memoryStore.appointments];
  memoryStore.notifications = [newNotif, ...memoryStore.notifications];
  return newAppt;
}

export async function dbUpdateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<void> {
  const safeId = sanitizeId(id);
  const now = new Date().toISOString();

  if (supabaseServer) {
    try {
      await supabaseServer.from('appointments').update({ status, updated_at: now }).eq('id', safeId);
      return;
    } catch {
      // Fallback below
    }
  }

  memoryStore.appointments = memoryStore.appointments.map((a) =>
    a.id === safeId ? { ...a, status, updatedAt: now } : a
  );
}

export async function dbRescheduleAppointment(
  id: string,
  dateLabel: string,
  timeSlot: string,
  modality: Modality
): Promise<void> {
  const safeId = sanitizeId(id);
  const now = new Date().toISOString();

  if (supabaseServer) {
    try {
      await supabaseServer
        .from('appointments')
        .update({
          date_label: clampStr(dateLabel, 60),
          time_slot: clampStr(timeSlot, 32),
          modality,
          status: 'confirmed',
          updated_at: now,
        })
        .eq('id', safeId);
      return;
    } catch {
      // Fallback below
    }
  }

  memoryStore.appointments = memoryStore.appointments.map((a) =>
    a.id === safeId
      ? {
          ...a,
          dateLabel: clampStr(dateLabel, 60),
          timeSlot: clampStr(timeSlot, 32),
          modality,
          status: 'confirmed',
          updatedAt: now,
        }
      : a
  );
}

export async function dbToggleAppointmentPreCheckIn(id: string): Promise<void> {
  const safeId = sanitizeId(id);
  const now = new Date().toISOString();

  if (supabaseServer) {
    try {
      await supabaseServer
        .from('appointments')
        .update({ pre_checked_in: true, updated_at: now })
        .eq('id', safeId);
      return;
    } catch {
      // Fallback below
    }
  }

  memoryStore.appointments = memoryStore.appointments.map((a) =>
    a.id === safeId ? { ...a, preCheckedIn: true, updatedAt: now } : a
  );
}

export async function dbGetSchedules(clinicianUid: string): Promise<ScheduleSlot[]> {
  const safeUid = sanitizeId(clinicianUid);
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('schedules')
        .select('*')
        .eq('clinician_uid', safeUid);
      if (!error && data && data.length > 0) {
        return data.map(mapScheduleFromRow);
      }
    } catch {
      // Fallback below
    }
  }
  return memoryStore.schedules.filter((s) => s.clinicianUid === safeUid || safeUid === 'medislot_workspace_user');
}

export async function dbAddScheduleSlot(
  clinicianUid: string,
  input: {
    dayOfWeek: ScheduleSlot['dayOfWeek'];
    startTime: string;
    endTime: string;
    modality: ScheduleSlot['modality'];
    notes?: string;
  }
): Promise<ScheduleSlot> {
  const id = sanitizeId(`slot_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const safeUid = sanitizeId(clinicianUid);
  const now = new Date().toISOString();

  const slot: ScheduleSlot = {
    id,
    clinicianUid: safeUid,
    dayOfWeek: input.dayOfWeek,
    startTime: clampStr(input.startTime, 20),
    endTime: clampStr(input.endTime, 20),
    modality: input.modality,
    status: 'available',
    patientName: '',
    notes: clampStr(input.notes || 'Open Clinic Slot', 240),
    createdAt: now,
    updatedAt: now,
  };

  if (supabaseServer) {
    try {
      await supabaseServer.from('schedules').insert({
        id: slot.id,
        clinician_uid: slot.clinicianUid,
        day_of_week: slot.dayOfWeek,
        start_time: slot.startTime,
        end_time: slot.endTime,
        modality: slot.modality,
        status: slot.status,
        patient_name: slot.patientName,
        notes: slot.notes,
      });
      return slot;
    } catch {
      // Fallback below
    }
  }

  memoryStore.schedules = [...memoryStore.schedules, slot];
  return slot;
}

export async function dbUpdateScheduleSlotStatus(
  slotId: string,
  status: ScheduleSlot['status']
): Promise<void> {
  const safeId = sanitizeId(slotId);
  const now = new Date().toISOString();

  if (supabaseServer) {
    try {
      await supabaseServer.from('schedules').update({ status, updated_at: now }).eq('id', safeId);
      return;
    } catch {
      // Fallback below
    }
  }

  memoryStore.schedules = memoryStore.schedules.map((s) =>
    s.id === safeId ? { ...s, status, updatedAt: now } : s
  );
}

export async function dbDeleteScheduleSlot(slotId: string): Promise<void> {
  const safeId = sanitizeId(slotId);

  if (supabaseServer) {
    try {
      await supabaseServer.from('schedules').delete().eq('id', safeId);
      return;
    } catch {
      // Fallback below
    }
  }

  memoryStore.schedules = memoryStore.schedules.filter((s) => s.id !== safeId);
}

export async function dbGetNotifications(recipientUid: string): Promise<NotificationItem[]> {
  const safeUid = sanitizeId(recipientUid);
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('notifications')
        .select('*')
        .eq('recipient_uid', safeUid)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(mapNotificationFromRow);
      }
    } catch {
      // Fallback below
    }
  }
  return memoryStore.notifications.filter((n) => n.recipientUid === safeUid || safeUid === 'medislot_workspace_user');
}

export async function dbUpdateNotification(
  notifId: string,
  actionStatus: NotificationItem['actionStatus'],
  isRead = true
): Promise<void> {
  const safeId = sanitizeId(notifId);
  const now = new Date().toISOString();

  if (supabaseServer) {
    try {
      await supabaseServer
        .from('notifications')
        .update({ action_status: actionStatus, is_read: isRead, updated_at: now })
        .eq('id', safeId);
      return;
    } catch {
      // Fallback below
    }
  }

  memoryStore.notifications = memoryStore.notifications.map((n) =>
    n.id === safeId ? { ...n, actionStatus, isRead, updatedAt: now } : n
  );
}

export async function dbMarkAllNotificationsRead(recipientUid: string): Promise<void> {
  const safeUid = sanitizeId(recipientUid);
  const now = new Date().toISOString();

  if (supabaseServer) {
    try {
      await supabaseServer
        .from('notifications')
        .update({ is_read: true, updated_at: now })
        .eq('recipient_uid', safeUid);
      return;
    } catch {
      // Fallback below
    }
  }

  memoryStore.notifications = memoryStore.notifications.map((n) =>
    n.recipientUid === safeUid || safeUid === 'medislot_workspace_user'
      ? { ...n, isRead: true, updatedAt: now }
      : n
  );
}

export async function dbGetPrescriptions(patientUid: string): Promise<Prescription[]> {
  const safeUid = sanitizeId(patientUid);
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('prescriptions')
        .select('*')
        .eq('patient_uid', safeUid)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(mapPrescriptionFromRow);
      }
    } catch {
      // Fallback below
    }
  }
  return memoryStore.prescriptions.filter((r) => r.patientUid === safeUid || safeUid === 'medislot_workspace_user');
}

export async function dbRequestPrescriptionRefill(rxId: string): Promise<void> {
  const safeId = sanitizeId(rxId);
  const now = new Date().toISOString();

  if (supabaseServer) {
    try {
      await supabaseServer
        .from('prescriptions')
        .update({ refill_status: 'requested', updated_at: now })
        .eq('id', safeId);
      return;
    } catch {
      // Fallback below
    }
  }

  memoryStore.prescriptions = memoryStore.prescriptions.map((r) =>
    r.id === safeId ? { ...r, refillStatus: 'requested', updatedAt: now } : r
  );
}
