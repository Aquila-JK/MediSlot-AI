import React, { useState } from 'react';
import { Doctor, PatientRoute } from '../types.ts';

interface CustomerResponseWidgetProps {
  userName?: string;
  doctors: Doctor[];
  onNavigate?: (route: PatientRoute) => void;
  onSelectDoctor?: (doctor: Doctor) => void;
}

interface SupportTicket {
  ticketId: string;
  name: string;
  email: string;
  category: string;
  message: string;
  createdAt: string;
  status: 'Received' | 'In Review';
}

const FAQ_ITEMS = [
  {
    q: 'How do I book or reschedule an appointment?',
    a: 'Go to "Find Doctors" to select a specialist and choose an open slot. To reschedule an existing visit, visit your Dashboard and click "Reschedule" on any confirmed booking.',
  },
  {
    q: 'Can I do a telehealth consultation instead of visiting in person?',
    a: 'Yes! When choosing an appointment slot, toggle the modality between "In-Person (Pavilion B)" and "HD Telehealth Video". A secure video link will be generated in your dashboard.',
  },
  {
    q: 'How do I request a prescription refill?',
    a: 'Go to your Patient Dashboard, scroll to the "Active Prescriptions" panel, and click "Request Refill" next to any eligible medication. Your physician will review it within 24 hours.',
  },
  {
    q: 'Where is Meridian Medical Pavilion located and where do I park?',
    a: 'Meridian Medical Pavilion is at 400 Meridian Parkway, Suite 300. Free patient parking is available in Parking Garage B with direct skybridge access to the main atrium.',
  },
];

export const CustomerResponseWidget: React.FC<CustomerResponseWidgetProps> = ({
  userName = 'Patient',
  doctors,
  onNavigate,
  onSelectDoctor,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'ticket' | 'faq'>('chat');

  // Chat State
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<
    { sender: 'user' | 'agent'; text: string; action?: { label: string; route?: PatientRoute; docId?: string } }[]
  >([
    {
      sender: 'agent',
      text: `Hello ${userName}! I am your MediSlot Customer Care & Clinical Response Assistant. How can I help you today? You can ask about scheduling, clinic hours, prescription refills, or symptom guidance.`,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Support Ticket State
  const [ticketName, setTicketName] = useState(userName === 'Patient' ? '' : userName);
  const [ticketContact, setTicketContact] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Appointment Question');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);

  const quickQuestions = [
    'How do I book a cardiology consult?',
    'What are clinic hours at Pavilion B?',
    'How can I refill my medication?',
    'I have persistent chest tightness and dizziness',
  ];

  const handleSendChat = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isTyping) return;

    const userEntry = { sender: 'user' as const, text: trimmed };
    setChatHistory((prev) => [...prev, userEntry]);
    setQuery('');
    setIsTyping(true);

    try {
      // Call backend AI concierge endpoint
      const response = await fetch('/api/ai/patient-concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          userName,
          history: chatHistory.slice(-4).map((c) => ({ sender: c.sender, text: c.text })),
          doctors: doctors.slice(0, 5).map((d) => ({
            id: d.id,
            name: d.name,
            specialty: d.specialty,
            location: d.location,
            fee: d.fee,
            slots: d.slots,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.reply || 'Thank you for your message. How else can we assist your care journey?';
        const recommendedDocId = Array.isArray(data.recommendedDoctorIds) && data.recommendedDoctorIds[0];
        const matchingDoc = recommendedDocId ? doctors.find((d) => d.id === recommendedDocId) : undefined;

        setChatHistory((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: replyText,
            action: matchingDoc
              ? {
                  label: `Book with ${matchingDoc.name} (${matchingDoc.specialty})`,
                  docId: matchingDoc.id,
                }
              : {
                  label: 'Browse All Specialists',
                  route: 'find-doctors',
                },
          },
        ]);
      } else {
        throw new Error('API offline');
      }
    } catch {
      // Intelligent instantaneous customer response fallback
      let fallback = `Thank you for reaching out to MediSlot Support. Our clinical desk at Pavilion B is open Mon-Fri 8am-6pm. For booking assistance, you can view all available doctor slots directly online.`;
      let act: { label: string; route?: PatientRoute } = { label: 'Find Doctors', route: 'find-doctors' };

      const lower = trimmed.toLowerCase();
      if (lower.includes('refill') || lower.includes('prescription') || lower.includes('medication')) {
        fallback = 'To refill your prescription, head to your Patient Dashboard and scroll to the Active Prescriptions panel to request an automated 1-click refill.';
        act = { label: 'Go to Dashboard', route: 'dashboard' };
      } else if (lower.includes('chest') || lower.includes('heart') || lower.includes('cardio')) {
        fallback = 'Cardiology consults are available with Dr. Sarah Jenkins at Pavilion B. If you are experiencing acute crushing chest pain or severe shortness of breath, please call 911 immediately.';
        act = { label: 'Book Cardiology', route: 'find-doctors' };
      } else if (lower.includes('hour') || lower.includes('time') || lower.includes('where') || lower.includes('location')) {
        fallback = 'Meridian Medical Pavilion is open Monday–Friday 8:00 AM – 6:00 PM, and Saturday 9:00 AM – 2:00 PM. Telehealth consultations operate 7 days a week.';
        act = { label: 'View Clinic Directory', route: 'find-doctors' };
      }

      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: fallback,
          action: act,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    const newTicket: SupportTicket = {
      ticketId: `TKT-${Math.floor(100000 + Math.random() * 900000)}`,
      name: ticketName.trim() || 'Valued Patient',
      email: ticketContact.trim() || 'patient@medislot.local',
      category: ticketCategory,
      message: ticketMessage.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Received',
    };

    setSubmittedTicket(newTicket);
    setTicketMessage('');
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <aside aria-label="Customer Support and AI Care Response" className="fixed bottom-5 right-5 z-50">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-full bg-primary text-on-primary shadow-2xl hover:bg-primary-container transition-all transform hover:scale-105 cursor-pointer border border-white/20 group"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-tertiary-fixed"></span>
            </span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold leading-tight group-hover:text-white">
                Customer Care &amp; AI
              </span>
              <span className="text-[10px] text-primary-fixed-dim leading-none">
                Instant Response Online
              </span>
            </div>
            <span className="material-symbols-outlined text-[20px] text-tertiary-fixed">
              support_agent
            </span>
          </button>
        </aside>
      )}

      {/* Slide-Up / Floating Modal Window */}
      {isOpen && (
        <section
          aria-label="Customer Care and AI Concierge Modal"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[420px] max-h-[85vh] h-[640px] bg-surface-container-lowest text-on-surface rounded-3xl shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="bg-primary text-on-primary px-5 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-tertiary-fixed">
                <span className="material-symbols-outlined text-[22px]">vital_signs</span>
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  MediSlot Care Response
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                </h2>
                <p className="text-[11px] text-primary-fixed-dim">
                  24/7 Clinical &amp; Customer Support
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Minimize Support"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-outline-variant/30 bg-surface-container-low shrink-0 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'chat'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">forum</span>
              <span>Live Response</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ticket')}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'ticket'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">mail</span>
              <span>Send Message</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'faq'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">help</span>
              <span>FAQs &amp; Help</span>
            </button>
          </div>

          {/* TAB 1: Live Chat / AI Response */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-surface">
              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs leading-relaxed">
                {chatHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                        item.sender === 'user'
                          ? 'bg-primary text-on-primary rounded-br-xs'
                          : 'bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{item.text}</p>
                    </div>

                    {/* Action button if present */}
                    {item.action && (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.action?.docId) {
                            const found = doctors.find((d) => d.id === item.action?.docId);
                            if (found && onSelectDoctor) {
                              onSelectDoctor(found);
                              setIsOpen(false);
                            } else if (onNavigate) {
                              onNavigate('find-doctors');
                              setIsOpen(false);
                            }
                          } else if (item.action?.route && onNavigate) {
                            onNavigate(item.action.route);
                            setIsOpen(false);
                          }
                        }}
                        className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary-container text-on-secondary-container text-[11px] font-bold hover:bg-secondary-fixed transition-colors cursor-pointer"
                      >
                        <span>{item.action.label}</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-2 text-on-surface-variant text-[11px] italic">
                    <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                    <span>MediSlot Response Assistant is formulating guidance...</span>
                  </div>
                )}
              </div>

              {/* Quick Prompt Pills */}
              <div className="px-3 py-2 border-t border-outline-variant/20 bg-surface-container-low flex gap-1.5 overflow-x-auto no-scrollbar">
                {quickQuestions.map((qText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendChat(qText)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:border-primary border border-outline-variant/30 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    {qText}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat(query);
                }}
                className="p-3 bg-surface-container-lowest border-t border-outline-variant/30 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about appointments, hours, care..."
                  className="flex-1 px-3.5 py-2 text-xs bg-surface-container-low rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-on-surface"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isTyping}
                  className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Support Ticket & Coordinator Message */}
          {activeTab === 'ticket' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs bg-surface">
              {submittedTicket ? (
                <div className="p-4 rounded-2xl bg-primary-container/10 border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>Support Inquiry Submitted!</span>
                  </div>
                  <p className="text-on-surface-variant leading-relaxed">
                    Thank you, <strong>{submittedTicket.name}</strong>. Your inquiry has been registered under ticket reference:
                  </p>
                  <div className="p-2.5 bg-surface-container-lowest rounded-xl font-mono text-sm font-bold text-primary border border-outline-variant/30 text-center">
                    {submittedTicket.ticketId}
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Our care coordination desk reviews messages within 2 hours during normal clinic operating hours (8:00 AM – 6:00 PM).
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedTicket(null)}
                    className="w-full py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer mt-2"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTicketSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">
                      Your Name
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
                      Contact Email or Phone
                    </label>
                    <input
                      type="text"
                      value={ticketContact}
                      onChange={(e) => setTicketContact(e.target.value)}
                      placeholder="e.g. eleanor@example.com or (555) 019-2834"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">
                      Category
                    </label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                    >
                      <option>Appointment Scheduling &amp; Reschedule</option>
                      <option>Prescription &amp; Refill Inquiry</option>
                      <option>Insurance &amp; Billing Verification</option>
                      <option>Telehealth Link or Technical Issue</option>
                      <option>Patient Feedback &amp; Suggestion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">
                      Your Message or Question
                    </label>
                    <textarea
                      rows={4}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Describe your question or how our care coordinator can assist..."
                      required
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Submit to Care Coordinator</span>
                  </button>
                </form>
              )}

              {/* Direct Telephone Access */}
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                <p className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span>Meridian Urgent Care &amp; Support Lines</span>
                </p>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-on-surface-variant">Pavilion B Concierge</span>
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
              </div>
            </div>
          )}

          {/* TAB 3: FAQs & Clinic Guide */}
          {activeTab === 'faq' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-surface">
              <h3 className="font-bold text-primary text-sm">Frequently Asked Questions</h3>
              {FAQ_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5"
                >
                  <p className="font-bold text-primary">{item.q}</p>
                  <p className="text-on-surface-variant leading-relaxed text-[11px]">{item.a}</p>
                </div>
              ))}

              <div className="p-3.5 rounded-2xl bg-secondary-container/20 border border-secondary-container space-y-2">
                <p className="font-bold text-secondary text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Pavilion Operating Hours</span>
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  • <strong>Monday – Friday:</strong> 8:00 AM – 6:00 PM<br />
                  • <strong>Saturday:</strong> 9:00 AM – 2:00 PM<br />
                  • <strong>Sunday:</strong> Urgent Care &amp; Telehealth Only
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
};
