import React, { useEffect, useRef, useState } from 'react';
import { AiMessage, Doctor } from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';
import {
  appendAiMessage,
  ensureAiSession,
  subscribeAiMessages,
} from '../../services/firestoreService.ts';

interface PatientAiAssistantPageProps {
  uid: string;
  userName: string;
  doctors: Doctor[];
  onSelectDoctor: (doctor: Doctor, preselectedSlot?: string) => void;
}

const QUICK_PROMPTS = [
  'I have occasional chest tightness during morning walks',
  'Frequent tension migraines 3 times a week',
  'Need a dermatology skin screening this week',
  'Persistent knee stiffness after running',
];

export const PatientAiAssistantPage: React.FC<PatientAiAssistantPageProps> = ({
  uid,
  userName,
  doctors,
  onSelectDoctor,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<string[]>([
    'Photo ID & active insurance card',
    'List of current medications & dosages',
    'Recent lab or ECG printouts (if available)',
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const session = await ensureAiSession(uid, 'patient', 'Patient Clinical Concierge');
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

  const sendMessage = async (textToSend: string) => {
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

      const res = await fetch('/api/ai/patient-concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          userName,
          history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
          doctors: doctors.map((d) => ({
            id: d.id,
            name: d.name,
            specialty: d.specialty,
            location: d.location,
            fee: d.fee,
            slots: d.slots,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Concierge request failed.');
      }

      if (Array.isArray(data.checklist) && data.checklist.length > 0) {
        setChecklist(data.checklist.map((item: unknown) => String(item)));
      }

      const validRecIds = Array.isArray(data.recommendedDoctorIds)
        ? data.recommendedDoctorIds.filter((id: string) => doctors.some((d) => d.id === id))
        : [];

      await appendAiMessage({
        sessionId,
        ownerUid: uid,
        sender: 'assistant',
        text: String(data.reply || 'I have matched you with available MediSlot specialists.'),
        recommendedDoctorIds: validRecIds,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach AI Concierge.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-surface-container-low p-5 sm:p-6 border border-outline-variant/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              smart_toy
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
              Intelligent Medical Triage • Live Gemini AI
            </span>
            <h1 className="text-xl font-bold text-primary">MediSlot AI Clinical Concierge</h1>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-error-container/70 text-on-error-container text-xs font-semibold">
          Emergency? Call 911 immediately
        </div>
      </div>

      {/* Main Chat + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chat Column */}
        <div className="lg:col-span-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 clinical-shadow flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="p-5 rounded-2xl bg-surface-container-low space-y-3">
                <p className="text-sm font-semibold text-primary">
                  Good day, {userName}. Tell me what symptoms you are experiencing or which specialist you need.
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
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
              const recDoctors = (msg.recommendedDoctorIds || [])
                .map((id) => doctors.find((d) => d.id === id))
                .filter((d): d is Doctor => Boolean(d));

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-primary text-on-primary rounded-br-sm'
                        : 'bg-surface-container-low text-on-surface rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {recDoctors.length > 0 && (
                    <div className="w-full max-w-[90%] grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {recDoctors.map((docItem) => (
                        <div
                          key={docItem.id}
                          className="rounded-xl bg-surface-container-low border border-secondary/30 p-3.5 flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={docItem.avatarUrl || ASSETS.drSarahJenkins}
                              alt={docItem.name}
                              className="w-11 h-11 rounded-xl object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-primary truncate">{docItem.name}</p>
                              <p className="text-[11px] text-secondary font-semibold">
                                {docItem.specialty} • ${docItem.fee}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectDoctor(docItem, docItem.slots?.[0])}
                            className="w-full py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer"
                          >
                            Book Priority Slot ({docItem.slots?.[0] || '09:30 AM'})
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-secondary font-semibold px-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span>Analyzing symptoms &amp; checking live clinic slots...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {errorMsg && (
            <div className="mx-5 mb-2 p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="underline font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-4 border-t border-outline-variant/25 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe symptoms, urgency, or ask for a specialist..."
              className="flex-1 rounded-xl bg-surface-container-low px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <span>Send</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>

        {/* Right Sidebar: Prep Checklist & Facility Card */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/25 space-y-3">
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">fact_check</span>
              <span>Visit Preparation Checklist</span>
            </h2>
            <ul className="space-y-2">
              {checklist.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-on-surface-variant bg-surface-container-lowest p-3 rounded-xl"
                >
                  <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">
                    check_circle
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-surface-container-lowest overflow-hidden border border-outline-variant/25 clinical-shadow">
            <img
              src={ASSETS.pavilionB}
              alt="Pavilion B Facility"
              className="w-full h-36 object-cover"
            />
            <div className="p-5 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                Why MediSlot AI
              </span>
              <h3 className="font-bold text-primary text-sm">Same-Week Specialist Access</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                94% of triage-routed patients confirm an in-person or HD telehealth consultation within 48 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
