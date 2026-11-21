/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { PortalLoginPage } from './pages/PortalLoginPage.tsx';
import { PatientShell } from './components/PatientShell.tsx';
import { ClinicalShell } from './components/ClinicalShell.tsx';
import {
  Appointment,
  ClinicalRoute,
  Doctor,
  DoctorProfileSettings,
  NotificationItem,
  PatientRecord,
  PatientRoute,
  Prescription,
  ScheduleSlot,
} from './types.ts';
import {
  subscribeClinicianAppointments,
  subscribeDoctorProfile,
  subscribeDoctors,
  subscribeNotifications,
  subscribePatientAppointments,
  subscribePatients,
  subscribePrescriptions,
  subscribeSchedules,
} from './services/firestoreService.ts';

// Patient Portal Pages
import { PatientHomePage } from './pages/patient/PatientHomePage.tsx';
import { FindDoctorsPage } from './pages/patient/FindDoctorsPage.tsx';
import { DoctorProfilePage } from './pages/patient/DoctorProfilePage.tsx';
import { AppointmentConfirmationPage } from './pages/patient/AppointmentConfirmationPage.tsx';
import { PatientDashboardPage } from './pages/patient/PatientDashboardPage.tsx';
import { PatientAiAssistantPage } from './pages/patient/PatientAiAssistantPage.tsx';
import { CustomerSupportPage } from './pages/patient/CustomerSupportPage.tsx';
import { ChatbotWidget } from './components/ChatbotWidget.tsx';

// Clinical Suite Pages
import { DoctorDashboardPage } from './pages/clinical/DoctorDashboardPage.tsx';
import { AppointmentManagementPage } from './pages/clinical/AppointmentManagementPage.tsx';
import { PatientManagementPage } from './pages/clinical/PatientManagementPage.tsx';
import { ScheduleManagementPage } from './pages/clinical/ScheduleManagementPage.tsx';
import { DoctorAiAssistantPage } from './pages/clinical/DoctorAiAssistantPage.tsx';
import { NotificationsPage } from './pages/clinical/NotificationsPage.tsx';
import { DoctorSettingsPage } from './pages/clinical/DoctorSettingsPage.tsx';

function MediSlotWorkspace() {
  const { workspaceUid, enteredPortal, profile, privateInfo, activePortal, loading, enterPortal } = useAuth();

  const [patientRoute, setPatientRoute] = useState<PatientRoute>('dashboard');
  const [clinicalRoute, setClinicalRoute] = useState<ClinicalRoute>('dashboard');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [clinicianAppointments, setClinicianAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfileSettings | null>(null);

  // Patient Navigation Context
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [preselectedSlot, setPreselectedSlot] = useState<string | undefined>(undefined);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [doctorSearchSpecialty, setDoctorSearchSpecialty] = useState('All');

  useEffect(() => {
    const unsubDoc = subscribeDoctors(setDoctors);
    if (!enteredPortal) return unsubDoc;

    const unsubs = [
      unsubDoc,
      subscribePatientAppointments(workspaceUid, setPatientAppointments),
      subscribeClinicianAppointments(workspaceUid, setClinicianAppointments),
      subscribePatients(workspaceUid, setPatients),
      subscribeSchedules(workspaceUid, setSchedules),
      subscribeNotifications(workspaceUid, setNotifications),
      subscribePrescriptions(workspaceUid, setPrescriptions),
      subscribeDoctorProfile(workspaceUid, setDoctorProfile),
    ];
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [enteredPortal, workspaceUid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-on-primary text-[26px]">vital_signs</span>
        </div>
        <p className="text-sm font-semibold text-primary">Loading MediSlot AI Workspace...</p>
      </div>
    );
  }

  const handleChatbotSelectDoctor = (doctor: Doctor, slot?: string) => {
    if (!enteredPortal) {
      enterPortal('patient');
    }
    setSelectedDoctor(doctor);
    setPreselectedSlot(slot);
    setPatientRoute('doctor-profile');
    setIsChatbotOpen(false);
  };

  const handleChatbotNavigate = (route: PatientRoute) => {
    if (!enteredPortal) {
      enterPortal('patient');
    }
    setPatientRoute(route);
    setIsChatbotOpen(false);
  };

  if (!enteredPortal) {
    return (
      <>
        <PortalLoginPage
          onEnterPatientDashboard={() => setPatientRoute('dashboard')}
          onEnterClinicalDashboard={() => setClinicalRoute('dashboard')}
          onOpenChatbot={() => setIsChatbotOpen(true)}
        />
        <ChatbotWidget
          userName={profile?.displayName || 'Valued Patient'}
          doctors={doctors}
          isOpen={isChatbotOpen}
          onToggleOpen={setIsChatbotOpen}
          onNavigate={handleChatbotNavigate}
          onSelectDoctor={handleChatbotSelectDoctor}
        />
      </>
    );
  }

  const displayName = profile.displayName || 'Eleanor Vance';
  const clinicianName = doctorProfile?.fullName || 'Dr. Sarah Jenkins';

  if (activePortal === 'patient') {
    const activeDoc = selectedDoctor || doctors[0] || null;
    return (
      <PatientShell
        currentRoute={patientRoute}
        onNavigate={setPatientRoute}
        doctors={doctors}
        onSelectDoctor={(docItem) => {
          setSelectedDoctor(docItem);
          setPatientRoute('doctor-profile');
        }}
      >
        {patientRoute === 'home' && (
          <PatientHomePage
            userName={displayName}
            doctors={doctors}
            appointments={patientAppointments}
            onNavigate={setPatientRoute}
            onSelectDoctor={(docItem, slot) => {
              setSelectedDoctor(docItem);
              setPreselectedSlot(slot);
              setPatientRoute('doctor-profile');
            }}
            onSearchDoctors={(q, spec) => {
              setDoctorSearchQuery(q);
              setDoctorSearchSpecialty(spec);
            }}
          />
        )}

        {patientRoute === 'find-doctors' && (
          <FindDoctorsPage
            doctors={doctors}
            initialSearch={doctorSearchQuery}
            initialSpecialty={doctorSearchSpecialty}
            onNavigate={setPatientRoute}
            onSelectDoctor={(docItem, slot) => {
              setSelectedDoctor(docItem);
              setPreselectedSlot(slot);
              setPatientRoute('doctor-profile');
            }}
          />
        )}

        {patientRoute === 'doctor-profile' && activeDoc && (
          <DoctorProfilePage
            doctor={activeDoc}
            initialSlot={preselectedSlot}
            patientUid={workspaceUid}
            patientName={displayName}
            onNavigate={setPatientRoute}
            onBooked={(appt) => {
              setConfirmedAppointment(appt);
              setPatientRoute('appointment-confirmation');
            }}
          />
        )}

        {patientRoute === 'appointment-confirmation' && (
          <AppointmentConfirmationPage
            appointment={confirmedAppointment || patientAppointments[0] || null}
            onNavigate={setPatientRoute}
          />
        )}

        {patientRoute === 'dashboard' && (
          <PatientDashboardPage
            userName={displayName}
            mrn={privateInfo?.mrn}
            appointments={patientAppointments}
            prescriptions={prescriptions}
            onNavigate={setPatientRoute}
            onViewConfirmation={(appt) => {
              setConfirmedAppointment(appt);
              setPatientRoute('appointment-confirmation');
            }}
          />
        )}

        {patientRoute === 'ai-assistant' && (
          <PatientAiAssistantPage
            uid={workspaceUid}
            userName={displayName}
            doctors={doctors}
            onSelectDoctor={(docItem, slot) => {
              setSelectedDoctor(docItem);
              setPreselectedSlot(slot);
              setPatientRoute('doctor-profile');
            }}
          />
        )}

        {patientRoute === 'support' && (
          <CustomerSupportPage
            userName={displayName}
            doctors={doctors}
            onNavigate={setPatientRoute}
            onSelectDoctor={(docItem) => {
              setSelectedDoctor(docItem);
              setPatientRoute('doctor-profile');
            }}
          />
        )}
      </PatientShell>
    );
  }

  const pendingCount = clinicianAppointments.filter((a) => a.status === 'pending').length;
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ClinicalShell
      currentRoute={clinicalRoute}
      onNavigate={setClinicalRoute}
      pendingCount={pendingCount}
      unreadNotifCount={unreadNotifCount}
      clinicianName={clinicianName}
    >
      {clinicalRoute === 'dashboard' && (
        <DoctorDashboardPage
          clinicianName={clinicianName}
          appointments={clinicianAppointments}
          patients={patients}
          notifications={notifications}
          onNavigate={setClinicalRoute}
        />
      )}

      {clinicalRoute === 'appointments' && (
        <AppointmentManagementPage appointments={clinicianAppointments} />
      )}

      {clinicalRoute === 'patients' && (
        <PatientManagementPage clinicianUid={workspaceUid} patients={patients} />
      )}

      {clinicalRoute === 'schedule' && (
        <ScheduleManagementPage
          clinicianUid={workspaceUid}
          schedules={schedules}
          doctorProfile={doctorProfile}
        />
      )}

      {clinicalRoute === 'ai-assistant' && (
        <DoctorAiAssistantPage
          uid={workspaceUid}
          clinicianName={clinicianName}
          appointments={clinicianAppointments}
          patients={patients}
          onNavigate={setClinicalRoute}
        />
      )}

      {clinicalRoute === 'notifications' && (
        <NotificationsPage notifications={notifications} />
      )}

      {clinicalRoute === 'settings' && (
        <DoctorSettingsPage uid={workspaceUid} doctorProfile={doctorProfile} />
      )}
    </ClinicalShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MediSlotWorkspace />
      </AuthProvider>
    </ErrorBoundary>
  );
}
