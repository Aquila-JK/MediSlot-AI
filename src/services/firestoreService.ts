import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  AiMessage,
  AiSession,
  Appointment,
  AppointmentStatus,
  BLUEPRINT_LIMITS,
  clampStr,
  Doctor,
  DoctorProfileSettings,
  Modality,
  NotificationItem,
  PatientRecord,
  PortalMode,
  Prescription,
  sanitizeId,
  ScheduleSlot,
  UserPrivateInfo,
  UserProfile,
} from '../types.ts';
import {
  ASSETS,
  INITIAL_DOCTORS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PATIENTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_SCHEDULES,
} from '../data/seedData.ts';
import {
  apiAddScheduleSlot,
  apiCreateAppointment,
  apiCreatePatient,
  apiDeleteScheduleSlot,
  apiGetAppointments,
  apiGetDoctorProfile,
  apiGetDoctors,
  apiGetNotifications,
  apiGetPatients,
  apiGetPrescriptions,
  apiGetSchedules,
  apiMarkAllNotificationsRead,
  apiRequestPrescriptionRefill,
  apiRescheduleAppointment,
  apiSaveDoctorProfile,
  apiToggleAppointmentPreCheckIn,
  apiUpdateAppointmentStatus,
  apiUpdateNotificationAction,
  apiUpdateScheduleSlotStatus,
  subscribeSupabaseAppointments,
  subscribeSupabaseNotifications,
} from './supabaseService.ts';

// --- Local Persisted Workspace Store (Used for Direct Passwordless Access) ---

const LOCAL_STORE_KEY = 'medislot_workspace_store_v1';
export const LOCAL_WORKSPACE_UID = 'medislot_workspace_user';

interface LocalWorkspaceState {
  doctors: Doctor[];
  doctorProfile: DoctorProfileSettings;
  patients: PatientRecord[];
  appointments: Appointment[];
  schedules: ScheduleSlot[];
  notifications: NotificationItem[];
  prescriptions: Prescription[];
  aiSessions: Record<string, AiSession>;
  aiMessages: Record<string, AiMessage[]>;
}

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

function createInitialLocalState(uid = LOCAL_WORKSPACE_UID): LocalWorkspaceState {
  const safeUid = sanitizeId(uid);
  const nowIso = new Date().toISOString();

  return {
    doctors: INITIAL_DOCTORS.map((d) => ({
      ...d,
      ownerId: safeUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    })),
    doctorProfile: {
      uid: safeUid,
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
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    patients: INITIAL_PATIENTS.map((p) => ({
      ...p,
      clinicianUid: safeUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    })),
    appointments: [
      {
        id: 'appt_seed_1',
        bookingCode: '#MS-94821',
        patientUid: safeUid,
        clinicianUid: safeUid,
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
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'appt_seed_2',
        bookingCode: '#MS-94855',
        patientUid: safeUid,
        clinicianUid: safeUid,
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
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'appt_seed_3',
        bookingCode: '#MS-94710',
        patientUid: safeUid,
        clinicianUid: safeUid,
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
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    schedules: INITIAL_SCHEDULES.map((s) => ({
      ...s,
      clinicianUid: safeUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    })),
    notifications: INITIAL_NOTIFICATIONS.map((n) => ({
      ...n,
      recipientUid: safeUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    })),
    prescriptions: INITIAL_PRESCRIPTIONS.map((rx) => ({
      ...rx,
      patientUid: safeUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    })),
    aiSessions: {},
    aiMessages: {},
  };
}

function readLocalState(): LocalWorkspaceState {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (raw) {
      return JSON.parse(raw) as LocalWorkspaceState;
    }
  } catch {
    // Fallback to initial state
  }
  const initial = createInitialLocalState();
  writeLocalState(initial);
  return initial;
}

function writeLocalState(next: LocalWorkspaceState) {
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota edge cases
  }
  notifyListeners();
}

function useFirebaseMode(): boolean {
  return Boolean(auth.currentUser);
}

export function ensureLocalWorkspaceReady(): void {
  readLocalState();
  syncFromBackend().catch(() => {});
}

async function syncFromBackend() {
  try {
    const [docs, appts, pats, scheds, notifs, rxs, docProf] = await Promise.allSettled([
      apiGetDoctors(),
      apiGetAppointments({ patientUid: LOCAL_WORKSPACE_UID, clinicianUid: LOCAL_WORKSPACE_UID }),
      apiGetPatients(LOCAL_WORKSPACE_UID),
      apiGetSchedules(LOCAL_WORKSPACE_UID),
      apiGetNotifications(LOCAL_WORKSPACE_UID),
      apiGetPrescriptions(LOCAL_WORKSPACE_UID),
      apiGetDoctorProfile(LOCAL_WORKSPACE_UID),
    ]);

    const state = readLocalState();
    let changed = false;

    if (docs.status === 'fulfilled' && Array.isArray(docs.value) && docs.value.length > 0) {
      state.doctors = docs.value;
      changed = true;
    }
    if (appts.status === 'fulfilled' && Array.isArray(appts.value) && appts.value.length > 0) {
      state.appointments = appts.value;
      changed = true;
    }
    if (pats.status === 'fulfilled' && Array.isArray(pats.value) && pats.value.length > 0) {
      state.patients = pats.value;
      changed = true;
    }
    if (scheds.status === 'fulfilled' && Array.isArray(scheds.value) && scheds.value.length > 0) {
      state.schedules = scheds.value;
      changed = true;
    }
    if (notifs.status === 'fulfilled' && Array.isArray(notifs.value) && notifs.value.length > 0) {
      state.notifications = notifs.value;
      changed = true;
    }
    if (rxs.status === 'fulfilled' && Array.isArray(rxs.value) && rxs.value.length > 0) {
      state.prescriptions = rxs.value;
      changed = true;
    }
    if (docProf.status === 'fulfilled' && docProf.value) {
      state.doctorProfile = docProf.value;
      changed = true;
    }

    if (changed) {
      writeLocalState(state);
    }
  } catch {
    // Keep local cache if offline or server loading
  }
}

// --- Firebase User Bootstrap (used only if Firebase Auth user is present) ---

export async function ensureUserBootstrapped(
  user: User,
  preferredPortal: PortalMode
): Promise<UserProfile> {
  const uid = sanitizeId(user.uid);
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  let profile: UserProfile;
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const displayName = clampStr(user.displayName || 'MediSlot Member', BLUEPRINT_LIMITS.NAME_MAX);
      const newProfile: Record<string, unknown> = {
        uid,
        displayName,
        activePortal: preferredPortal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (user.photoURL) {
        newProfile.photoUrl = clampStr(user.photoURL, 500);
      }
      await setDoc(userRef, newProfile);
      profile = {
        uid,
        displayName,
        photoUrl: user.photoURL || undefined,
        activePortal: preferredPortal,
      };
    } else {
      profile = snap.data() as UserProfile;
      if (profile.activePortal !== preferredPortal) {
        await updateDoc(userRef, {
          activePortal: preferredPortal,
          updatedAt: serverTimestamp(),
        });
        profile = { ...profile, activePortal: preferredPortal };
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  try {
    const privSnap = await getDoc(privateRef);
    if (!privSnap.exists()) {
      await setDoc(privateRef, {
        uid,
        email: clampStr(user.email || `${uid}@medislot.local`, 254),
        phone: '+1 (415) 555-0194',
        mrn: `MRN-${uid.slice(0, 6).toUpperCase()}`,
        bloodType: 'O+',
        address: '450 Meridian Parkway, Suite 210',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/info`);
  }

  await seedWorkspaceIfEmpty(user);
  return profile;
}

export async function updateUserPortalMode(uid: string, activePortal: PortalMode): Promise<void> {
  if (!useFirebaseMode()) return;
  const safeUid = sanitizeId(uid);
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      activePortal,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${safeUid}`);
  }
}

export async function getUserPrivateInfo(uid: string): Promise<UserPrivateInfo | null> {
  if (!useFirebaseMode()) {
    return {
      uid: sanitizeId(uid),
      email: 'patient@medislot.local',
      phone: '+1 (415) 555-0194',
      mrn: 'MRN-84920',
      bloodType: 'O+',
      address: '450 Meridian Parkway, Suite 210',
    };
  }
  const safeUid = sanitizeId(uid);
  try {
    const snap = await getDoc(doc(db, 'users', safeUid, 'private', 'info'));
    return snap.exists() ? (snap.data() as UserPrivateInfo) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${safeUid}/private/info`);
  }
}

async function seedWorkspaceIfEmpty(user: User): Promise<void> {
  const uid = sanitizeId(user.uid);
  const patientName = clampStr(user.displayName || 'Eleanor Vance', BLUEPRINT_LIMITS.NAME_MAX);

  try {
    const docsSnap = await getDocs(query(collection(db, 'doctors'), where('isActive', '==', true)));
    if (docsSnap.empty) {
      for (const docItem of INITIAL_DOCTORS) {
        await setDoc(doc(db, 'doctors', docItem.id), {
          ...docItem,
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'doctors');
  }

  try {
    const dpRef = doc(db, 'doctorProfiles', uid);
    const dpSnap = await getDoc(dpRef);
    if (!dpSnap.exists()) {
      await setDoc(dpRef, {
        uid,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `doctorProfiles/${uid}`);
  }

  try {
    const patSnap = await getDocs(query(collection(db, 'patients'), where('clinicianUid', '==', uid)));
    if (patSnap.empty) {
      for (const p of INITIAL_PATIENTS) {
        const docId = sanitizeId(`${p.id}_${uid.slice(0, 6)}`);
        await setDoc(doc(db, 'patients', docId), {
          ...p,
          id: docId,
          clinicianUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'patients');
  }

  try {
    const apptSnap = await getDocs(query(collection(db, 'appointments'), where('patientUid', '==', uid)));
    if (apptSnap.empty) {
      const seedAppointments = [
        {
          id: sanitizeId(`appt_1_${uid.slice(0, 6)}`),
          bookingCode: '#MS-94821',
          patientUid: uid,
          clinicianUid: uid,
          patientName,
          doctorId: 'dr_sarah_jenkins',
          doctorName: 'Dr. Sarah Jenkins, MD, FACC',
          doctorSpecialty: 'Cardiology',
          doctorAvatar: ASSETS.drSarahJenkins,
          clinicLocation: 'Pavilion B — Heart & Vascular Center',
          dateLabel: 'Tomorrow, Nov 19',
          timeSlot: '09:30 AM',
          modality: 'in-person' as Modality,
          status: 'confirmed' as AppointmentStatus,
          reason: 'Annual preventive echocardiogram & blood pressure telemetry review',
          fee: 240,
          preCheckedIn: false,
        },
        {
          id: sanitizeId(`appt_2_${uid.slice(0, 6)}`),
          bookingCode: '#MS-94855',
          patientUid: uid,
          clinicianUid: uid,
          patientName: 'Julian Thorne',
          doctorId: 'dr_alistair_finch',
          doctorName: 'Dr. Alistair Finch, MD',
          doctorSpecialty: 'Neurology',
          doctorAvatar: ASSETS.drAlistairFinch,
          clinicLocation: 'Midtown Medical Plaza — Suite 410',
          dateLabel: 'Nov 20, 2026',
          timeSlot: '11:00 AM',
          modality: 'video' as Modality,
          status: 'pending' as AppointmentStatus,
          reason: 'Migraine frequency evaluation & preventive titration',
          fee: 260,
          preCheckedIn: false,
        },
        {
          id: sanitizeId(`appt_3_${uid.slice(0, 6)}`),
          bookingCode: '#MS-94710',
          patientUid: uid,
          clinicianUid: uid,
          patientName: 'Marcus Sterling',
          doctorId: 'dr_sarah_jenkins',
          doctorName: 'Dr. Sarah Jenkins, MD, FACC',
          doctorSpecialty: 'Cardiology',
          doctorAvatar: ASSETS.drSarahJenkins,
          clinicLocation: 'Pavilion B — Heart & Vascular Center',
          dateLabel: 'Nov 14, 2026',
          timeSlot: '02:30 PM',
          modality: 'in-person' as Modality,
          status: 'completed' as AppointmentStatus,
          reason: 'Post-stent routine follow-up & ECG clearance',
          fee: 240,
          preCheckedIn: true,
        },
      ];
      for (const a of seedAppointments) {
        await setDoc(doc(db, 'appointments', a.id), {
          ...a,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'appointments');
  }

  try {
    const schedSnap = await getDocs(query(collection(db, 'schedules'), where('clinicianUid', '==', uid)));
    if (schedSnap.empty) {
      for (const s of INITIAL_SCHEDULES) {
        const docId = sanitizeId(`${s.id}_${uid.slice(0, 6)}`);
        await setDoc(doc(db, 'schedules', docId), {
          ...s,
          id: docId,
          clinicianUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'schedules');
  }

  try {
    const notifSnap = await getDocs(query(collection(db, 'notifications'), where('recipientUid', '==', uid)));
    if (notifSnap.empty) {
      for (const n of INITIAL_NOTIFICATIONS) {
        const docId = sanitizeId(`${n.id}_${uid.slice(0, 6)}`);
        await setDoc(doc(db, 'notifications', docId), {
          ...n,
          id: docId,
          recipientUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'notifications');
  }

  try {
    const rxSnap = await getDocs(query(collection(db, 'prescriptions'), where('patientUid', '==', uid)));
    if (rxSnap.empty) {
      for (const rx of INITIAL_PRESCRIPTIONS) {
        const docId = sanitizeId(`${rx.id}_${uid.slice(0, 6)}`);
        await setDoc(doc(db, 'prescriptions', docId), {
          ...rx,
          id: docId,
          patientUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'prescriptions');
  }
}

// --- Real-time Subscriptions ---

function subscribeLocal<T>(selector: (state: LocalWorkspaceState) => T, onData: (val: T) => void): Unsubscribe {
  const emit = () => {
    onData(selector(readLocalState()));
  };
  emit();
  const handler = () => emit();
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

export function subscribeDoctors(onData: (doctors: Doctor[]) => void): Unsubscribe {
  if (!useFirebaseMode()) {
    return subscribeLocal((s) => s.doctors, onData);
  }
  const q = query(collection(db, 'doctors'), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Doctor));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'doctors')
  );
}

export function subscribePatientAppointments(
  uid: string,
  onData: (appts: Appointment[]) => void
): Unsubscribe {
  if (!useFirebaseMode()) {
    const isDefaultEleanor = uid === 'usr_eleanor_vance' || uid === LOCAL_WORKSPACE_UID;
    const unsubLocal = subscribeLocal(
      (s) =>
        s.appointments.filter(
          (a) =>
            a.patientUid === uid ||
            (isDefaultEleanor && (a.patientUid === LOCAL_WORKSPACE_UID || a.patientUid === 'usr_eleanor_vance'))
        ),
      onData
    );
    const unsubRealtime = subscribeSupabaseAppointments(() => {
      syncFromBackend().catch(() => {});
    });
    return () => {
      unsubLocal();
      unsubRealtime();
    };
  }
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'appointments'), where('patientUid', '==', safeUid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Appointment));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'appointments')
  );
}

export function subscribeClinicianAppointments(
  uid: string,
  onData: (appts: Appointment[]) => void
): Unsubscribe {
  if (!useFirebaseMode()) {
    return subscribeLocal((s) => s.appointments, onData);
  }
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'appointments'), where('clinicianUid', '==', safeUid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Appointment));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'appointments')
  );
}

export function subscribePatients(
  uid: string,
  onData: (patients: PatientRecord[]) => void
): Unsubscribe {
  if (!useFirebaseMode()) {
    return subscribeLocal((s) => s.patients, onData);
  }
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'patients'), where('clinicianUid', '==', safeUid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as PatientRecord));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'patients')
  );
}

export function subscribeSchedules(
  uid: string,
  onData: (slots: ScheduleSlot[]) => void
): Unsubscribe {
  if (!useFirebaseMode()) {
    return subscribeLocal((s) => s.schedules, onData);
  }
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'schedules'), where('clinicianUid', '==', safeUid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as ScheduleSlot));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'schedules')
  );
}

export function subscribeNotifications(
  uid: string,
  onData: (items: NotificationItem[]) => void
): Unsubscribe {
  if (!useFirebaseMode()) {
    const isDoctor = uid === 'usr_dr_jenkins' || uid === LOCAL_WORKSPACE_UID;
    const unsubLocal = subscribeLocal(
      (s) =>
        s.notifications.filter(
          (n) =>
            n.recipientUid === uid ||
            (isDoctor && (n.recipientUid === LOCAL_WORKSPACE_UID || n.recipientUid === 'usr_dr_jenkins'))
        ),
      onData
    );
    const unsubRealtime = subscribeSupabaseNotifications(() => {
      syncFromBackend().catch(() => {});
    });
    return () => {
      unsubLocal();
      unsubRealtime();
    };
  }
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'notifications'), where('recipientUid', '==', safeUid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as NotificationItem));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
  );
}

export function subscribePrescriptions(
  uid: string,
  onData: (items: Prescription[]) => void
): Unsubscribe {
  if (!useFirebaseMode()) {
    const isDefaultEleanor = uid === 'usr_eleanor_vance' || uid === LOCAL_WORKSPACE_UID;
    return subscribeLocal(
      (s) =>
        s.prescriptions.filter(
          (p) =>
            p.patientUid === uid ||
            (isDefaultEleanor && (p.patientUid === LOCAL_WORKSPACE_UID || p.patientUid === 'usr_eleanor_vance'))
        ),
      onData
    );
  }
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'prescriptions'), where('patientUid', '==', safeUid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Prescription));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'prescriptions')
  );
}

export function subscribeDoctorProfile(
  uid: string,
  onData: (profile: DoctorProfileSettings | null) => void
): Unsubscribe {
  if (!useFirebaseMode()) {
    return subscribeLocal((s) => s.doctorProfile, onData);
  }
  const safeUid = sanitizeId(uid);
  const ref = doc(db, 'doctorProfiles', safeUid);
  return onSnapshot(
    ref,
    (snap) => {
      onData(snap.exists() ? (snap.data() as DoctorProfileSettings) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, `doctorProfiles/${safeUid}`)
  );
}

export function subscribeAiMessages(
  sessionId: string,
  uid: string,
  onData: (messages: AiMessage[]) => void
): Unsubscribe {
  const safeSessionId = sanitizeId(sessionId);
  if (!useFirebaseMode()) {
    return subscribeLocal((s) => s.aiMessages[safeSessionId] || [], onData);
  }
  const safeUid = sanitizeId(uid);
  const q = query(
    collection(db, 'aiSessions', safeSessionId, 'messages'),
    where('ownerUid', '==', safeUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as AiMessage);
      items.sort((a, b) => {
        const ta = (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
        const tb = (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
        return ta - tb;
      });
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `aiSessions/${safeSessionId}/messages`)
  );
}

// --- Mutations ---

export async function createAppointment(params: {
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

  const baseAppt: Appointment = {
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
  };

  const notifId = sanitizeId(`notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const notifObj: NotificationItem = {
    id: notifId,
    recipientUid: patientUid,
    category: 'reminder',
    title: `Confirmed: ${clampStr(params.doctor.name, 80)}`,
    description: `${clampStr(params.dateLabel, 40)} at ${clampStr(params.timeSlot, 20)} (${params.modality}) • ${bookingCode}`,
    patientName: clampStr(params.patientName || 'Patient', BLUEPRINT_LIMITS.NAME_MAX),
    relatedAppointmentId: id,
    isRead: false,
    actionStatus: 'accepted',
  };

  if (!useFirebaseMode()) {
    const state = readLocalState();
    const nowIso = new Date().toISOString();
    const created: Appointment = { ...baseAppt, createdAt: nowIso, updatedAt: nowIso };
    state.appointments = [created, ...state.appointments];
    state.notifications = [{ ...notifObj, createdAt: nowIso, updatedAt: nowIso }, ...state.notifications];
    writeLocalState(state);
    apiCreateAppointment(params).catch(() => {});
    return created;
  }

  try {
    await setDoc(doc(db, 'appointments', id), {
      ...baseAppt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'notifications', notifId), {
      ...notifObj,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return baseAppt;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `appointments/${id}`);
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Promise<void> {
  const safeId = sanitizeId(appointmentId);
  if (!useFirebaseMode()) {
    const state = readLocalState();
    state.appointments = state.appointments.map((a) =>
      a.id === safeId ? { ...a, status, updatedAt: new Date().toISOString() } : a
    );
    writeLocalState(state);
    apiUpdateAppointmentStatus(safeId, status).catch(() => {});
    return;
  }
  try {
    await updateDoc(doc(db, 'appointments', safeId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `appointments/${safeId}`);
  }
}

export async function rescheduleAppointment(
  appointmentId: string,
  dateLabel: string,
  timeSlot: string,
  modality: Modality
): Promise<void> {
  const safeId = sanitizeId(appointmentId);
  if (!useFirebaseMode()) {
    const state = readLocalState();
    state.appointments = state.appointments.map((a) =>
      a.id === safeId
        ? {
            ...a,
            dateLabel: clampStr(dateLabel, 60),
            timeSlot: clampStr(timeSlot, 32),
            modality,
            status: 'confirmed',
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    writeLocalState(state);
    apiRescheduleAppointment(safeId, dateLabel, timeSlot, modality).catch(() => {});
    return;
  }
  try {
    await updateDoc(doc(db, 'appointments', safeId), {
      dateLabel: clampStr(dateLabel, 60),
      timeSlot: clampStr(timeSlot, 32),
      modality,
      status: 'confirmed',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `appointments/${safeId}`);
  }
}

export async function toggleAppointmentPreCheckIn(appointmentId: string): Promise<void> {
  const safeId = sanitizeId(appointmentId);
  if (!useFirebaseMode()) {
    const state = readLocalState();
    state.appointments = state.appointments.map((a) =>
      a.id === safeId ? { ...a, preCheckedIn: true, updatedAt: new Date().toISOString() } : a
    );
    writeLocalState(state);
    apiToggleAppointmentPreCheckIn(safeId).catch(() => {});
    return;
  }
  try {
    await updateDoc(doc(db, 'appointments', safeId), {
      preCheckedIn: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `appointments/${safeId}`);
  }
}

export async function registerNewPatient(
  clinicianUid: string,
  input: {
    name: string;
    age: number;
    gender: string;
    condition: string;
    riskLevel: 'High Risk' | 'Moderate' | 'Stable';
    bloodPressure: string;
    heartRate: number;
    spo2: number;
  }
): Promise<void> {
  const id = sanitizeId(`pat_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const safeUid = sanitizeId(clinicianUid);
  const mrn = `MRN-${Math.floor(10000 + Math.random() * 89999)}`;
  const newRecord: PatientRecord = {
    id,
    clinicianUid: safeUid,
    mrn,
    name: clampStr(input.name, BLUEPRINT_LIMITS.NAME_MAX),
    age: Math.min(130, Math.max(0, Math.round(input.age))),
    gender: clampStr(input.gender || 'Unspecified', 24),
    avatarUrl: ASSETS.patientJulianThorne,
    condition: clampStr(input.condition || 'General Evaluation', 160),
    riskLevel: input.riskLevel,
    bloodPressure: clampStr(input.bloodPressure || '120/80', 24),
    heartRate: Math.min(260, Math.max(20, Math.round(input.heartRate))),
    spo2: Math.min(100, Math.max(50, Math.round(input.spo2))),
    temp: '98.6°F',
    lastVisit: 'Today',
    encounters: [`${new Date().toLocaleDateString()} — Registered in MediSlot Clinical Suite`],
  };

  if (!useFirebaseMode()) {
    const state = readLocalState();
    const nowIso = new Date().toISOString();
    state.patients = [{ ...newRecord, createdAt: nowIso, updatedAt: nowIso }, ...state.patients];
    writeLocalState(state);
    apiCreatePatient(safeUid, input).catch(() => {});
    return;
  }

  try {
    await setDoc(doc(db, 'patients', id), {
      ...newRecord,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `patients/${id}`);
  }
}

export async function addScheduleSlot(
  clinicianUid: string,
  input: {
    dayOfWeek: ScheduleSlot['dayOfWeek'];
    startTime: string;
    endTime: string;
    modality: ScheduleSlot['modality'];
    notes?: string;
  }
): Promise<void> {
  const id = sanitizeId(`slot_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const safeUid = sanitizeId(clinicianUid);
  const newSlot: ScheduleSlot = {
    id,
    clinicianUid: safeUid,
    dayOfWeek: input.dayOfWeek,
    startTime: clampStr(input.startTime, 20),
    endTime: clampStr(input.endTime, 20),
    modality: input.modality,
    status: 'available',
    patientName: '',
    notes: clampStr(input.notes || 'Open Clinic Slot', 240),
  };

  if (!useFirebaseMode()) {
    const state = readLocalState();
    const nowIso = new Date().toISOString();
    state.schedules = [...state.schedules, { ...newSlot, createdAt: nowIso, updatedAt: nowIso }];
    writeLocalState(state);
    apiAddScheduleSlot(safeUid, input).catch(() => {});
    return;
  }

  try {
    await setDoc(doc(db, 'schedules', id), {
      ...newSlot,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `schedules/${id}`);
  }
}

export async function updateScheduleSlotStatus(
  slotId: string,
  status: ScheduleSlot['status']
): Promise<void> {
  const safeId = sanitizeId(slotId);
  if (!useFirebaseMode()) {
    const state = readLocalState();
    state.schedules = state.schedules.map((s) =>
      s.id === safeId ? { ...s, status, updatedAt: new Date().toISOString() } : s
    );
    writeLocalState(state);
    apiUpdateScheduleSlotStatus(safeId, status).catch(() => {});
    return;
  }
  try {
    await updateDoc(doc(db, 'schedules', safeId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `schedules/${safeId}`);
  }
}

export async function deleteScheduleSlot(slotId: string): Promise<void> {
  const safeId = sanitizeId(slotId);
  if (!useFirebaseMode()) {
    const state = readLocalState();
    state.schedules = state.schedules.filter((s) => s.id !== safeId);
    writeLocalState(state);
    apiDeleteScheduleSlot(safeId).catch(() => {});
    return;
  }
  try {
    await deleteDoc(doc(db, 'schedules', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `schedules/${safeId}`);
  }
}

export async function updateNotificationAction(
  notifId: string,
  actionStatus: NotificationItem['actionStatus'],
  isRead = true
): Promise<void> {
  const safeId = sanitizeId(notifId);
  if (!useFirebaseMode()) {
    const state = readLocalState();
    state.notifications = state.notifications.map((n) =>
      n.id === safeId ? { ...n, actionStatus, isRead, updatedAt: new Date().toISOString() } : n
    );
    writeLocalState(state);
    apiUpdateNotificationAction(safeId, actionStatus, isRead).catch(() => {});
    return;
  }
  try {
    await updateDoc(doc(db, 'notifications', safeId), {
      actionStatus,
      isRead,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${safeId}`);
  }
}

export async function markAllNotificationsRead(items: NotificationItem[]): Promise<void> {
  if (!useFirebaseMode()) {
    const state = readLocalState();
    const nowIso = new Date().toISOString();
    state.notifications = state.notifications.map((n) => ({ ...n, isRead: true, updatedAt: nowIso }));
    writeLocalState(state);
    apiMarkAllNotificationsRead(LOCAL_WORKSPACE_UID).catch(() => {});
    return;
  }
  for (const item of items) {
    if (!item.isRead) {
      await updateNotificationAction(item.id, item.actionStatus, true);
    }
  }
}

export async function requestPrescriptionRefill(rx: Prescription): Promise<void> {
  const safeId = sanitizeId(rx.id);
  if (!useFirebaseMode()) {
    const state = readLocalState();
    state.prescriptions = state.prescriptions.map((item) =>
      item.id === safeId
        ? { ...item, refillStatus: 'requested', updatedAt: new Date().toISOString() }
        : item
    );
    writeLocalState(state);
    apiRequestPrescriptionRefill(safeId).catch(() => {});
    return;
  }
  try {
    await updateDoc(doc(db, 'prescriptions', safeId), {
      refillStatus: 'requested',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `prescriptions/${safeId}`);
  }
}

export async function saveDoctorProfileSettings(
  uid: string,
  updates: Partial<DoctorProfileSettings>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const payload = {
    fullName: clampStr(updates.fullName || 'Dr. Sarah Jenkins', BLUEPRINT_LIMITS.NAME_MAX),
    credentials: clampStr(updates.credentials || '', 120),
    specialty: clampStr(updates.specialty || 'Cardiology', 80),
    npiNumber: clampStr(updates.npiNumber || '', 40),
    bio: clampStr(updates.bio || '', BLUEPRINT_LIMITS.BIO_MAX),
    practiceName: clampStr(updates.practiceName || '', 160),
    clinicAddress: clampStr(updates.clinicAddress || '', 240),
    consultationFee: Math.max(0, Math.round(updates.consultationFee ?? 240)),
    videoFee: Math.max(0, Math.round(updates.videoFee ?? 195)),
    acceptedPayers: (updates.acceptedPayers || []).slice(0, BLUEPRINT_LIMITS.PAYERS_MAX).map((p) => clampStr(p, 64)),
    bufferMinutes: Math.min(120, Math.max(0, Math.round(updates.bufferMinutes ?? 10))),
    maxDailyConsults: Math.min(100, Math.max(1, Math.round(updates.maxDailyConsults ?? 18))),
    acceptingNewPatients: Boolean(updates.acceptingNewPatients),
    twoFactorEnabled: Boolean(updates.twoFactorEnabled),
    smsAlerts: Boolean(updates.smsAlerts),
    emailDigest: Boolean(updates.emailDigest),
  };

  if (!useFirebaseMode()) {
    const state = readLocalState();
    state.doctorProfile = {
      ...state.doctorProfile,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    writeLocalState(state);
    apiSaveDoctorProfile(safeUid, payload).catch(() => {});
    return;
  }

  try {
    await updateDoc(doc(db, 'doctorProfiles', safeUid), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `doctorProfiles/${safeUid}`);
  }
}

export async function ensureAiSession(
  ownerUid: string,
  portal: PortalMode,
  title: string
): Promise<AiSession> {
  const safeUid = sanitizeId(ownerUid);
  const sessionId = sanitizeId(`session_${portal}_${safeUid}`);

  if (!useFirebaseMode()) {
    const state = readLocalState();
    if (!state.aiSessions[sessionId]) {
      const nowIso = new Date().toISOString();
      state.aiSessions[sessionId] = {
        id: sessionId,
        ownerUid: safeUid,
        portal,
        title: clampStr(title, 120),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      if (!state.aiMessages[sessionId]) {
        state.aiMessages[sessionId] = [];
      }
      writeLocalState(state);
    }
    return state.aiSessions[sessionId];
  }

  const ref = doc(db, 'aiSessions', sessionId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const payload = {
        id: sessionId,
        ownerUid: safeUid,
        portal,
        title: clampStr(title, 120),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload);
      return payload;
    }
    return snap.data() as AiSession;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `aiSessions/${sessionId}`);
  }
}

export async function appendAiMessage(params: {
  sessionId: string;
  ownerUid: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendedDoctorIds?: string[];
}): Promise<void> {
  const safeSessionId = sanitizeId(params.sessionId);
  const safeUid = sanitizeId(params.ownerUid);
  const msgId = sanitizeId(`msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`);

  const baseMsg: AiMessage = {
    id: msgId,
    sessionId: safeSessionId,
    ownerUid: safeUid,
    sender: params.sender,
    text: clampStr(params.text, BLUEPRINT_LIMITS.MESSAGE_MAX),
  };
  if (params.recommendedDoctorIds && params.recommendedDoctorIds.length > 0) {
    baseMsg.recommendedDoctorIds = params.recommendedDoctorIds
      .slice(0, BLUEPRINT_LIMITS.REC_DOCS_MAX)
      .map((id) => sanitizeId(id));
  }

  if (!useFirebaseMode()) {
    const state = readLocalState();
    const list = state.aiMessages[safeSessionId] || [];
    state.aiMessages[safeSessionId] = [
      ...list,
      { ...baseMsg, createdAt: new Date().toISOString() },
    ];
    writeLocalState(state);
    return;
  }

  try {
    await setDoc(doc(db, 'aiSessions', safeSessionId, 'messages', msgId), {
      ...baseMsg,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `aiSessions/${safeSessionId}/messages/${msgId}`);
  }
}
