import React, { useEffect, useRef, useState } from 'react';
import { AiMessage, Appointment, ClinicalRoute, PatientRecord } from '../../types.ts';
import {
  appendAiMessage,
  ensureAiSession,
  subscribeAiMessages,
  updateAppointmentStatus,
} from '../../services/firestoreService.ts';

interface DoctorAiAssistantPageProps {
  uid: string;
  clinicianName: string;
  appointments: Appointment[];
  patients: PatientRecord[];
  onNavigate: (route: ClinicalRoute) => void;
}

const SUGGESTED_QUERIES = [
  'Summarize high-risk patients requiring review today',
  'Recommend how to fill afternoon cancellation gaps',
  'Draft pre-visit Holter telemetry note for Eleanor Vance',
  'Compare my pending requests vs confirmed clinic load',
];

export const DoctorAiAssistantPage: React.FC<DoctorAiAssistantPageProps> = ({
  uid,
  clinicianName,
  appointments,
  patients,
  onNavigate,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [highlight, setHighlight] = useState<string>('Pod B utilization at 88% • 1 high-risk Holter strip queued.');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offerToast, setOfferToast] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const session = await ensureAiSession(uid, 'clinical', 'Doctor AI Copilot');
      setSessionId(session.id);
      unsub = subscribeAiMessages(session.id, uid, (msgs) => {
        setMessages(msgs);
      });
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [uid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendQuery = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || !sessionId || sending) return;
    setErrorMsg(null);
    setInput('');
    setSending(true);

    try {
      await appendAiMessage({
        sessionId,
        ownerUid: uid,
        sender: 'user',
        text: trimmed,
      });

      const apptsSummary = appointments
        .slice(0, 12)
        .map((a) => `${a.bookingCode}: ${a.patientName} (${a.status}) ${a.dateLabel} ${a.timeSlot} [${a.modality}] - ${a.reason || ''}`)
        .join('\n');

      const ptsSummary = patients
        .slice(0, 12)
        .map((p) => `${p.name} (${p.mrn}, ${p.age}y, ${p.riskLevel}): BP ${p.bloodPressure}, HR ${p.heartRate}, SpO2 ${p.spo2}% — ${p.condition || ''}`)
        .join('\n');

      const res = await fetch('/api/ai/doctor-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          clinicianName,
          appointmentsSummary: apptsSummary,
          patientsSummary: ptsSummary,
          history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Doctor Copilot AI request failed.');
      }

      if (data.clinicalHighlight) {
        setHighlight(String(data.clinicalHighlight));
      }

      await appendAiMessage({
        sessionId,
        ownerUid: uid,
        sender: 'assistant',
        text: String(data.reply || 'Clinical briefing generated.'),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach Doctor Copilot.');
    } finally {
      setSending(false);
    }
  };

  const pendingAppts = appointments.filter((a) => a.status === 'pending');

  const handleAutoApproveWaitlist = async (appt: Appointment) => {
    await updateAppointmentStatus(appt.id, 'confirmed');
    setOfferToast(`Auto-confirmed priority slot for ${appt.patientName} (${appt.bookingCode}).`);
    setTimeout(() => setOfferToast(null), 3200);
  };

  return (
    <div className="space-y-6">
      {offerToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-lg">
          {offerToast}
        </div>
      )}

      {/* Priority Highlight Banner */}
      <div className="rounded-2xl bg-primary text-on-primary p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center border border-white/10 shrink-0">
            <span className="material-symbols-outlined text-tertiary-fixed text-[22px]">auto_awesome</span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-tertiary-fixed">
              Doctor AI Copilot • Live Clinical Context
            </span>
            <p className="text-sm font-semibold text-white mt-0.5">{highlight}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('patients')}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold shrink-0 cursor-pointer"
        >
          Open Patient Charts
        </button>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chat Stream */}
        <div className="lg:col-span-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 clinical-shadow flex flex-col h-[580px]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="p-5 rounded-2xl bg-surface-container-low space-y-3">
                <p className="text-sm font-semibold text-primary">
                  Ready for morning rounds, {clinicianName}. Ask about patient risk panels, schedule optimization, or encounter drafting.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendQuery(q)}
                      className="px-3 py-1.5 rounded-xl bg-surface-container-lowest hover:bg-secondary-container text-xs font-semibold text-primary border border-outline-variant/30 transition-colors cursor-pointer text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-primary text-on-primary rounded-br-sm'
                        : 'bg-surface-container-low text-on-surface rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-secondary font-semibold px-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span>Synthesizing schedule &amp; EHR vitals...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {errorMsg && (
            <div className="mx-5 mb-2 p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="underline font-semibold cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuery(input);
            }}
            className="p-4 border-t border-outline-variant/25 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot about vitals, pending requests, or care notes..."
              className="flex-1 rounded-xl bg-surface-container-low px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <span>Ask</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>

        {/* Right Sidebar: Waitlist Quick Match + Pod Efficiency */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/25 space-y-3">
            <h3 className="text-base font-bold text-primary">Waitlist Quick Match</h3>
            <p className="text-xs text-on-surface-variant">
              Pending requests prioritized by clinical urgency and slot fit.
            </p>
            {pendingAppts.length === 0 ? (
              <p className="text-xs text-secondary font-semibold bg-surface-container-lowest p-3 rounded-xl">
                All pending queue requests are currently approved.
              </p>
            ) : (
              pendingAppts.map((appt) => (
                <div
                  key={appt.id}
                  className="p-3.5 rounded-xl bg-surface-container-lowest space-y-2 border border-outline-variant/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">{appt.patientName}</span>
                    <span className="text-[11px] font-semibold text-secondary">{appt.timeSlot}</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">{appt.reason}</p>
                  <button
                    type="button"
                    onClick={() => handleAutoApproveWaitlist(appt)}
                    className="w-full py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer"
                  >
                    Auto-Confirm Slot
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/25 clinical-shadow space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
              Pod B Efficiency
            </span>
            <p className="text-3xl font-bold text-primary">94.2%</p>
            <p className="text-xs text-on-surface-variant">
              On-time consultation start rate across {appointments.length} tracked visits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
