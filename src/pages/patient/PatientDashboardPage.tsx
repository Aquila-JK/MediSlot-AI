import React, { useState } from 'react';
import { Appointment, Modality, PatientRoute, Prescription } from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';
import {
  requestPrescriptionRefill,
  rescheduleAppointment,
  toggleAppointmentPreCheckIn,
  updateAppointmentStatus,
} from '../../services/firestoreService.ts';

interface PatientDashboardPageProps {
  userName: string;
  mrn?: string;
  appointments: Appointment[];
  prescriptions: Prescription[];
  onNavigate: (route: PatientRoute) => void;
  onViewConfirmation: (appt: Appointment) => void;
}

export const PatientDashboardPage: React.FC<PatientDashboardPageProps> = ({
  userName,
  mrn = 'MRN-84920',
  appointments,
  prescriptions,
  onNavigate,
  onViewConfirmation,
}) => {
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('Fri, Nov 21');
  const [newSlot, setNewSlot] = useState('11:00 AM');
  const [newModality, setNewModality] = useState<Modality>('in-person');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const upcoming = appointments.filter((a) => a.status === 'confirmed' || a.status === 'pending');
  const history = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled');
  const heroAppt = upcoming[0];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handlePreCheckIn = async (appt: Appointment) => {
    setBusyId(appt.id);
    try {
      await toggleAppointmentPreCheckIn(appt.id);
      showToast(`Digital pre-check-in completed for ${appt.bookingCode}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    setBusyId(rescheduleTarget.id);
    try {
      await rescheduleAppointment(rescheduleTarget.id, newDate, newSlot, newModality);
      showToast(`Rescheduled ${rescheduleTarget.bookingCode} to ${newDate} at ${newSlot}`);
      setRescheduleTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      await updateAppointmentStatus(cancelTarget.id, 'cancelled');
      showToast(`Appointment ${cancelTarget.bookingCode} cancelled.`);
      setCancelTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleRefill = async (rx: Prescription) => {
    setBusyId(rx.id);
    try {
      await requestPrescriptionRefill(rx);
      showToast(`Refill request sent for ${rx.medication}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-tertiary-fixed">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Greeting & Quick Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Patient Care Hub • {mrn}
          </span>
          <h1 className="text-3xl font-bold text-primary mt-1">Hello, {userName}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('ai-assistant')}
            className="px-4 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-semibold hover:bg-secondary-fixed cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            <span>AI Triage</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('find-doctors')}
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Book New Visit</span>
          </button>
        </div>
      </div>

      {/* Hero Next Appointment */}
      {heroAppt ? (
        <section className="rounded-3xl bg-primary text-on-primary p-6 sm:p-8 editorial-shadow">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <img
                src={heroAppt.doctorAvatar || ASSETS.drSarahJenkins}
                alt={heroAppt.doctorName}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/20 shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-tertiary-fixed">
                    Next Appointment • {heroAppt.bookingCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white capitalize">
                    {heroAppt.status}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">{heroAppt.doctorName}</h2>
                <p className="text-sm text-primary-fixed-dim">
                  {heroAppt.dateLabel} at {heroAppt.timeSlot} •{' '}
                  {heroAppt.modality === 'video' ? 'HD Video Visit' : heroAppt.clinicLocation}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={heroAppt.preCheckedIn || busyId === heroAppt.id}
                onClick={() => handlePreCheckIn(heroAppt)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  heroAppt.preCheckedIn
                    ? 'bg-secondary-container text-on-secondary-fixed'
                    : 'bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim'
                }`}
              >
                {heroAppt.preCheckedIn ? '✓ Pre-Checked In' : 'Pre-Check In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRescheduleTarget(heroAppt);
                  setNewDate(heroAppt.dateLabel);
                  setNewSlot(heroAppt.timeSlot);
                  setNewModality(heroAppt.modality);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={() => onViewConfirmation(heroAppt)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
              >
                Pass &amp; Details
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-surface-container-low p-6 border border-outline-variant/30 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-primary">No Upcoming Consultations</h2>
            <p className="text-sm text-on-surface-variant">
              Book an in-person or telehealth slot with a specialist in minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('find-doctors')}
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer"
          >
            Find Doctors
          </button>
        </section>
      )}

      {/* Main Split: Appointments + Prescriptions & Care Records */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: All Appointments */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold text-primary">Your Appointments ({appointments.length})</h2>
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <div
                key={appt.id}
                className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/25 clinical-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <img
                    src={appt.doctorAvatar || ASSETS.drSarahJenkins}
                    alt={appt.doctorName}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-secondary">{appt.bookingCode}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary-container text-on-secondary-container capitalize">
                        {appt.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-primary text-sm mt-0.5">{appt.doctorName}</h3>
                    <p className="text-xs text-on-surface-variant">
                      {appt.dateLabel} • {appt.timeSlot} ({appt.modality})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleTarget(appt);
                      setNewDate(appt.dateLabel);
                      setNewSlot(appt.timeSlot);
                      setNewModality(appt.modality);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-primary cursor-pointer"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelTarget(appt)}
                    className="px-3 py-1.5 rounded-lg bg-error-container/60 hover:bg-error-container text-xs font-semibold text-on-error-container cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}

            {history.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-outline">
                  Past &amp; Cancelled Visits
                </p>
                {history.map((appt) => (
                  <div
                    key={appt.id}
                    className="rounded-xl bg-surface-container-low p-4 flex items-center justify-between gap-3 opacity-85"
                  >
                    <div>
                      <p className="text-sm font-semibold text-primary">{appt.doctorName}</p>
                      <p className="text-xs text-on-surface-variant">
                        {appt.dateLabel} • {appt.timeSlot} • {appt.bookingCode}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                        appt.status === 'completed'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-error-container text-on-error-container'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Prescriptions & Care Records */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/25 clinical-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Active Prescriptions</h2>
              <span className="text-xs font-semibold text-secondary">Pharmacy Synced</span>
            </div>
            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="p-4 rounded-xl bg-surface-container-low flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-primary text-sm">{rx.medication}</p>
                    <p className="text-xs text-on-surface-variant">{rx.dosage}</p>
                    <p className="text-[11px] text-secondary mt-1">
                      {rx.refillsLeft} refills left • Last filled {rx.lastFilled}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={rx.refillStatus !== 'active' || busyId === rx.id}
                    onClick={() => handleRefill(rx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                      rx.refillStatus === 'active'
                        ? 'bg-primary text-on-primary hover:bg-primary-container'
                        : 'bg-secondary-container text-on-secondary-container'
                    }`}
                  >
                    {rx.refillStatus === 'requested'
                      ? 'Requested'
                      : rx.refillStatus === 'approved'
                      ? 'Approved'
                      : 'Request Refill'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/25 space-y-3">
            <h3 className="text-base font-bold text-primary">Recent Care Records</h3>
            <div className="p-3.5 rounded-xl bg-surface-container-lowest flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary">Lipid Panel &amp; Metabolic Screen</p>
                <p className="text-[11px] text-on-surface-variant">Reviewed by Dr. Sarah Jenkins</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
                Normal
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-lowest flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary">12-Lead Resting ECG Summary</p>
                <p className="text-[11px] text-on-surface-variant">Pavilion B Diagnostics</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
                Synced
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveReschedule}
            className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-primary">
              Reschedule {rescheduleTarget.bookingCode}
            </h3>
            <p className="text-xs text-on-surface-variant">{rescheduleTarget.doctorName}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">New Date</label>
                <select
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                >
                  <option>Tomorrow, Nov 19</option>
                  <option>Thu, Nov 20</option>
                  <option>Fri, Nov 21</option>
                  <option>Mon, Nov 24</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">New Time</label>
                <select
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                >
                  <option>09:30 AM</option>
                  <option>11:00 AM</option>
                  <option>02:15 PM</option>
                  <option>04:00 PM</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Modality</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewModality('in-person')}
                    className={`py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                      newModality === 'in-person'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-primary'
                    }`}
                  >
                    In-Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewModality('video')}
                    className={`py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                      newModality === 'video'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-primary'
                    }`}
                  >
                    HD Video
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="px-4 py-2 rounded-xl bg-surface-container-low text-xs font-semibold text-primary cursor-pointer"
              >
                Keep Current
              </button>
              <button
                type="submit"
                disabled={busyId === rescheduleTarget.id}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer"
              >
                Save New Slot
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Confirmation Modal (In-App, no window.confirm) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-primary">Cancel Appointment?</h3>
            <p className="text-sm text-on-surface-variant">
              Are you sure you want to cancel <strong className="text-primary">{cancelTarget.bookingCode}</strong> with{' '}
              {cancelTarget.doctorName} on {cancelTarget.dateLabel}?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-xl bg-surface-container-low text-xs font-semibold text-primary cursor-pointer"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={busyId === cancelTarget.id}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-error text-on-error text-xs font-semibold cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
