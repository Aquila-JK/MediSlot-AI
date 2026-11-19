import React, { useState } from 'react';
import { PatientRecord, RiskLevel } from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';
import { registerNewPatient } from '../../services/firestoreService.ts';

interface PatientManagementPageProps {
  clinicianUid: string;
  patients: PatientRecord[];
}

export const PatientManagementPage: React.FC<PatientManagementPageProps> = ({
  clinicianUid,
  patients,
}) => {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | RiskLevel>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Registration Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('54');
  const [gender, setGender] = useState('Female');
  const [condition, setCondition] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Moderate');
  const [bp, setBp] = useState('128/82');
  const [hr, setHr] = useState('76');
  const [spo2, setSpo2] = useState('98');
  const [submitting, setSubmitting] = useState(false);

  const filtered = patients.filter((p) => {
    const matchesRisk = riskFilter === 'All' || p.riskLevel === riskFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      (p.condition || '').toLowerCase().includes(q);
    return matchesRisk && matchesQuery;
  });

  const activePatient =
    filtered.find((p) => p.id === selectedId) || filtered[0] || patients[0] || null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await registerNewPatient(clinicianUid, {
        name,
        age: Number(age) || 45,
        gender,
        condition: condition || 'Cardiology Intake Evaluation',
        riskLevel,
        bloodPressure: bp,
        heartRate: Number(hr) || 74,
        spo2: Number(spo2) || 98,
      });
      setName('');
      setCondition('');
      setShowRegisterModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['All', 'High Risk', 'Moderate', 'Stable'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setRiskFilter(tier)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                riskFilter === tier
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {tier}
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
              placeholder="Search patient or MRN..."
              className="text-xs bg-transparent outline-none w-44 sm:w-56"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Register Patient</span>
          </button>
        </div>
      </div>

      {/* Split Layout: Roster + Sticky Quick Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Roster */}
        <div className="lg:col-span-7 space-y-3">
          {filtered.map((patient) => {
            const isSelected = activePatient?.id === patient.id;
            return (
              <div
                key={patient.id}
                onClick={() => setSelectedId(patient.id)}
                className={`rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-surface-container-lowest border-primary clinical-shadow'
                    : 'bg-surface-container-low/80 border-outline-variant/25 hover:bg-surface-container-lowest'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={patient.avatarUrl || ASSETS.patientEleanorVance}
                    alt={patient.name}
                    className="w-12 h-12 rounded-2xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-primary text-sm truncate">{patient.name}</h3>
                      <span className="text-[11px] font-mono text-secondary">{patient.mrn}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">
                      {patient.age} yrs • {patient.condition}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:block text-right text-xs">
                    <p className="font-bold text-primary">{patient.bloodPressure} mmHg</p>
                    <p className="text-on-surface-variant">{patient.heartRate} bpm</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      patient.riskLevel === 'High Risk'
                        ? 'bg-error-container text-on-error-container'
                        : patient.riskLevel === 'Moderate'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : 'bg-secondary-container text-on-secondary-container'
                    }`}
                  >
                    {patient.riskLevel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Sticky Clinical Quick Inspector */}
        {activePatient && (
          <div className="lg:col-span-5 lg:sticky lg:top-24 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/25 editorial-shadow space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={activePatient.avatarUrl || ASSETS.patientEleanorVance}
                  alt={activePatient.name}
                  className="w-14 h-14 rounded-2xl object-cover"
                />
                <div>
                  <span className="text-[11px] font-mono font-bold text-secondary">
                    {activePatient.mrn}
                  </span>
                  <h2 className="text-lg font-bold text-primary">{activePatient.name}</h2>
                  <p className="text-xs text-on-surface-variant">
                    {activePatient.age} yrs • {activePatient.gender || 'Patient'}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  activePatient.riskLevel === 'High Risk'
                    ? 'bg-error-container text-on-error-container'
                    : activePatient.riskLevel === 'Moderate'
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                    : 'bg-secondary-container text-on-secondary-container'
                }`}
              >
                {activePatient.riskLevel}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-1">
                Primary Clinical Focus
              </p>
              <p className="text-sm font-medium text-primary">{activePatient.condition}</p>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-surface-container-low">
                <p className="text-[10px] uppercase font-bold text-secondary">Blood Pressure</p>
                <p className="text-sm font-bold text-primary mt-0.5">{activePatient.bloodPressure}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low">
                <p className="text-[10px] uppercase font-bold text-secondary">Heart Rate</p>
                <p className="text-sm font-bold text-primary mt-0.5">{activePatient.heartRate} bpm</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low">
                <p className="text-[10px] uppercase font-bold text-secondary">SpO2</p>
                <p className="text-sm font-bold text-primary mt-0.5">{activePatient.spo2}%</p>
              </div>
            </div>

            {/* SVG ECG Sparkline */}
            <div className="p-4 rounded-xl bg-primary text-on-primary space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary-fixed">Live Telemetry Strip (Lead II)</span>
                <span className="text-tertiary-fixed font-mono">{activePatient.heartRate} BPM</span>
              </div>
              <svg viewBox="0 0 300 48" className="w-full h-10 stroke-secondary-container fill-none" strokeWidth="2">
                <polyline points="0,26 28,26 36,20 44,26 60,26 68,8 76,42 84,22 92,26 128,26 136,20 144,26 164,26 172,6 180,42 188,22 196,26 234,26 242,20 250,26 266,26 274,10 282,40 290,26 300,26" />
              </svg>
            </div>

            {/* Encounters Timeline */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Clinical Encounters
              </p>
              <div className="space-y-2">
                {(activePatient.encounters || ['Initial intake chart synced.']).map((enc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant"
                  >
                    {enc}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Register New Patient Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={handleRegister}
            className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-primary">Register New Patient</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-primary block mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Clara Higgins"
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Non-binary</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-primary block mb-1">
                  Primary Condition / Intake Notes
                </label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g. Intermittent palpitations & dizziness"
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Risk Tier</label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                >
                  <option value="Stable">Stable</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High Risk">High Risk</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Blood Pressure</label>
                <input
                  type="text"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={hr}
                  onChange={(e) => setHr(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-low text-xs font-semibold text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Create Patient Chart'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
