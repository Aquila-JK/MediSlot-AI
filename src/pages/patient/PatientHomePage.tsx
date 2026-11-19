import React, { useState } from 'react';
import { Appointment, Doctor, PatientRoute } from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';

interface PatientHomePageProps {
  userName: string;
  doctors: Doctor[];
  appointments: Appointment[];
  onNavigate: (route: PatientRoute) => void;
  onSelectDoctor: (doctor: Doctor, preselectedSlot?: string) => void;
  onSearchDoctors: (queryText: string, specialty: string) => void;
}

const SPECIALTIES = ['All', 'Cardiology', 'Neurology', 'Dermatology', 'Orthopedics'];

export const PatientHomePage: React.FC<PatientHomePageProps> = ({
  userName,
  doctors,
  appointments,
  onNavigate,
  onSelectDoctor,
  onSearchDoctors,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('All');

  const nextAppt = appointments.find((a) => a.status === 'confirmed' || a.status === 'pending');

  const filteredDoctors = doctors
    .filter((d) => activeSpecialty === 'All' || d.specialty === activeSpecialty)
    .slice(0, 4);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchDoctors(searchInput, activeSpecialty);
    onNavigate('find-doctors');
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-primary text-on-primary p-6 sm:p-10 editorial-shadow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-primary-fixed text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
              <span>Welcome back, {userName}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.12]">
              Effortless specialist care, matched to your symptoms.
            </h1>
            <p className="text-sm sm:text-base text-primary-fixed-dim max-w-xl leading-relaxed">
              Reserve same-week cardiology, neurology, or dermatology consultations at Meridian Medical Pavilion or connect over HD telehealth.
            </p>

            {/* Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface-container-lowest p-2 rounded-2xl shadow-lg text-on-surface"
            >
              <div className="flex items-center gap-2.5 px-3 flex-1">
                <span className="material-symbols-outlined text-secondary text-[20px]">search</span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search doctor, specialty, or symptom..."
                  className="w-full py-2 text-sm bg-transparent outline-none placeholder:text-outline"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-colors cursor-pointer shrink-0"
              >
                Find Care
              </button>
            </form>
          </div>

          {/* Right Pavilion Card / Next Visit */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-primary-container/90 border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-tertiary-fixed">
                  {nextAppt ? 'Next Scheduled Visit' : 'Pavilion B Atrium'}
                </span>
                <span className="text-xs text-primary-fixed-dim">
                  {nextAppt ? nextAppt.bookingCode : 'Open Today'}
                </span>
              </div>
              {nextAppt ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={nextAppt.doctorAvatar || ASSETS.drSarahJenkins}
                      alt={nextAppt.doctorName}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-bold text-white text-sm">{nextAppt.doctorName}</p>
                      <p className="text-xs text-primary-fixed-dim">
                        {nextAppt.dateLabel} • {nextAppt.timeSlot}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-primary-fixed capitalize">
                      {nextAppt.modality} visit
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('dashboard')}
                      className="text-xs font-semibold text-tertiary-fixed hover:underline cursor-pointer"
                    >
                      Manage Visit →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <img
                    src={ASSETS.pavilionB}
                    alt="Pavilion B Facility"
                    className="w-full h-32 rounded-xl object-cover"
                  />
                  <p className="text-xs text-primary-fixed-dim">
                    450 Meridian Parkway • Same-day diagnostic echo &amp; concierge check-in available.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Specialty Filter Pills + Featured Specialists */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary">Featured Specialists</h2>
            <p className="text-sm text-on-surface-variant">
              Select a live slot below or inspect full physician credentials.
            </p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {SPECIALTIES.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => setActiveSpecialty(spec)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeSpecialty === spec
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredDoctors.map((docItem) => (
            <div
              key={docItem.id}
              className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/25 clinical-shadow flex flex-col justify-between hover:border-secondary/60 transition-all"
            >
              <div>
                <div className="flex items-start gap-3.5 mb-4">
                  <img
                    src={docItem.avatarUrl || ASSETS.drSarahJenkins}
                    alt={docItem.name}
                    className="w-14 h-14 rounded-2xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                      {docItem.specialty}
                    </span>
                    <h3 className="font-bold text-primary text-sm leading-snug truncate">
                      {docItem.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                      <span className="text-on-tertiary-container font-bold">★ {docItem.rating}</span>
                      <span>({docItem.reviewCount})</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2 mb-4">{docItem.location}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(docItem.slots || []).slice(0, 3).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => onSelectDoctor(docItem, slot)}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-secondary-container text-primary text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                <span className="text-sm font-bold text-primary">${docItem.fee}</span>
                <button
                  type="button"
                  onClick={() => onSelectDoctor(docItem)}
                  className="text-xs font-semibold text-secondary hover:text-primary cursor-pointer"
                >
                  View Profile →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Clinical Concierge Callout */}
      <section className="rounded-2xl bg-surface-container-low border border-outline-variant/30 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">smart_toy</span>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Powered by MediSlot AI Triage
            </span>
            <h3 className="text-xl font-bold text-primary mt-0.5">
              Unsure which specialist or test you need?
            </h3>
            <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
              Describe your symptoms in plain language. Our AI Clinical Concierge recommends the right specialist, priority urgency, and preparation checklist in seconds.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('ai-assistant')}
          className="px-5 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container transition-colors shrink-0 cursor-pointer flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          <span>Ask AI Concierge</span>
        </button>
      </section>
    </div>
  );
};
