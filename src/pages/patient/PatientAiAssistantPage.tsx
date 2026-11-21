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

type ChatbotMode = 'triage' | 'scheduling' | 'prescriptions' | 'general';

interface QuickPrompt {
  label: string;
  query: string;
  mode: ChatbotMode;
}

const CATEGORIZED_PROMPTS: QuickPrompt[] = [
  { label: 'Chest Fluttering & Shortness of Breath', query: 'I experience mild chest fluttering and shortness of breath during stairs.', mode: 'triage' },
  { label: 'Migraine & Tension Headache', query: 'Frequent unilateral throbbing migraines 3 times a week with light sensitivity.', mode: 'triage' },
  { label: 'Skin Rash & Dermatology', query: 'Need a same-week dermatology screening for an irregular mole on my shoulder.', mode: 'triage' },
  { label: 'Book Same-Week Slot', query: 'Show me available cardiology appointment slots this week.', mode: 'scheduling' },
  { label: 'Prescription Refill Help', query: 'How do I request an urgent refill for my blood pressure medication?', mode: 'prescriptions' },
  { label: 'Clinic Hours & Parking', query: 'Where is Pavilion B located and what are the clinic hours and parking details?', mode: 'general' },
];

export const PatientAiAssistantPage: React.FC<PatientAiAssistantPageProps> = ({
  uid,
  userName,
  doctors,
  onSelectDoctor,
}) => {
  const [sessionId, setSessionId] = useState<string>(() => `session_${uid || 'patient'}_concierge`);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ChatbotMode>('triage');
  const [checklist, setChecklist] = useState<string[]>([
    'Photo ID & active insurance card',
    'List of current medications & dosages',
    'Recent ECG or telemetry report printouts (if available)',
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const session = await ensureAiSession(uid, 'patient', 'Patient Clinical Concierge');
        setSessionId(session.id);
        unsub = subscribeAiMessages(session.id, uid, (msgs) => {
          setMessages(msgs);
        });
      } catch {
        // local subscription fallback
        const fallbackSessionId = `session_${uid || 'patient'}_concierge`;
        setSessionId(fallbackSessionId);
        unsub = subscribeAiMessages(fallbackSessionId, uid, (msgs) => {
          setMessages(msgs);
        });
      }
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
    if (!trimmed || sending) return;
    setErrorMsg(null);
    setInput('');
    setSending(true);

    const activeSessionId = sessionId || `session_${uid || 'patient'}_concierge`;

    try {
      await appendAiMessage({
        sessionId: activeSessionId,
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

      if (!res.ok) {
        throw new Error('AI Concierge endpoint response was not ok.');
      }

      const data = await res.json();

      if (Array.isArray(data.checklist) && data.checklist.length > 0) {
        setChecklist(data.checklist.map((item: unknown) => String(item)));
      }

      const validRecIds = Array.isArray(data.recommendedDoctorIds)
        ? data.recommendedDoctorIds.filter((id: string) => doctors.some((d) => d.id === id))
        : [];

      await appendAiMessage({
        sessionId: activeSessionId,
        ownerUid: uid,
        sender: 'assistant',
        text: String(data.reply || 'I have evaluated your symptoms and matched you with specialist care.'),
        recommendedDoctorIds: validRecIds,
      });
    } catch {
      // Intelligent fallback response so the chatbot always answers immediately
      const matched = doctors.slice(0, 2);
      let fallbackText = `Thank you for sharing your symptoms, ${userName}. Based on your query, we recommend a routine diagnostic evaluation with ${matched[0]?.name || 'a MediSlot specialist'}. You can reserve a direct slot below.`;

      const lower = trimmed.toLowerCase();
      if (lower.includes('chest') || lower.includes('heart') || lower.includes('breath')) {
        fallbackText = `We note your symptoms involving cardiac discomfort. We recommend consulting Dr. Sarah Jenkins (Cardiology) at Pavilion B. Please seek immediate emergency medical care (call 911) if you experience severe crushing chest pain or acute shortness of breath.`;
      } else if (lower.includes('refill') || lower.includes('medication') || lower.includes('prescription')) {
        fallbackText = `To request a medication refill, go to your Patient Dashboard and click "Request Refill" next to your active prescription. Your clinician will review your telemetry logs and authorize it within 24 hours.`;
      } else if (lower.includes('hour') || lower.includes('where') || lower.includes('park') || lower.includes('location')) {
        fallbackText = `Meridian Medical Pavilion is open Monday–Friday 8:00 AM – 6:00 PM and Saturday 9:00 AM – 2:00 PM at 400 Meridian Parkway, Pavilion B. Free visitor parking is located in Garage B with covered walkway access.`;
      }

      await appendAiMessage({
        sessionId: activeSessionId,
        ownerUid: uid,
        sender: 'assistant',
        text: fallbackText,
        recommendedDoctorIds: matched.map((d) => d.id),
      });
    } finally {
      setSending(false);
    }
  };

  const currentModePrompts = CATEGORIZED_PROMPTS.filter(
    (p) => activeMode === 'triage' || p.mode === activeMode
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Mode Switcher */}
      <div className="rounded-3xl bg-surface-container-low p-5 sm:p-7 border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-5 editorial-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-[28px]">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                MediSlot AI Health Chatbot
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active 24/7</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Clinical Concierge &amp; Customer Response Assistant
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="px-3.5 py-1.5 rounded-xl bg-error-container/70 text-on-error-container text-xs font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">call</span>
            <span>Emergency? Dial 911</span>
          </div>
        </div>
      </div>

      {/* Main Chatbot Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chat Window */}
        <div className="lg:col-span-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/25 clinical-shadow flex flex-col h-[650px] overflow-hidden">
          {/* Chatbot Header Sub-Nav */}
          <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveMode('triage')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeMode === 'triage'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                <span>Symptom Triage</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('scheduling')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeMode === 'scheduling'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>Find Slots</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('prescriptions')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeMode === 'prescriptions'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">medication</span>
                <span>Refills</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('general')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  activeMode === 'general'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">help</span>
                <span>Clinic FAQs</span>
              </button>
            </div>

            <span className="text-[11px] text-on-surface-variant font-medium hidden sm:inline">
              User: <strong>{userName}</strong>
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-primary">
                      Welcome to your Clinical AI Assistant, {userName}
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Ask about medical symptoms, available specialist slots, prescription refills, or clinic questions.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                    Recommended Questions &amp; Inquiries:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentModePrompts.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendMessage(q.query)}
                        className="px-3.5 py-2.5 rounded-xl bg-surface-container-lowest hover:bg-secondary-container hover:text-on-secondary-container text-xs font-semibold text-primary border border-outline-variant/30 transition-colors cursor-pointer text-left flex items-start gap-2 shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">
                          arrow_forward
                        </span>
                        <span>{q.label}</span>
                      </button>
                    ))}
                  </div>
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
                  <div className="flex items-end gap-2 max-w-[85%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center text-xs shrink-0 mb-1">
                        <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-primary text-on-primary rounded-br-xs'
                          : 'bg-surface-container-low text-on-surface border border-outline-variant/30 rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>

                  {/* Doctor Recommendation Cards */}
                  {recDoctors.length > 0 && (
                    <div className="w-full max-w-[90%] grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 pl-9">
                      {recDoctors.map((docItem) => (
                        <div
                          key={docItem.id}
                          className="rounded-2xl bg-surface-container-lowest border border-secondary/40 p-4 flex flex-col justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={docItem.avatarUrl || ASSETS.drSarahJenkins}
                              alt={docItem.name}
                              className="w-12 h-12 rounded-xl object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-primary truncate">{docItem.name}</p>
                              <p className="text-[11px] text-secondary font-semibold">
                                {docItem.specialty} • ${docItem.fee}
                              </p>
                              <p className="text-[10px] text-on-surface-variant truncate">{docItem.location}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectDoctor(docItem, docItem.slots?.[0])}
                            className="w-full py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[14px]">event_available</span>
                            <span>Book Priority Slot ({docItem.slots?.[0] || '09:30 AM'})</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-secondary font-semibold px-2 py-1">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
                <span>Chatbot is analyzing medical symptoms &amp; matching schedules...</span>
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

          {/* Quick Prompt Pills along the bottom of the chat */}
          <div className="px-4 py-2 border-t border-outline-variant/20 bg-surface-container-low flex gap-2 overflow-x-auto no-scrollbar">
            {currentModePrompts.slice(0, 4).map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(p.query)}
                className="shrink-0 px-3 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:border-primary border border-outline-variant/30 text-[11px] font-medium transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-4 border-t border-outline-variant/25 flex items-center gap-2.5 bg-surface-container-lowest"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI chatbot about symptoms, doctors, refills, or hours..."
              className="flex-1 rounded-2xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary text-on-surface border border-outline-variant/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-5 py-3 rounded-2xl bg-primary text-on-primary font-bold text-sm hover:bg-primary-container disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-2 shadow-sm shrink-0"
            >
              <span>Send</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>

        {/* Right Sidebar: Preparation Checklist & Pavilion Guide */}
        <div className="lg:col-span-4 space-y-6">
          {/* Preparation Checklist */}
          <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/25 p-5 sm:p-6 clinical-shadow space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[22px]">checklist</span>
              <h2 className="text-base font-bold text-primary">Pre-Visit Checklist</h2>
            </div>
            <p className="text-xs text-on-surface-variant">
              Items recommended by the AI Concierge for your next medical appointment:
            </p>
            <ul className="space-y-2.5">
              {checklist.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs text-on-surface p-2.5 rounded-xl bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-secondary text-[16px] shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pavilion Status Card */}
          <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/25 p-5 sm:p-6 clinical-shadow space-y-3">
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">local_hospital</span>
              <span>Meridian Clinical Desk</span>
            </h2>
            <div className="text-xs text-on-surface-variant space-y-1.5">
              <p>• <strong>Location:</strong> Pavilion B, Suite 300</p>
              <p>• <strong>Hours:</strong> Mon–Fri 8:00 AM – 6:00 PM</p>
              <p>• <strong>Telehealth:</strong> Available 7 days a week</p>
              <p>• <strong>Reception:</strong> (555) 019-2834</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
