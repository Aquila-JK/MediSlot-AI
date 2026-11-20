import React, { useState } from 'react';
import { Doctor, PatientRoute } from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';

interface CustomerSupportPageProps {
  userName: string;
  doctors: Doctor[];
  onNavigate: (route: PatientRoute) => void;
  onSelectDoctor: (doctor: Doctor) => void;
}

export const CustomerSupportPage: React.FC<CustomerSupportPageProps> = ({
  userName,
  doctors,
  onNavigate,
  onSelectDoctor,
}) => {
  const [ticketName, setTicketName] = useState(userName === 'Patient' ? '' : userName);
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Appointment Question');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);

  const [faqSearch, setFaqSearch] = useState('');

  const faqs = [
    {
      question: 'How do I schedule an appointment with a specialist?',
      answer:
        'You can browse doctors by specialty, campus, or availability under the "Find Doctors" tab. Pick any open slot (in-person or telehealth) and confirm your visit in 1 click.',
      category: 'Appointments',
    },
    {
      question: 'Can I do a telehealth consultation instead of coming in person?',
      answer:
        'Yes. All MediSlot specialists support secure HD Telehealth appointments. Choose the "HD Telehealth Video" option when booking your slot.',
      category: 'Telehealth',
    },
    {
      question: 'How do prescription refills work on MediSlot?',
      answer:
        'Visit your Patient Dashboard, locate the Active Prescriptions panel, and tap "Request Refill". The clinician will review your telemetry and authorize the refill within 24 hours.',
      category: 'Prescriptions',
    },
    {
      question: 'What insurance payers are accepted at Meridian Medical Pavilion?',
      answer:
        'We accept Blue Cross Blue Shield, Aetna, Medicare, UnitedHealthcare, and Cigna. You can also self-pay with transparent pricing listed for every specialist.',
      category: 'Billing',
    },
    {
      question: 'Where can I find my medical records (MRN) and visit history?',
      answer:
        'Your Medical Record Number (MRN) and full past consultation records are accessible directly on your Patient Dashboard under "Visit History" and "Clinical Metrics".',
      category: 'Medical Records',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      !faqSearch.trim() ||
      f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    const ticketId = `MED-TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketSuccess(ticketId);
    setTicketMessage('');
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <section className="rounded-3xl bg-primary text-on-primary p-6 sm:p-10 editorial-shadow">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-primary-fixed text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Customer Response &amp; Patient Help Center</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            How can our care team assist you today, {userName}?
          </h1>
          <p className="text-sm sm:text-base text-primary-fixed-dim leading-relaxed">
            Instant answers, scheduling assistance, clinical triage, and direct communication with Meridian Medical Pavilion care coordinators.
          </p>
        </div>
      </section>

      {/* Quick Action Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('find-doctors')}
          className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-on-primary transition-colors">
            <span className="material-symbols-outlined text-[22px]">calendar_month</span>
          </div>
          <h2 className="font-bold text-primary text-sm">Book Specialist</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Browse open slots for Cardiology, Neurology, Dermatology, Orthopedics.
          </p>
        </div>

        <div
          onClick={() => onNavigate('dashboard')}
          className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-3 group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
            <span className="material-symbols-outlined text-[22px]">medication</span>
          </div>
          <h2 className="font-bold text-primary text-sm">Refill Medications</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Submit 1-click prescription refills through your digital health dashboard.
          </p>
        </div>

        <div
          onClick={() => onNavigate('ai-assistant')}
          className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[22px]">smart_toy</span>
          </div>
          <h2 className="font-bold text-primary text-sm">AI Clinical Triage</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Ask symptoms, get preparation checklists, and match with the right doctor.
          </p>
        </div>

        <div
          onClick={() => {
            const doc = doctors[0];
            if (doc) onSelectDoctor(doc);
            else onNavigate('find-doctors');
          }}
          className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[22px]">emergency</span>
          </div>
          <h2 className="font-bold text-primary text-sm">Urgent Consultation</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Connect with on-call specialist Dr. Sarah Jenkins or call (555) 019-CARE.
          </p>
        </div>
      </section>

      {/* Split Section: Support Form & Clinic Directory */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Support Ticket Submission */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/30 shadow-sm space-y-5">
          <div>
            <h2 className="text-xl font-bold text-primary">Contact Care Coordination</h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Have a clinical inquiry, billing question, or need special accommodations? Leave a message and a coordinator will reply promptly.
            </p>
          </div>

          {ticketSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-base">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
                <span>Inquiry Successfully Registered!</span>
              </div>
              <p className="text-xs leading-relaxed">
                Thank you for contacting MediSlot Patient Support. Your ticket has been logged with ID:
              </p>
              <div className="p-3 bg-white rounded-xl font-mono text-sm font-bold text-primary border border-emerald-200 text-center">
                {ticketSuccess}
              </div>
              <p className="text-xs text-emerald-800">
                A confirmation has been recorded. Our clinical coordinator desk at Meridian Pavilion B will follow up within 2 hours.
              </p>
              <button
                type="button"
                onClick={() => setTicketSuccess(null)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={ticketName}
                    onChange={(e) => setTicketName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface outline-none focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface mb-1">Email or Phone Number</label>
                  <input
                    type="text"
                    value={ticketEmail}
                    onChange={(e) => setTicketEmail(e.target.value)}
                    placeholder="e.g. eleanor@example.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Inquiry Topic</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface outline-none focus:border-primary text-xs cursor-pointer"
                >
                  <option>Appointment Scheduling &amp; Reschedule</option>
                  <option>Prescription &amp; Refill Inquiry</option>
                  <option>Insurance Pre-Authorization &amp; Billing</option>
                  <option>Telehealth Audio/Video Technical Assistance</option>
                  <option>General Clinical Question</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Detailed Message</label>
                <textarea
                  rows={4}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="How can we assist you today? Please provide any relevant details..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface outline-none focus:border-primary text-xs resize-none"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Submit Care Inquiry</span>
              </button>
            </form>
          )}
        </div>

        {/* Pavilion Clinic Information */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">domain</span>
              <span>Meridian Medical Pavilion</span>
            </h2>
            <div className="rounded-2xl overflow-hidden h-36">
              <img
                src={ASSETS.pavilionB}
                alt="Pavilion B Heart and Vascular Center"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2 text-xs text-on-surface-variant">
              <p className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">location_on</span>
                <span>400 Meridian Parkway, Pavilion B (Suite 300), Health Sciences Campus</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">call</span>
                <span className="font-semibold text-primary">(555) 019-2834</span> (Reception Desk)
              </p>
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">schedule</span>
                <span>Mon–Fri: 8:00 AM – 6:00 PM | Sat: 9:00 AM – 2:00 PM</span>
              </p>
            </div>
          </div>

          <div className="bg-secondary-container/20 p-5 rounded-3xl border border-secondary-container space-y-2">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Emergency Disclaimer</span>
            </h3>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              MediSlot Customer Response and AI triage are intended for administrative, non-emergent scheduling and care coordination. If you are experiencing acute chest pain, uncontrolled bleeding, or breathing difficulty, call <strong>911</strong> or proceed to the nearest emergency center immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/30 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-primary">Knowledge Base &amp; FAQs</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Answers to common patient questions regarding consultations, telehealth, and pharmacy.
            </p>
          </div>
          <div className="w-full sm:w-72 relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search help topics..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFaqs.map((faq, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-1.5"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary px-2 py-0.5 rounded-full bg-secondary-container/40">
                {faq.category}
              </span>
              <h3 className="font-bold text-primary text-xs pt-1">{faq.question}</h3>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
