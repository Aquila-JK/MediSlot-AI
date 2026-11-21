import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { PortalMode } from '../types.ts';
import { ASSETS } from '../data/seedData.ts';

interface PortalLoginPageProps {
  onEnterPatientDashboard: () => void;
  onEnterClinicalDashboard: () => void;
  onOpenChatbot?: () => void;
}

export const PortalLoginPage: React.FC<PortalLoginPageProps> = ({
  onEnterPatientDashboard,
  onEnterClinicalDashboard,
  onOpenChatbot,
}) => {
  const { enterPortal } = useAuth();
  const [selectedPortal, setSelectedPortal] = useState<PortalMode>('patient');

  const handlePatientSignIn = () => {
    setSelectedPortal('patient');
    enterPortal('patient');
    onEnterPatientDashboard();
  };

  const handleClinicalSignUp = () => {
    setSelectedPortal('clinical');
    enterPortal('clinical');
    onEnterClinicalDashboard();
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Top Bar */}
      <header className="w-full px-6 md:px-12 h-20 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-on-primary text-[22px]">vital_signs</span>
          </div>
          <div>
            <span className="text-xl font-bold text-primary tracking-tight">
              MediSlot<span className="text-on-tertiary-container ml-0.5">AI</span>
            </span>
            <p className="text-[11px] uppercase tracking-[0.08em] text-secondary font-semibold leading-none mt-0.5">
              Clinical &amp; Concierge Suite
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onOpenChatbot && (
            <button
              type="button"
              onClick={onOpenChatbot}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/25 text-xs font-bold hover:bg-primary hover:text-white transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[17px] text-secondary">smart_toy</span>
              <span>Ask AI Chatbot</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-xs font-semibold text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            <span>Instant Portal Access</span>
          </div>
        </div>
      </header>

      {/* Main Split Portal Selection */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Editorial Hero */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-semibold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>Unified Medical Access</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight leading-[1.12]">
            Calm, intelligent scheduling for patients &amp; physicians.
          </h1>
          <p className="text-base text-on-surface-variant leading-relaxed">
            Select your portal below to go straight to your Patient Dashboard or Clinical Dashboard—no email, password, or third-party login required.
          </p>

          {onOpenChatbot && (
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between gap-4 shadow-sm hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-secondary text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">Need medical triage or appointment help?</p>
                  <p className="text-[11px] text-on-surface-variant">Chat with MediSlot AI for symptoms, open doctor slots, and refills.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenChatbot}
                className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <span>Launch Chatbot</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/30 editorial-shadow">
            <img
              src={ASSETS.pavilionB}
              alt="Pavilion B Heart and Vascular Center Atrium"
              className="w-full h-48 object-cover"
            />
            <div className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Meridian Medical Pavilion
                </p>
                <p className="text-sm font-semibold text-primary mt-0.5">
                  Cardiology • Neurology • Dermatology • Orthopedics
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-primary">4.9 ★</p>
                <p className="text-[11px] text-on-surface-variant">1,200+ Verified Visits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Dual-Portal Cards */}
        <div className="lg:col-span-7 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Patient Portal Card */}
            <div
              onClick={() => setSelectedPortal('patient')}
              className={`rounded-2xl p-6 transition-all cursor-pointer border-2 flex flex-col justify-between ${
                selectedPortal === 'patient'
                  ? 'bg-surface-container-lowest border-primary editorial-shadow'
                  : 'bg-surface-container-low border-outline-variant/30 hover:border-secondary'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">person_heart</span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      selectedPortal === 'patient'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    Patient Care
                  </span>
                </div>
                <h2 className="text-xl font-bold text-primary mb-2">Patient Portal</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
                  Search top specialists, pick same-week in-person or HD video slots, request refills, and chat with MediSlot AI Triage Concierge.
                </p>
                <ul className="space-y-2 text-xs text-on-surface-variant mb-6">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                    <span>Instant specialist slot booking &amp; .ics pass</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                    <span>AI symptom routing &amp; prep checklists</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                    <span>Live prescriptions &amp; pre-check-in</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePatientSignIn();
                }}
                className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">person_check</span>
                <span>Enter Patient Portal</span>
              </button>
            </div>

            {/* Clinical Dashboard Card */}
            <div
              onClick={() => setSelectedPortal('clinical')}
              className={`rounded-2xl p-6 transition-all cursor-pointer border-2 flex flex-col justify-between ${
                selectedPortal === 'clinical'
                  ? 'bg-primary text-on-primary border-primary editorial-shadow'
                  : 'bg-surface-container-low border-outline-variant/30 hover:border-primary'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedPortal === 'clinical'
                        ? 'bg-primary-container text-primary-fixed'
                        : 'bg-primary text-on-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[26px]">stethoscope</span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      selectedPortal === 'clinical'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    Physician Suite
                  </span>
                </div>
                <h2
                  className={`text-xl font-bold mb-2 ${
                    selectedPortal === 'clinical' ? 'text-on-primary' : 'text-primary'
                  }`}
                >
                  Clinical Dashboard
                </h2>
                <p
                  className={`text-sm leading-relaxed mb-5 ${
                    selectedPortal === 'clinical' ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
                  }`}
                >
                  Manage daily clinic queues, approve booking requests, inspect patient ECG &amp; vitals, configure weekly blocks, and query Doctor AI Copilot.
                </p>
                <ul
                  className={`space-y-2 text-xs mb-6 ${
                    selectedPortal === 'clinical' ? 'text-primary-fixed' : 'text-on-surface-variant'
                  }`}
                >
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-tertiary-container text-[16px]">
                      check_circle
                    </span>
                    <span>Live appointment triage &amp; rescheduling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-tertiary-container text-[16px]">
                      check_circle
                    </span>
                    <span>Patient vitals inspector &amp; Holter alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-tertiary-container text-[16px]">
                      check_circle
                    </span>
                    <span>Gemini-powered clinical workflow copilot</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClinicalSignUp();
                }}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  selectedPortal === 'clinical'
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim'
                    : 'bg-primary text-on-primary hover:bg-primary-container'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                <span>Enter Doctor Clinical Suite</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-center text-on-surface-variant pt-2">
            Direct workspace access — no Google account, email, or password required. Switch between Patient and Clinical views anytime from the top bar.
          </p>
        </div>
      </main>
    </div>
  );
};
