import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Doctor, PatientRoute } from '../types.ts';
import { CustomerResponseWidget } from './CustomerResponseWidget.tsx';

interface PatientShellProps {
  currentRoute: PatientRoute;
  onNavigate: (route: PatientRoute) => void;
  doctors?: Doctor[];
  onSelectDoctor?: (doctor: Doctor) => void;
  children: React.ReactNode;
}

export const PatientShell: React.FC<PatientShellProps> = ({
  currentRoute,
  onNavigate,
  doctors = [],
  onSelectDoctor,
  children,
}) => {
  const { profile, switchPortal, logout } = useAuth();

  const navItems: { route: PatientRoute; label: string; icon: string }[] = [
    { route: 'home', label: 'Home', icon: 'home' },
    { route: 'find-doctors', label: 'Find Doctors', icon: 'search' },
    { route: 'dashboard', label: 'My Visits & EHR', icon: 'calendar_month' },
    { route: 'ai-assistant', label: 'AI Chatbot', icon: 'smart_toy' },
    { route: 'support', label: 'Support & FAQs', icon: 'support_agent' },
  ];

  const isNavActive = (r: PatientRoute) => {
    if (r === 'find-doctors' && currentRoute === 'doctor-profile') return true;
    if (r === 'dashboard' && currentRoute === 'appointment-confirmation') return true;
    return currentRoute === r;
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col pb-24 md:pb-0">
      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-outline-variant/25">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Logo & Pavilion Status */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-on-primary text-[20px]">vital_signs</span>
              </div>
              <span className="text-lg font-bold text-primary tracking-tight">
                MediSlot<span className="text-on-tertiary-container ml-0.5">AI</span>
              </span>
            </button>
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Pavilion B Atrium Open</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const active = isNavActive(item.route);
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-primary-container text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick 1-Click Book CTA Button */}
            <button
              type="button"
              onClick={() => onNavigate('find-doctors')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Book Visit</span>
            </button>

            {/* Portal Switcher */}
            <button
              type="button"
              onClick={() => switchPortal('clinical')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-semibold hover:bg-secondary-fixed transition-colors cursor-pointer"
              title="Switch to Clinical Physician Suite"
            >
              <span className="material-symbols-outlined text-[16px]">stethoscope</span>
              <span className="hidden lg:inline">Doctor Suite</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/30">
              <div
                className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold"
                title={profile?.displayName || 'Eleanor Vance'}
              >
                {(profile?.displayName || 'E').charAt(0).toUpperCase()}
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 md:py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-outline-variant/30 px-1 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const active = isNavActive(item.route);
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => onNavigate(item.route)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-semibold cursor-pointer ${
                active ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  active ? 'text-primary' : 'text-on-surface-variant'
                }`}
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => switchPortal('clinical')}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-semibold text-secondary cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">stethoscope</span>
          <span>Doctor</span>
        </button>
      </nav>

      {/* Always-Available Customer Care & AI Response Widget */}
      <CustomerResponseWidget
        userName={profile?.displayName || 'Eleanor Vance'}
        doctors={doctors}
        onNavigate={onNavigate}
        onSelectDoctor={onSelectDoctor}
      />
    </div>
  );
};
