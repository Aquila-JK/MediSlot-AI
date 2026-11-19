import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { ClinicalRoute } from '../types.ts';
import { ASSETS } from '../data/seedData.ts';

interface ClinicalShellProps {
  currentRoute: ClinicalRoute;
  onNavigate: (route: ClinicalRoute) => void;
  pendingCount: number;
  unreadNotifCount: number;
  clinicianName: string;
  children: React.ReactNode;
}

export const ClinicalShell: React.FC<ClinicalShellProps> = ({
  currentRoute,
  onNavigate,
  pendingCount,
  unreadNotifCount,
  clinicianName,
  children,
}) => {
  const { switchPortal, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { route: ClinicalRoute; label: string; icon: string; badge?: number }[] = [
    { route: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { route: 'appointments', label: 'Appointments', icon: 'event_note', badge: pendingCount },
    { route: 'patients', label: 'Patients', icon: 'groups' },
    { route: 'schedule', label: 'Schedule', icon: 'calendar_view_week' },
    { route: 'ai-assistant', label: 'AI Assistant', icon: 'auto_awesome' },
    { route: 'notifications', label: 'Notifications', icon: 'notifications', badge: unreadNotifCount },
    { route: 'settings', label: 'Profile & Settings', icon: 'settings' },
  ];

  const routeTitle = navItems.find((n) => n.route === currentRoute)?.label || 'Clinical Suite';

  const handleSelect = (route: ClinicalRoute) => {
    onNavigate(route);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Fixed Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary text-on-primary flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center border border-white/10">
                <span className="material-symbols-outlined text-tertiary-fixed text-[20px]">vital_signs</span>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight block leading-none">
                  MediSlot<span className="text-tertiary-fixed ml-0.5">AI</span>
                </span>
                <span className="text-[11px] text-on-primary-container font-medium">
                  Clinical Suite
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-on-primary-container hover:text-white cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const active = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleSelect(item.route)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-primary-container text-white shadow-sm'
                      : 'text-primary-fixed-dim hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-tertiary-fixed text-on-tertiary-fixed">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Clinician Card & Switch */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <button
            type="button"
            onClick={() => switchPortal('patient')}
            className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-primary-fixed flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
            <span>Switch to Patient Portal</span>
          </button>

          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={ASSETS.drSarahJenkins}
                alt={clinicianName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-tertiary-fixed/40 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{clinicianName}</p>
                <p className="text-[11px] text-on-primary-container truncate">Cardiology Attending</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-primary-fixed-dim hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 glass-panel border-b border-outline-variant/25 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-surface-container-low text-primary cursor-pointer"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-primary leading-tight">
                {routeTitle}
              </h1>
              <p className="text-[11px] text-on-surface-variant hidden sm:block">
                Pavilion B Heart &amp; Vascular Center • Live Clinic Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="relative p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary transition-colors cursor-pointer"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadNotifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('ai-assistant')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              <span>Ask Copilot</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
