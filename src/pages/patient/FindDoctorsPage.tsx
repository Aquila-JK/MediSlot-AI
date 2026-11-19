import React, { useState } from 'react';
import { Doctor, PatientRoute } from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';

interface FindDoctorsPageProps {
  doctors: Doctor[];
  initialSearch?: string;
  initialSpecialty?: string;
  onSelectDoctor: (doctor: Doctor, preselectedSlot?: string) => void;
  onNavigate: (route: PatientRoute) => void;
}

const SPECIALTIES = ['All', 'Cardiology', 'Neurology', 'Dermatology', 'Orthopedics'];
const LOCATIONS = [
  'All Campuses',
  'Pavilion B',
  'Midtown Medical Plaza',
  'Harborview Medical Wing',
  'Westside Orthopedic',
];

export const FindDoctorsPage: React.FC<FindDoctorsPageProps> = ({
  doctors,
  initialSearch = '',
  initialSpecialty = 'All',
  onSelectDoctor,
  onNavigate,
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [locationFilter, setLocationFilter] = useState('All Campuses');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedSlotMap, setSelectedSlotMap] = useState<Record<string, string>>({});

  const toggleSave = (id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filtered = doctors.filter((doc) => {
    const matchesSpec = specialty === 'All' || doc.specialty === specialty;
    const matchesLoc =
      locationFilter === 'All Campuses' ||
      doc.location.toLowerCase().includes(locationFilter.toLowerCase());
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      doc.name.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      (doc.bio || '').toLowerCase().includes(q) ||
      (doc.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchesSpec && matchesLoc && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Meridian Specialist Directory
          </span>
          <h1 className="text-3xl font-bold text-primary mt-1">Find Your Specialist</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Browse board-certified physicians with real-time clinic and telehealth availability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('ai-assistant')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-semibold hover:bg-secondary-fixed transition-colors cursor-pointer self-start"
        >
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          <span>Need AI Triage Routing?</span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="rounded-2xl bg-surface-container-low p-4 sm:p-5 border border-outline-variant/25 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex items-center gap-2.5 bg-surface-container-lowest px-3.5 py-2.5 rounded-xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-secondary text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor name, specialty, or condition (e.g. AFib, Migraine)..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-outline"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-outline hover:text-primary cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="bg-surface-container-lowest px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-medium text-primary outline-none cursor-pointer"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {SPECIALTIES.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSpecialty(spec)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                specialty === spec
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-surface-container-low p-10 text-center space-y-3">
          <span className="material-symbols-outlined text-[40px] text-outline">person_search</span>
          <h3 className="text-lg font-bold text-primary">No specialists match those filters</h3>
          <p className="text-sm text-on-surface-variant">
            Try clearing your campus or specialty filter, or ask the AI Clinical Concierge.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSpecialty('All');
              setLocationFilter('All Campuses');
            }}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((docItem) => {
            const chosenSlot = selectedSlotMap[docItem.id] || docItem.slots?.[0] || '09:30 AM';
            const isSaved = savedIds.includes(docItem.id);
            return (
              <div
                key={docItem.id}
                className="rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/25 clinical-shadow flex flex-col justify-between gap-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={docItem.avatarUrl || ASSETS.drSarahJenkins}
                      alt={docItem.name}
                      className="w-16 h-16 rounded-2xl object-cover shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                          {docItem.specialty}
                        </span>
                        <span className="text-xs font-bold text-on-tertiary-container">
                          ★ {docItem.rating} ({docItem.reviewCount} reviews)
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-primary mt-1">{docItem.name}</h2>
                      <p className="text-xs text-on-surface-variant">
                        {docItem.title} • {docItem.experience}
                      </p>
                      <p className="text-xs text-secondary font-medium mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        <span>{docItem.location}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSave(docItem.id)}
                    className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary cursor-pointer shrink-0"
                    title="Bookmark specialist"
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={isSaved ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {isSaved ? 'bookmark' : 'bookmark_border'}
                    </span>
                  </button>
                </div>

                <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2">
                  {docItem.bio}
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary">Next Available Times (Tomorrow)</span>
                    <span className="text-on-surface-variant">Consultation Fee: ${docItem.fee}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(docItem.slots || ['09:30 AM', '11:00 AM', '02:15 PM']).map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          setSelectedSlotMap((prev) => ({ ...prev, [docItem.id]: slot }))
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          chosenSlot === slot
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-low text-primary hover:bg-secondary-container'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectDoctor(docItem)}
                    className="text-xs font-semibold text-secondary hover:text-primary cursor-pointer"
                  >
                    Full Biography &amp; Reviews
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectDoctor(docItem, chosenSlot)}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer"
                  >
                    Book {chosenSlot} →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
