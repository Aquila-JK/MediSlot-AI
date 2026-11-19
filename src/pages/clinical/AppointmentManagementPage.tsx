import React, { useState } from 'react';
import { Appointment, AppointmentStatus, Modality } from '../../types.ts';
import {
  rescheduleAppointment,
  updateAppointmentStatus,
} from '../../services/firestoreService.ts';

interface AppointmentManagementPageProps {
  appointments: Appointment[];
}

export const AppointmentManagementPage: React.FC<AppointmentManagementPageProps> = ({
  appointments,
}) => {
  const [statusTab, setStatusTab] = useState<'all' | AppointmentStatus>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('Fri, Nov 21');
  const [newSlot, setNewSlot] = useState('11:00 AM');
  const [newModality, setNewModality] = useState<Modality>('in-person');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  const filtered = appointments.filter((a) => {
    const matchesTab = statusTab === 'all' || a.status === statusTab;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      a.patientName.toLowerCase().includes(q) ||
      a.bookingCode.toLowerCase().includes(q) ||
      (a.reason || '').toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const handleStatusChange = async (id: string, nextStatus: AppointmentStatus) => {
    setBusyId(id);
    try {
      await updateAppointmentStatus(id, nextStatus);
      showToast(`Appointment updated to ${nextStatus}.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkApprovePending = async () => {
    const pending = appointments.filter((a) => a.status === 'pending');
    if (pending.length === 0) return;
    setBusyId('bulk');
    try {
      for (const a of pending) {
        await updateAppointmentStatus(a.id, 'confirmed');
      }
      showToast(`Approved ${pending.length} pending appointment request(s).`);
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
      showToast(`Rescheduled ${rescheduleTarget.patientName} to ${newDate} • ${newSlot}`);
      setRescheduleTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-lg">
          {toast}
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-surface-container-lowest p-4 border border-outline-variant/25">
          <p className="text-xs text-on-surface-variant font-semibold">Pending Queue</p>
          <p className="text-2xl font-bold text-primary mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-lowest p-4 border border-outline-variant/25">
          <p className="text-xs text-on-surface-variant font-semibold">Confirmed</p>
          <p className="text-2xl font-bold text-secondary mt-1">{confirmedCount}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-lowest p-4 border border-outline-variant/25">
          <p className="text-xs text-on-surface-variant font-semibold">Completed</p>
          <p className="text-2xl font-bold text-primary mt-1">{completedCount}</p>
        </div>
        <div className="rounded-2xl bg-secondary-container/60 p-4 border border-secondary/20">
          <p className="text-xs text-on-secondary-container font-semibold">AI Load Balance</p>
          <p className="text-sm font-bold text-primary mt-1">88% Optimal Pod Utilization</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-surface-container-low p-1 rounded-xl">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap cursor-pointer ${
                statusTab === tab
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-2 rounded-xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-secondary text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter patient or #MS code..."
              className="text-xs bg-transparent outline-none w-44 sm:w-56"
            />
          </div>
          {pendingCount > 0 && (
            <button
              type="button"
              disabled={busyId === 'bulk'}
              onClick={handleBulkApprovePending}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer shrink-0"
            >
              Approve All ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/25 clinical-shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/25 bg-surface-container-low/60 text-[11px] uppercase tracking-wider text-secondary">
              <th className="py-3.5 px-4 font-bold">Booking</th>
              <th className="py-3.5 px-4 font-bold">Patient &amp; Reason</th>
              <th className="py-3.5 px-4 font-bold">Date &amp; Slot</th>
              <th className="py-3.5 px-4 font-bold">Modality</th>
              <th className="py-3.5 px-4 font-bold">Status</th>
              <th className="py-3.5 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-on-surface-variant text-sm">
                  No appointments match the selected filter.
                </td>
              </tr>
            ) : (
              filtered.map((appt) => {
                const isTerminal = appt.status === 'completed' || appt.status === 'cancelled';
                return (
                  <tr key={appt.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-primary">
                      {appt.bookingCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-primary text-sm">{appt.patientName}</p>
                      <p className="text-xs text-on-surface-variant line-clamp-1">{appt.reason}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-semibold text-primary">{appt.dateLabel}</p>
                      <p className="text-on-surface-variant">{appt.timeSlot}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low text-xs font-semibold capitalize text-primary">
                        <span className="material-symbols-outlined text-[14px]">
                          {appt.modality === 'video' ? 'videocam' : 'apartment'}
                        </span>
                        {appt.modality}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                          appt.status === 'confirmed'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : appt.status === 'pending'
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                            : appt.status === 'completed'
                            ? 'bg-primary-fixed text-on-primary-fixed'
                            : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isTerminal ? (
                        <span className="text-xs text-outline italic">Locked</span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          {appt.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busyId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'confirmed')}
                              className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-xs font-semibold cursor-pointer"
                            >
                              Accept
                            </button>
                          )}
                          {appt.status === 'confirmed' && (
                            <button
                              type="button"
                              disabled={busyId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-secondary text-on-secondary text-xs font-semibold cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleTarget(appt);
                              setNewDate(appt.dateLabel);
                              setNewSlot(appt.timeSlot);
                              setNewModality(appt.modality);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold cursor-pointer"
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            disabled={busyId === appt.id}
                            onClick={() => handleStatusChange(appt.id, 'cancelled')}
                            className="px-2.5 py-1 rounded-lg bg-error-container/70 text-on-error-container text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveReschedule}
            className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-primary">
              Reschedule {rescheduleTarget.patientName} ({rescheduleTarget.bookingCode})
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Date</label>
                <input
                  type="text"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Time Slot</label>
                <input
                  type="text"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Modality</label>
                <select
                  value={newModality}
                  onChange={(e) => setNewModality(e.target.value as Modality)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                >
                  <option value="in-person">In-Person Clinic</option>
                  <option value="video">HD Video Visit</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="px-4 py-2 rounded-xl bg-surface-container-low text-xs font-semibold text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === rescheduleTarget.id}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer"
              >
                Confirm Reschedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
