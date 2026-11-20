/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseClientConfigured } from '../lib/supabase.ts';
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
} from '../types.ts';

const API_BASE = '/api';

export interface SupabaseBackendStatus {
  status?: string;
  configured: boolean;
  connected: boolean;
  url: string;
  message: string;
  timestamp?: string;
}

// =============================================================================
// Status & Diagnostics
// =============================================================================

export async function fetchSupabaseStatus(): Promise<SupabaseBackendStatus> {
  try {
    const res = await fetch(`${API_BASE}/supabase/status`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return (await res.json()) as SupabaseBackendStatus;
  } catch (err) {
    return {
      configured: isSupabaseClientConfigured(),
      connected: false,
      url: 'localhost',
      message: err instanceof Error ? err.message : 'Backend unreachable',
    };
  }
}

// =============================================================================
// Doctors & Practice Profile
// =============================================================================

export async function apiGetDoctors(): Promise<Doctor[]> {
  const res = await fetch(`${API_BASE}/doctors`);
  if (!res.ok) throw new Error(`Failed to fetch doctors: ${res.statusText}`);
  const json = await res.json();
  return json.data || [];
}

export async function apiGetDoctorById(id: string): Promise<Doctor | null> {
  const res = await fetch(`${API_BASE}/doctors/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

export async function apiGetDoctorProfile(uid: string): Promise<DoctorProfileSettings | null> {
  const res = await fetch(`${API_BASE}/doctor-profile/${encodeURIComponent(uid)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

export async function apiSaveDoctorProfile(
  uid: string,
  updates: Partial<DoctorProfileSettings>
): Promise<DoctorProfileSettings> {
  const res = await fetch(`${API_BASE}/doctor-profile/${encodeURIComponent(uid)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to save doctor profile: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

// =============================================================================
// Patient Records (EHR)
// =============================================================================

export async function apiGetPatients(clinicianUid: string): Promise<PatientRecord[]> {
  const res = await fetch(`${API_BASE}/patients?clinicianUid=${encodeURIComponent(clinicianUid)}`);
  if (!res.ok) throw new Error(`Failed to fetch patients: ${res.statusText}`);
  const json = await res.json();
  return json.data || [];
}

export async function apiCreatePatient(
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
  const res = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinicianUid, ...input }),
  });
  if (!res.ok) throw new Error(`Failed to create patient: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

// =============================================================================
// Appointments
// =============================================================================

export async function apiGetAppointments(params: {
  patientUid?: string;
  clinicianUid?: string;
}): Promise<Appointment[]> {
  const query = new URLSearchParams();
  if (params.patientUid) query.set('patientUid', params.patientUid);
  if (params.clinicianUid) query.set('clinicianUid', params.clinicianUid);

  const res = await fetch(`${API_BASE}/appointments?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch appointments: ${res.statusText}`);
  const json = await res.json();
  return json.data || [];
}

export async function apiCreateAppointment(params: {
  patientUid: string;
  patientName: string;
  doctor: Doctor;
  dateLabel: string;
  timeSlot: string;
  modality: Modality;
  reason?: string;
}): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Failed to create appointment: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

export async function apiUpdateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<void> {
  const res = await fetch(`${API_BASE}/appointments/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update appointment status: ${res.statusText}`);
}

export async function apiRescheduleAppointment(
  id: string,
  dateLabel: string,
  timeSlot: string,
  modality: Modality
): Promise<void> {
  const res = await fetch(`${API_BASE}/appointments/${encodeURIComponent(id)}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateLabel, timeSlot, modality }),
  });
  if (!res.ok) throw new Error(`Failed to reschedule appointment: ${res.statusText}`);
}

export async function apiToggleAppointmentPreCheckIn(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/appointments/${encodeURIComponent(id)}/pre-checkin`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error(`Failed to mark pre-checkin: ${res.statusText}`);
}

// =============================================================================
// Schedules
// =============================================================================

export async function apiGetSchedules(clinicianUid: string): Promise<ScheduleSlot[]> {
  const res = await fetch(`${API_BASE}/schedules?clinicianUid=${encodeURIComponent(clinicianUid)}`);
  if (!res.ok) throw new Error(`Failed to fetch schedules: ${res.statusText}`);
  const json = await res.json();
  return json.data || [];
}

export async function apiAddScheduleSlot(
  clinicianUid: string,
  input: {
    dayOfWeek: ScheduleSlot['dayOfWeek'];
    startTime: string;
    endTime: string;
    modality: ScheduleSlot['modality'];
    notes?: string;
  }
): Promise<ScheduleSlot> {
  const res = await fetch(`${API_BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinicianUid, ...input }),
  });
  if (!res.ok) throw new Error(`Failed to add schedule slot: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

export async function apiUpdateScheduleSlotStatus(
  slotId: string,
  status: ScheduleSlot['status']
): Promise<void> {
  const res = await fetch(`${API_BASE}/schedules/${encodeURIComponent(slotId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update slot status: ${res.statusText}`);
}

export async function apiDeleteScheduleSlot(slotId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/schedules/${encodeURIComponent(slotId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete schedule slot: ${res.statusText}`);
}

// =============================================================================
// Notifications
// =============================================================================

export async function apiGetNotifications(recipientUid: string): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE}/notifications?recipientUid=${encodeURIComponent(recipientUid)}`);
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.statusText}`);
  const json = await res.json();
  return json.data || [];
}

export async function apiUpdateNotificationAction(
  notifId: string,
  actionStatus: NotificationItem['actionStatus'],
  isRead = true
): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(notifId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionStatus, isRead }),
  });
  if (!res.ok) throw new Error(`Failed to update notification: ${res.statusText}`);
}

export async function apiMarkAllNotificationsRead(recipientUid: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientUid }),
  });
  if (!res.ok) throw new Error(`Failed to mark notifications read: ${res.statusText}`);
}

// =============================================================================
// Prescriptions
// =============================================================================

export async function apiGetPrescriptions(patientUid: string): Promise<Prescription[]> {
  const res = await fetch(`${API_BASE}/prescriptions?patientUid=${encodeURIComponent(patientUid)}`);
  if (!res.ok) throw new Error(`Failed to fetch prescriptions: ${res.statusText}`);
  const json = await res.json();
  return json.data || [];
}

export async function apiRequestPrescriptionRefill(rxId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/prescriptions/${encodeURIComponent(rxId)}/refill`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to request prescription refill: ${res.statusText}`);
}

// =============================================================================
// Direct Supabase Realtime Subscriptions (When Client Configured)
// =============================================================================

export function subscribeSupabaseAppointments(
  onData: () => void
): () => void {
  if (!supabase || !isSupabaseClientConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel('realtime:appointments')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'appointments' },
      () => {
        onData();
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

export function subscribeSupabaseNotifications(
  onData: () => void
): () => void {
  if (!supabase || !isSupabaseClientConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel('realtime:notifications')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      () => {
        onData();
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}
