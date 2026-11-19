import React, { useState } from 'react';
import { Appointment, Doctor, Modality, PatientRoute } from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';
import { createAppointment } from '../../services/firestoreService.ts';

interface DoctorProfilePageProps {
  doctor: Doctor;
  initialSlot?: string;
  patientUid: string;
  patientName: string;
  onNavigate: (route: PatientRoute) => void;
  onBooked: (appt: Appointment) => void;
}

const DATE_OPTIONS = ['Tomorrow, Nov 19', 'Thu, Nov 20', 'Fri, Nov 21', 'Mon, Nov 24'];

export const DoctorProfilePage: React.FC<DoctorProfilePageProps> = ({
  doctor,
  initialSlot,
  patientUid,
  patientName,
  onNavigate,
  onBooked,
}) => {
  const slots = doctor.slots && doctor.slots.length > 0 ? doctor.slots : ['09:30 AM', '11:00 AM', '02:15 PM'];
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0]);
  const [selectedSlot, setSelectedSlot] = useState(initialSlot || slots[0]);
  const [modality, setModality] = useState<Modality>('in-person');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBooking(true);
    setErrorMsg(null);
    try {
      const created = await createAppointment({
        patientUid,
        patientName,
        doctor,
        dateLabel: selectedDate,
        timeSlot: selectedSlot,
        modality,
        reason: reason || `Consultation with ${doctor.name}`,
      });
      onBooked(created);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to book slot.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => onNavigate('find-doctors')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        <span>Back to Specialists</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Profile Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-surface-container-lowest p-6 sm:p-8 border border-outline-variant/25 clinical-shadow">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <img
                src={doctor.avatarUrl || ASSETS.drSarahJenkins}
                alt={doctor.name}
                className="w-24 h-24 rounded-2xl object-cover shrink-0"
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
                    {doctor.specialty}
                  </span>
                  <span className="text-xs font-bold text-on-tertiary-container">
                    ★ {doctor.rating} ({doctor.reviewCount} verified reviews)
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">{doctor.name}</h1>
                <p className="text-sm font-medium text-on-surface-variant">
                  {doctor.title} • {doctor.experience}
                </p>
                <p className="text-xs text-secondary font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  <span>{doctor.location}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-outline-variant/20 space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                  Clinical Biography
                </h2>
                <p className="text-sm text-on-surface-variant leading-relaxed">{doctor.bio}</p>
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-secondary mb-2">
                  Education &amp; Board Certifications
                </h2>
                <p className="text-sm text-primary font-medium">{doctor.education}</p>
              </div>
              {doctor.tags && doctor.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {doctor.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-lg bg-surface-container-low text-xs font-semibold text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Patient Reviews */}
          <div className="rounded-2xl bg-surface-container-low p-6 border border-outline-variant/25 space-y-4">
            <h2 className="text-lg font-bold text-primary">Verified Patient Reviews</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-container-lowest p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">Eleanor V.</span>
                  <span className="text-on-tertiary-container font-bold">★★★★★</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  "Calm, thorough, and walked me through my echocardiogram line by line. Zero rushing."
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-lowest p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">Julian T.</span>
                  <span className="text-on-tertiary-container font-bold">★★★★★</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  "Telehealth check-in started right on time and the medication plan was synced immediately."
                </p>
              </div>
            </div>
          </div>

          {/* Clinic Campus Card */}
          <div className="rounded-2xl bg-surface-container-lowest overflow-hidden border border-outline-variant/25 flex flex-col sm:flex-row">
            <img
              src={ASSETS.pavilionB}
              alt="Pavilion B Campus"
              className="w-full sm:w-48 h-40 sm:h-auto object-cover"
            />
            <div className="p-5 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Clinic Campus &amp; Access
              </span>
              <h3 className="font-bold text-primary">{doctor.location}</h3>
              <p className="text-xs text-on-surface-variant">
                Valet &amp; patient garage parking at Gate B • Digital pre-check-in bypasses front desk wait.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sticky Booking Widget */}
        <form
          onSubmit={handleConfirmBooking}
          className="lg:col-span-5 lg:sticky lg:top-24 rounded-2xl bg-surface-container-lowest p-6 border-2 border-primary/15 editorial-shadow space-y-5"
        >
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Select Appointment Slot
              </span>
              <h2 className="text-xl font-bold text-primary mt-0.5">Reserve Consultation</h2>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">${doctor.fee}</p>
              <p className="text-[11px] text-on-surface-variant">Est. Co-Pay Covered</p>
            </div>
          </div>

          {/* Modality Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-primary block">Visit Modality</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setModality('in-person')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  modality === 'in-person'
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-low text-primary border-outline-variant/30'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">apartment</span>
                <span>In-Person Clinic</span>
              </button>
              <button
                type="button"
                onClick={() => setModality('video')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  modality === 'video'
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-low text-primary border-outline-variant/30'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">videocam</span>
                <span>HD Video Visit</span>
              </button>
            </div>
          </div>

          {/* Date Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-primary block">Preferred Date</label>
            <div className="grid grid-cols-2 gap-2">
              {DATE_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedDate === d
                      ? 'bg-secondary-container text-on-secondary-fixed ring-1 ring-secondary'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slot Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-primary block">Available Time Slots</label>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedSlot === slot
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-primary hover:bg-surface-container'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Chief Complaint */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-primary block">
              Visit Reason / Clinical Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe symptoms, recent labs, or follow-up questions..."
              className="w-full rounded-xl bg-surface-container-low border border-outline-variant/30 p-3 text-sm outline-none focus:border-primary resize-none"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-error bg-error-container p-3 rounded-xl">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={booking}
            className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">event_available</span>
            <span>{booking ? 'Confirming Slot...' : 'Confirm & Book Slot'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
