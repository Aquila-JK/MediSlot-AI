import React, { useState } from 'react';
import {
  Appointment,
  ClinicalRoute,
  NotificationItem,
  PatientRecord,
} from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';
import { updateAppointmentStatus } from '../../services/firestoreService.ts';

interface DoctorDashboardPageProps {
  clinicianName: string;
  appointments: Appointment[];
  patients: PatientRecord[];
  notifications: NotificationItem[];
  onNavigate: (route: ClinicalRoute) => void;
}

export const DoctorDashboardPage: React.FC<DoctorDashboardPageProps> = ({
  clinicianName,
  appointments,
  patients,
  notifications,
  onNavigate,
}) => {
  const [modalityFilter, setModalityFilter] = useState<'all' | 'in-person' | 'video'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingAppts = appointments.filter((a) => a.status === 'pending');
  const confirmedAppts = appointments.filter((a) => a.status === 'confirmed');
  const highRiskPatients = patients.filter((p) => p.riskLevel === 'High Risk');
  const unreadAlerts = notifications.filter((n) => !n.isRead);

  const scheduleList = appointments.filter((a) => {
    if (a.status === 'cancelled') return false;
    if (modalityFilter === 'all') return true;
    return a.modality === modalityFilter;
  });

  const handleQuickApprove = async (id: string) => {
    setBusyId(id);
    try {
      await updateAppointmentStatus(id, 'confirmed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="rounded-2xl bg-primary text-on-primary p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 editorial-shadow">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-tertiary-fixed">
            Cardiology Pod B • Morning Briefing
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-1">
            Good morning, {clinicianName}
          </h2>
          <p className="text-sm text-primary-fixed-dim mt-1">
            You have {confirmedAppts.length} confirmed visits, {pendingAppts.length} pending requests, and {unreadAlerts.length} clinical alerts requiring review.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('ai-assistant')}
            className="px-4 py-2.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold hover:bg-tertiary-fixed-dim cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>Daily AI Briefing</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('schedule')}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
          >
            Edit Availability
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/25 clinical-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Active Schedule</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">event_available</span>
          </div>
          <p className="text-3xl font-bold text-primary mt-2">{confirmedAppts.length}</p>
          <p className="text-xs text-secondary font-medium mt-1">Confirmed consultations</p>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/25 clinical-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Pending Approvals</span>
            <span className="material-symbols-outlined text-on-tertiary-container text-[20px]">
              pending_actions
            </span>
          </div>
          <p className="text-3xl font-bold text-primary mt-2">{pendingAppts.length}</p>
          <p className="text-xs text-on-tertiary-container font-medium mt-1">
            Awaiting triage sign-off
          </p>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/25 clinical-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">High-Risk Panel</span>
            <span className="material-symbols-outlined text-error text-[20px]">monitor_heart</span>
          </div>
          <p className="text-3xl font-bold text-primary mt-2">{highRiskPatients.length}</p>
          <p className="text-xs text-error font-medium mt-1">Telemetry prioritized</p>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/25 clinical-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Roster Size</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">groups</span>
          </div>
          <p className="text-3xl font-bold text-primary mt-2">{patients.length}</p>
          <p className="text-xs text-secondary font-medium mt-1">Synced EHR charts</p>
        </div>
      </div>

      {/* Schedule + Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Appointment Schedule */}
        <div className="lg:col-span-8 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/25 clinical-shadow space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-primary">Today&apos;s Appointment Schedule</h3>
            <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl">
              {(['all', 'in-person', 'video'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setModalityFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    modalityFilter === tab
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {tab === 'all' ? 'All Visits' : tab === 'video' ? 'HD Video' : 'In-Person'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {scheduleList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-surface-container-low text-sm text-on-surface-variant">
                No visits under this modality filter.
              </div>
            ) : (
              scheduleList.map((appt) => (
                <div
                  key={appt.id}
                  className="p-4 rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="px-3 py-2 rounded-xl bg-surface-container-lowest text-center shrink-0 min-w-[82px]">
                      <p className="text-xs font-bold text-primary">{appt.timeSlot}</p>
                      <p className="text-[10px] text-secondary font-semibold uppercase">
                        {appt.modality}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-primary text-sm">{appt.patientName}</p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            appt.status === 'confirmed'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : appt.status === 'pending'
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                        {appt.reason || appt.doctorSpecialty} • {appt.dateLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {appt.status === 'pending' && (
                      <button
                        type="button"
                        disabled={busyId === appt.id}
                        onClick={() => handleQuickApprove(appt.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigate('appointments')}
                      className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary text-xs font-semibold hover:bg-surface-container cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar: Quick Actions + Clinic Break Notice */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/25 space-y-3">
            <h3 className="text-base font-bold text-primary">Quick Clinical Actions</h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('appointments')}
                className="p-3.5 rounded-xl bg-surface-container-lowest hover:bg-secondary-container/40 text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
                  <span className="text-xs font-bold text-primary">Review Pending Queue</span>
                </div>
                <span className="text-xs font-bold text-secondary">{pendingAppts.length} →</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('patients')}
                className="p-3.5 rounded-xl bg-surface-container-lowest hover:bg-secondary-container/40 text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">monitor_heart</span>
                  <span className="text-xs font-bold text-primary">Inspect High-Risk Vitals</span>
                </div>
                <span className="text-xs font-bold text-error">{highRiskPatients.length} →</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('notifications')}
                className="p-3.5 rounded-xl bg-surface-container-lowest hover:bg-secondary-container/40 text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">ecg_heart</span>
                  <span className="text-xs font-bold text-primary">Holter &amp; Lab Alerts</span>
                </div>
                <span className="text-xs font-bold text-secondary">{unreadAlerts.length} →</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-tertiary-fixed/50 border border-on-tertiary-container/30 p-5 space-y-2">
            <div className="flex items-center gap-2 text-tertiary">
              <span className="material-symbols-outlined text-[20px]">coffee</span>
              <span className="text-xs font-bold uppercase tracking-wider">Midday Clinic Break</span>
            </div>
            <p className="text-sm font-bold text-primary">12:30 PM – 01:30 PM Protected Window</p>
            <p className="text-xs text-on-tertiary-fixed-variant">
              Cardiology Board Rounds &amp; Chart Sign-Off. New patient bookings are automatically buffered.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden bg-surface-container-lowest border border-outline-variant/25">
            <img src={ASSETS.pavilionB} alt="Pavilion B Wing" className="w-full h-28 object-cover" />
            <div className="p-4">
              <p className="text-xs font-bold text-primary">Pavilion B Wing • Room 204</p>
              <p className="text-[11px] text-on-surface-variant">Exam rooms sanitized &amp; ECG telemetry active.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
