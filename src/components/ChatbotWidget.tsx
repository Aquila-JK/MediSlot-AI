import React, { useEffect, useRef, useState } from 'react';
import { Doctor, PatientRoute } from '../types.ts';

interface ChatbotWidgetProps {
  userName?: string;
  doctors: Doctor[];
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  onNavigate?: (route: PatientRoute) => void;
  onSelectDoctor?: (doctor: Doctor, slot?: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  urgencyLevel?: 'routine' | 'priority' | 'urgent_care';
  recommendedDoctor?: Doctor;
  checklist?: string[];
  suggestedActions?: { label: string; action: () => void }[];
}

interface SupportTicket {
  ticketId: string;
  name: string;
  contact: string;
  category: string;
  message: string;
  createdAt: string;
}

const QUICK_CHIPS = [
  { label: '🩺 Check Chest Tightness', query: 'I have occasional chest tightness during morning walks' },
  { label: '📅 Book Cardiologist', query: 'Show me available cardiology appointment slots this week' },
  { label: '🧠 Migraines & Headaches', query: 'Frequent throbbing migraines 3 times a week with light sensitivity' },
  { label: '💊 Request Prescription Refill', query: 'How do I request an urgent refill for my Metoprolol?' },
  { label: '🏥 Pavilion B Hours & Parking', query: 'Where is Pavilion B located and what are the clinic hours and parking details?' },
  { label: '🚨 Emergency Warning Signs', query: 'What are the emergency signs that require calling 911 immediately?' },
];

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  userName = 'Valued Patient',
  doctors = [],
  isOpen: controlledIsOpen,
  onToggleOpen,
  onNavigate,
  onSelectDoctor,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (next: boolean) => {
    if (onToggleOpen) {
      onToggleOpen(next);
    } else {
      setInternalIsOpen(next);
    }
  };

  const [activeTab, setActiveTab] = useState<'chat' | 'ticket' | 'info'>('chat');
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Support Ticket Form State
  const [ticketName, setTicketName] = useState(userName === 'Valued Patient' ? '' : userName);
  const [ticketContact, setTicketContact] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Appointment Scheduling');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);

  // Chat message stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: `Hello ${userName}! I am MediSlot AI, your 24/7 intelligent health concierge and appointment coordinator. How can I help you today? You can describe any symptoms, search specialist doctors, or ask clinic questions.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/patient-concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          userName,
          history: messages.slice(-5).map((m) => ({
            sender: m.sender === 'user' ? 'user' : 'concierge',
            text: m.text,
          })),
          doctors: doctors.slice(0, 6).map((d) => ({
            id: d.id,
            name: d.name,
            specialty: d.specialty,
            location: d.location,
            fee: d.fee,
            slots: d.slots,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('API offline');
      }

      const data = await response.json();
      const replyText = data.reply || 'I have evaluated your symptoms and matched you with specialist care.';
      const recId = Array.isArray(data.recommendedDoctorIds) && data.recommendedDoctorIds[0];
      const matchedDoctor = recId ? doctors.find((d) => d.id === recId) : doctors[0];

      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        urgencyLevel: (data.urgencyLevel as 'routine' | 'priority' | 'urgent_care') || 'routine',
        recommendedDoctor: matchedDoctor,
        checklist: Array.isArray(data.checklist) ? data.checklist : undefined,
      };

      setMessages((prev) => [...prev, botReply]);
      playChime();
    } catch {
      // Robust clinical fallback matching
      const lower = trimmed.toLowerCase();
      let urgency: 'routine' | 'priority' | 'urgent_care' = 'routine';
      let reply = `Thank you for sharing your symptoms, ${userName}. Based on your query, a diagnostic consultation at Meridian Medical Pavilion is recommended.`;
      let matchedDoc = doctors[0];

      if (lower.includes('chest') || lower.includes('heart') || lower.includes('shortness') || lower.includes('cardio')) {
        urgency = 'priority';
        reply = `Your report of chest symptoms indicates need for early clinical evaluation. We have reserved priority review with cardiologist Dr. Sarah Jenkins at Pavilion B. Please seek emergency care (call 911) if chest tightness radiates to your jaw or left arm.`;
        matchedDoc = doctors.find((d) => d.specialty.toLowerCase().includes('cardio')) || doctors[0];
      } else if (lower.includes('head') || lower.includes('migraine') || lower.includes('brain') || lower.includes('neuro')) {
        urgency = 'routine';
        reply = `For chronic or throbbing migraines, a neurological consultation is advised to formulate an acute and prophylactic migraine management plan.`;
        matchedDoc = doctors.find((d) => d.specialty.toLowerCase().includes('neuro')) || doctors[1] || doctors[0];
      } else if (lower.includes('skin') || lower.includes('rash') || lower.includes('mole') || lower.includes('derma')) {
        urgency = 'routine';
        reply = `Dermatological evaluation is recommended to inspect skin lesions and rule out atypical changes with dermoscopy.`;
        matchedDoc = doctors.find((d) => d.specialty.toLowerCase().includes('derma')) || doctors[2] || doctors[0];
      } else if (lower.includes('refill') || lower.includes('medication') || lower.includes('prescription')) {
        reply = `To request a medication refill, navigate to your Patient Dashboard and select "Request Refill" next to your active prescription. Your physician will review it within 24 hours.`;
      } else if (lower.includes('hour') || lower.includes('where') || lower.includes('park') || lower.includes('location')) {
        reply = `Meridian Medical Pavilion is open Monday–Friday 8:00 AM – 6:00 PM and Saturday 9:00 AM – 2:00 PM at 400 Meridian Parkway, Pavilion B. Covered patient parking is free in Garage B.`;
      }

      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        urgencyLevel: urgency,
        recommendedDoctor: matchedDoc,
        checklist: [
          'Photo ID and current insurance card',
          'List of current medications and dosages',
          'Prior relevant lab or ECG reports',
        ],
      };

      setMessages((prev) => [...prev, botReply]);
      playChime();
    } finally {
      setIsTyping(false);
    }
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    const ticket: SupportTicket = {
      ticketId: `TKT-${Math.floor(100000 + Math.random() * 900000)}`,
      name: ticketName.trim() || 'Valued Patient',
      contact: ticketContact.trim() || 'patient@medislot.local',
      category: ticketCategory,
      message: ticketMessage.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setSubmittedTicket(ticket);
    setTicketMessage('');
  };

  const handleBookDoctor = (doc: Doctor, slot?: string) => {
    if (onSelectDoctor) {
      onSelectDoctor(doc, slot || doc.slots?.[0]);
      setIsOpen(false);
    } else if (onNavigate) {
      onNavigate('find-doctors');
      setIsOpen(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'bot',
        text: `Conversation restarted. How else can MediSlot AI assist you today, ${userName}?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <aside aria-label="Open AI Health Chatbot" className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
          {/* Tooltip Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest text-primary shadow-xl border border-outline-variant/30 text-xs font-semibold animate-bounce duration-1000">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>👋 Need medical guidance? Ask MediSlot AI!</span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary shadow-2xl hover:shadow-primary/40 transition-all transform hover:scale-105 cursor-pointer border border-white/20"
          >
            <div className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400"></span>
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold leading-tight tracking-wide">
                MediSlot AI Chatbot
              </span>
              <span className="block text-[10px] text-primary-fixed-dim leading-none">
                Instant Triage &amp; Booking
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <span className="material-symbols-outlined text-[20px] text-white">smart_toy</span>
            </div>
          </button>
        </aside>
      )}

      {/* Main Chatbot Floating Window */}
      {isOpen && (
        <section
          aria-label="MediSlot AI Medical Chatbot"
          className={`fixed z-50 bg-surface-container-lowest text-on-surface rounded-3xl shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'inset-3 sm:inset-8 w-auto h-auto max-w-5xl mx-auto'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[440px] h-[680px] max-h-[88vh]'
          }`}
        >
          {/* Chatbot Top Header */}
          <div className="bg-gradient-to-r from-primary to-secondary text-on-primary px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">vital_signs</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-primary"></span>
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  MediSlot AI Chatbot
                  <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-semibold text-white">
                    24/7
                  </span>
                </h2>
                <p className="text-[11px] text-primary-fixed-dim leading-none mt-0.5">
                  Clinical Triage • Specialist Match • Pavilion Care
                </p>
              </div>
            </div>

            {/* Header Control Icons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className={`p-1.5 rounded-lg text-white hover:bg-white/15 transition-colors cursor-pointer ${
                  soundEnabled ? 'text-emerald-300' : 'opacity-60'
                }`}
                title={soundEnabled ? 'Sound Enabled' : 'Sound Muted'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {soundEnabled ? 'volume_up' : 'volume_off'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-white hover:bg-white/15 transition-colors cursor-pointer opacity-70 hover:opacity-100"
                title="Restart Chat"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 rounded-lg text-white hover:bg-white/15 transition-colors cursor-pointer opacity-70 hover:opacity-100 hidden sm:block"
                title={isExpanded ? 'Restore Size' : 'Expand View'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isExpanded ? 'close_fullscreen' : 'open_in_full'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors cursor-pointer ml-1"
                title="Close Chatbot"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-outline-variant/30 bg-surface-container-low shrink-0 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'chat'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>AI Health Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ticket')}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'ticket'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">support_agent</span>
              <span>Human Coordinator</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'info'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">local_hospital</span>
              <span>Clinic &amp; Hours</span>
            </button>
          </div>

          {/* TAB 1: Chat Stream */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-surface">
              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs leading-relaxed">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5`}
                    >
                      <div className="flex items-end gap-2 max-w-[90%]">
                        {!isUser && (
                          <div className="w-7 h-7 rounded-xl bg-primary text-on-primary flex items-center justify-center text-xs shrink-0 mb-0.5 shadow-2xs">
                            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-3 shadow-xs ${
                            isUser
                              ? 'bg-primary text-on-primary rounded-br-xs'
                              : 'bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>

                      {/* Urgency Badge if provided */}
                      {msg.urgencyLevel && (
                        <div className="pl-9 flex items-center gap-1.5">
                          {msg.urgencyLevel === 'priority' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>Priority Clinical Review</span>
                            </span>
                          )}
                          {msg.urgencyLevel === 'urgent_care' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              <span>Urgent Care Notice (Call 911 if Critical)</span>
                            </span>
                          )}
                          {msg.urgencyLevel === 'routine' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Routine Triage</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Doctor Recommendation Card directly inside the chat! */}
                      {msg.recommendedDoctor && (
                        <div className="w-full max-w-[92%] pl-9 pt-1">
                          <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-secondary/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={msg.recommendedDoctor.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200'}
                                alt={msg.recommendedDoctor.name}
                                className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-secondary/30"
                              />
                              <div className="min-w-0">
                                <h3 className="font-bold text-primary text-xs truncate">
                                  {msg.recommendedDoctor.name}
                                </h3>
                                <p className="text-[11px] text-secondary font-semibold">
                                  {msg.recommendedDoctor.specialty} • ${msg.recommendedDoctor.fee}
                                </p>
                                <p className="text-[10px] text-on-surface-variant truncate">
                                  {msg.recommendedDoctor.location}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleBookDoctor(msg.recommendedDoctor!)}
                              className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[15px]">event_available</span>
                              <span>Book ({msg.recommendedDoctor.slots?.[0] || 'Open Slot'})</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Preparation Checklist */}
                      {msg.checklist && msg.checklist.length > 0 && (
                        <div className="w-full max-w-[92%] pl-9 pt-1">
                          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[11px] space-y-1">
                            <p className="font-bold text-primary flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-secondary">checklist</span>
                              <span>Recommended Visit Checklist:</span>
                            </p>
                            <ul className="list-disc list-inside text-on-surface-variant space-y-0.5">
                              {msg.checklist.map((item, ci) => (
                                <li key={ci}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-2 text-on-surface-variant text-[11px] italic pl-9">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                    <span>MediSlot AI is evaluating clinical context and checking live doctor schedules...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions Pills */}
              <div className="px-3 py-2 border-t border-outline-variant/20 bg-surface-container-low flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {QUICK_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip.query)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:border-primary border border-outline-variant/30 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(input);
                }}
                className="p-3 bg-surface-container-lowest border-t border-outline-variant/30 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask MediSlot AI about symptoms, doctors, refills, or hours..."
                  className="flex-1 px-4 py-2.5 text-xs bg-surface-container-low rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-on-surface"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container disabled:opacity-40 transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Human Coordinator Message & Ticket */}
          {activeTab === 'ticket' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs bg-surface">
              {submittedTicket ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                    <span>Support Ticket Generated!</span>
                  </div>
                  <p className="text-on-surface-variant leading-relaxed">
                    Thank you, <strong>{submittedTicket.name}</strong>. A human care coordinator at Meridian Pavilion B has been notified.
                  </p>
                  <div className="p-3 bg-white rounded-xl font-mono text-sm font-bold text-primary border border-emerald-200 text-center shadow-2xs">
                    {submittedTicket.ticketId}
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Coordinator response expected within 2 hours during normal clinic operating hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedTicket(null)}
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer mt-2"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTicketSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">
                      Patient Name
                    </label>
                    <input
                      type="text"
                      value={ticketName}
                      onChange={(e) => setTicketName(e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">
                      Phone Number or Email
                    </label>
                    <input
                      type="text"
                      value={ticketContact}
                      onChange={(e) => setTicketContact(e.target.value)}
                      placeholder="e.g. (555) 019-2834 or eleanor@example.com"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                    >
                      <option>Appointment Scheduling &amp; Reschedule</option>
                      <option>Prescription &amp; Refill Authorization</option>
                      <option>Insurance Pre-Verification &amp; Billing</option>
                      <option>Telehealth HD Video Support</option>
                      <option>Speak to Care Coordinator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Please describe how our clinical coordinator can assist..."
                      required
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Dispatch to Care Team</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: Clinic Information & Phone Directory */}
          {activeTab === 'info' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-surface">
              <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-2">
                <h3 className="font-bold text-primary text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">domain</span>
                  <span>Meridian Medical Pavilion B</span>
                </h3>
                <p className="text-on-surface-variant text-[11px] leading-relaxed">
                  400 Meridian Parkway, Pavilion B (Suite 300), Health Sciences Campus.
                </p>
                <p className="text-on-surface-variant text-[11px]">
                  <strong>Operating Hours:</strong><br />
                  Mon–Fri: 8:00 AM – 6:00 PM<br />
                  Saturday: 9:00 AM – 2:00 PM<br />
                  Sunday: Urgent Telehealth Only
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-2">
                <h3 className="font-bold text-primary text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">call</span>
                  <span>Direct Hotline Directory</span>
                </h3>
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-on-surface-variant">Pavilion B Reception</span>
                  <a href="tel:5550192834" className="font-bold text-primary hover:underline">
                    (555) 019-CARE
                  </a>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-on-surface-variant">24/7 Nurse Triage</span>
                  <a href="tel:5550192835" className="font-bold text-primary hover:underline">
                    (555) 019-TRIAGE
                  </a>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-on-surface-variant">Pharmacy Refills</span>
                  <a href="tel:5550192836" className="font-bold text-primary hover:underline">
                    (555) 019-RX4U
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-error-container/30 border border-error-container text-error text-[11px] leading-relaxed">
                <strong>Emergency Warning:</strong> If you or someone you are assisting has severe chest pain, breathing difficulty, or signs of stroke, dial <strong>911</strong> immediately.
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
};
