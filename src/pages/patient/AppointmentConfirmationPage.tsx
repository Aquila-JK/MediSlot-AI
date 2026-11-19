import React from 'react';
import { Appointment, PatientRoute } from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';

interface AppointmentConfirmationPageProps {
  appointment: Appointment | null;
  onNavigate: (route: PatientRoute) => void;
}

export const AppointmentConfirmationPage: React.FC<AppointmentConfirmationPageProps> = ({
  appointment,
  onNavigate,
}) => {
  if (!appointment) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl bg-surface-container-low p-8 text-center space-y-4">
        <span className="material-symbols-outlined text-[42px] text-secondary">event_note</span>
        <h2 className="text-xl font-bold text-primary">No Active Booking Selected</h2>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold cursor-pointer"
        >
          Go to Patient Dashboard
        </button>
      </div>
    );
  }

  const handleDownloadIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MediSlot AI//Clinical Scheduling//EN',
      'BEGIN:VEVENT',
      `UID:${appointment.id}@medislot.ai`,
      `SUMMARY:MediSlot AI Consultation — ${appointment.doctorName}`,
      `DESCRIPTION:Booking ${appointment.bookingCode} (${appointment.modality}) • ${appointment.reason || ''}`,
      `LOCATION:${appointment.clinicLocation || 'Pavilion B Heart & Vascular Center'}`,
      'DTSTART:20261119T093000',
      'DTEND:20261119T100000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medislot-${appointment.bookingCode.replace('#', '')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Confirmation Header */}
      <div className="rounded-3xl bg-primary text-on-primary p-8 text-center space-y-3 editorial-shadow">
        <div className="w-14 h-14 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[30px]">check_circle</span>
        </div>
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-tertiary-fixed">
          Booking Confirmed • {appointment.bookingCode}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold">Your Consultation Is Reserved</h1>
        <p className="text-sm text-primary-fixed-dim max-w-lg mx-auto">
          A digital pre-check-in pass and clinic instructions have been synced to your MediSlot Patient Dashboard.
        </p>
      </div>

      {/* Main Ticket Card */}
      <div className="rounded-2xl bg-surface-container-lowest p-6 sm:p-8 border border-outline-variant/30 clinical-shadow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/25">
          <div className="flex items-center gap-4">
            <img
              src={appointment.doctorAvatar || ASSETS.drSarahJenkins}
              alt={appointment.doctorName}
              className="w-16 h-16 rounded-2xl object-cover"
            />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                {appointment.doctorSpecialty || 'Specialist Consultation'}
              </span>
              <h2 className="text-lg font-bold text-primary">{appointment.doctorName}</h2>
              <p className="text-xs text-on-surface-variant">{appointment.clinicLocation}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-on-surface-variant">Estimated Visit Fee</p>
            <p className="text-xl font-bold text-primary">${appointment.fee}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-surface-container-low">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary">Date</p>
            <p className="text-sm font-bold text-primary mt-1">{appointment.dateLabel}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary">Time</p>
            <p className="text-sm font-bold text-primary mt-1">{appointment.timeSlot}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary">Modality</p>
            <p className="text-sm font-bold text-primary mt-1 capitalize">
              {appointment.modality === 'video' ? 'HD Video Visit' : 'In-Person Clinic'}
            </p>
          </div>
        </div>

        {/* Preparation Checklist */}
        <div className="rounded-xl bg-surface-container-low p-5 space-y-2.5">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">checklist</span>
            <span>Preparation Guidelines</span>
          </h3>
          <ul className="space-y-1.5 text-xs text-on-surface-variant">
            <li>• Bring photo ID, insurance card, and any external lab panels from the last 6 months.</li>
            <li>• Arrive 10 minutes early at Pavilion B Gate B (or join the HD video room 5 minutes prior).</li>
            <li>• Current medication list will auto-sync from your MediSlot record upon pre-check-in.</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="px-4 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-semibold hover:bg-secondary-fixed transition-colors cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
            <span>Add to Calendar (.ics)</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('find-doctors')}
              className="px-4 py-2.5 rounded-xl bg-surface-container-low text-primary text-xs font-semibold hover:bg-surface-container cursor-pointer"
            >
              Book Another Visit
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer"
            >
              View Patient Dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
