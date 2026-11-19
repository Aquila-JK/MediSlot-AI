import React, { useState } from 'react';
import { NotificationItem } from '../../types.ts';
import {
  markAllNotificationsRead,
  updateNotificationAction,
} from '../../services/firestoreService.ts';

interface NotificationsPageProps {
  notifications: NotificationItem[];
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ notifications }) => {
  const [filterTab, setFilterTab] = useState<'all' | NotificationItem['category']>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = notifications.filter(
    (n) => filterTab === 'all' || n.category === filterTab
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleAction = async (
    item: NotificationItem,
    actionStatus: NotificationItem['actionStatus']
  ) => {
    setBusyId(item.id);
    try {
      await updateNotificationAction(item.id, actionStatus, true);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAll = async () => {
    setBusyId('all');
    try {
      await markAllNotificationsRead(notifications);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-surface-container-low p-1 rounded-xl">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'request', label: 'Requests' },
              { id: 'cancellation', label: 'Cancellations' },
              { id: 'reminder', label: 'Reminders' },
              { id: 'lab', label: 'Labs & Telemetry' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={unreadCount === 0 || busyId === 'all'}
          onClick={handleMarkAll}
          className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-semibold hover:bg-secondary-fixed disabled:opacity-50 cursor-pointer self-start"
        >
          Mark All as Read ({unreadCount})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Notifications Feed */}
        <div className="lg:col-span-8 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-low p-10 text-center text-sm text-on-surface-variant">
              No notifications in this category.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl p-5 border transition-all space-y-3 ${
                  item.isRead
                    ? 'bg-surface-container-low/70 border-outline-variant/25'
                    : 'bg-surface-container-lowest border-primary/30 clinical-shadow'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!item.isRead && <span className="w-2 h-2 rounded-full bg-error"></span>}
                      <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                        {item.category}
                      </span>
                      {item.patientName && (
                        <span className="text-[11px] text-on-surface-variant">
                          • {item.patientName}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-primary text-base">{item.title}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize shrink-0 ${
                      item.actionStatus === 'accepted' || item.actionStatus === 'reviewed'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : item.actionStatus === 'declined'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-tertiary-fixed text-on-tertiary-fixed'
                    }`}
                  >
                    {item.actionStatus}
                  </span>
                </div>

                {/* Inline Holter Sparkline on Lab Alerts */}
                {item.category === 'lab' && (
                  <div className="p-3 rounded-xl bg-primary text-on-primary">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-primary-fixed font-semibold">48h Holter Rhythm Strip</span>
                      <span className="text-tertiary-fixed font-mono">Peak 138 BPM</span>
                    </div>
                    <svg viewBox="0 0 320 38" className="w-full h-8 stroke-tertiary-fixed fill-none" strokeWidth="2">
                      <polyline points="0,22 25,22 33,8 41,34 49,22 72,22 80,6 88,35 96,22 118,22 126,10 134,32 142,22 170,22 178,7 186,34 194,22 225,22 233,9 241,33 249,22 285,22 293,8 301,34 309,22 320,22" />
                    </svg>
                  </div>
                )}

                {item.actionStatus === 'pending' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {item.category === 'lab' ? (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleAction(item, 'reviewed')}
                        className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold cursor-pointer"
                      >
                        Mark EHR Reviewed
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleAction(item, 'accepted')}
                          className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold cursor-pointer"
                        >
                          Accept &amp; Confirm
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleAction(item, 'declined')}
                          className="px-3.5 py-1.5 rounded-lg bg-error-container/70 text-on-error-container text-xs font-semibold cursor-pointer"
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Digest Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/25 space-y-3">
            <h3 className="text-base font-bold text-primary">Shift Digest</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-3 rounded-xl bg-surface-container-lowest">
                <span className="text-on-surface-variant">Unread Alerts</span>
                <span className="font-bold text-primary">{unreadCount}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-surface-container-lowest">
                <span className="text-on-surface-variant">Lab Telemetry Flags</span>
                <span className="font-bold text-error">
                  {notifications.filter((n) => n.category === 'lab').length}
                </span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-surface-container-lowest">
                <span className="text-on-surface-variant">Total Tracked Notices</span>
                <span className="font-bold text-secondary">{notifications.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
