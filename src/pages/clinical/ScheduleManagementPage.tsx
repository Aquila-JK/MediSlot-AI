import React, { useState } from 'react';
import { DayOfWeek, DoctorProfileSettings, ScheduleSlot } from '../../types.ts';
import {
  addScheduleSlot,
  deleteScheduleSlot,
  saveDoctorProfileSettings,
  updateScheduleSlotStatus,
} from '../../services/firestoreService.ts';

interface ScheduleManagementPageProps {
  clinicianUid: string;
  schedules: ScheduleSlot[];
  doctorProfile: DoctorProfileSettings | null;
}

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ScheduleManagementPage: React.FC<ScheduleManagementPageProps> = ({
  clinicianUid,
  schedules,
  doctorProfile,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('Thu');
  const [startTime, setStartTime] = useState('02:00 PM');
  const [endTime, setEndTime] = useState('04:30 PM');
  const [modality, setModality] = useState<ScheduleSlot['modality']>('hybrid');
  const [notes, setNotes] = useState('Open Specialist Consults');
  const [saving, setSaving] = useState(false);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addScheduleSlot(clinicianUid, {
        dayOfWeek,
        startTime,
        endTime,
        modality,
        notes,
      });
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (slot: ScheduleSlot) => {
    if (slot.status === 'booked') return;
    await updateScheduleSlotStatus(slot.id, slot.status === 'blocked' ? 'available' : 'blocked');
  };

  const handleToggleAccepting = async () => {
    if (!doctorProfile) return;
    await saveDoctorProfileSettings(clinicianUid, {
      ...doctorProfile,
      acceptingNewPatients: !doctorProfile.acceptingNewPatients,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Weekly Clinic Matrix</h2>
          <p className="text-sm text-on-surface-variant">
            Click any open or blocked clinic block to toggle availability, or add new consultation hours.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer flex items-center gap-1.5 self-start"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Available Slot</span>
        </button>
      </div>

      {/* Weekly 6-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {DAYS.map((day) => {
          const daySlots = schedules.filter((s) => s.dayOfWeek === day);
          return (
            <div
              key={day}
              className="rounded-2xl bg-surface-container-low p-4 border border-outline-variant/25 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/25 pb-2">
                <span className="font-bold text-primary text-sm">{day}</span>
                <span className="text-[11px] font-semibold text-secondary">
                  {daySlots.length} block{daySlots.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-2.5">
                {daySlots.length === 0 ? (
                  <p className="text-xs text-outline italic py-4 text-center">No blocks</p>
                ) : (
                  daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => handleToggleBlock(slot)}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                        slot.status === 'booked'
                          ? 'bg-primary text-on-primary border-primary'
                          : slot.status === 'blocked'
                          ? 'bg-surface-container text-on-surface-variant border-outline-variant/40 cursor-pointer'
                          : 'bg-surface-container-lowest text-primary border-secondary/30 hover:border-primary cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold">
                          {slot.startTime}
                        </span>
                        {slot.status !== 'booked' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteScheduleSlot(slot.id);
                            }}
                            className="opacity-60 hover:opacity-100 cursor-pointer"
                            title="Remove block"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] opacity-80">to {slot.endTime}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider">
                          {slot.modality}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            slot.status === 'booked'
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : slot.status === 'blocked'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-secondary-container text-on-secondary-container'
                          }`}
                        >
                          {slot.status}
                        </span>
                      </div>
                      {slot.patientName && (
                        <p className="text-[11px] font-semibold truncate pt-0.5">{slot.patientName}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Availability Rules & Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/25 clinical-shadow space-y-4">
          <h3 className="text-base font-bold text-primary">Availability Rules</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-container-low">
              <p className="text-on-surface-variant">Buffer Between Visits</p>
              <p className="text-lg font-bold text-primary mt-0.5">
                {doctorProfile?.bufferMinutes ?? 10} mins
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-low">
              <p className="text-on-surface-variant">Max Daily Consults</p>
              <p className="text-lg font-bold text-primary mt-0.5">
                {doctorProfile?.maxDailyConsults ?? 18} slots
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low">
            <div>
              <p className="text-xs font-bold text-primary">Accepting New Patient Bookings</p>
              <p className="text-[11px] text-on-surface-variant">
                Controls visibility in Patient Find Doctors directory
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAccepting}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                doctorProfile?.acceptingNewPatients ?? true
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {doctorProfile?.acceptingNewPatients ?? true ? 'Active' : 'Paused'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-container-low p-6 border border-outline-variant/25 space-y-3">
          <h3 className="text-base font-bold text-primary">Active Clinic Integrations</h3>
          <div className="p-3.5 rounded-xl bg-surface-container-lowest flex items-center justify-between">
            <span className="text-xs font-bold text-primary">Epic EHR Calendar Bi-Directional Sync</span>
            <span className="text-[11px] font-bold text-secondary">Connected</span>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-lowest flex items-center justify-between">
            <span className="text-xs font-bold text-primary">HD HIPAA Video Room Provisioner</span>
            <span className="text-[11px] font-bold text-secondary">Ready</span>
          </div>
        </div>
      </div>

      {/* Add Available Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSlot}
            className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-primary">Add Clinic Availability Block</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-primary block mb-1">Start Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-primary block mb-1">End Time</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Modality</label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value as ScheduleSlot['modality'])}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                >
                  <option value="in-person">In-Person Only</option>
                  <option value="video">HD Video Only</option>
                  <option value="hybrid">Hybrid (In-Person or Video)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-low text-xs font-semibold text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer"
              >
                {saving ? 'Adding...' : 'Publish Slot'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
