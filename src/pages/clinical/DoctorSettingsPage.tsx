import React, { useEffect, useState } from 'react';
import { DoctorProfileSettings } from '../../types.ts';
import { ASSETS } from '../../data/seedData.ts';
import { saveDoctorProfileSettings } from '../../services/firestoreService.ts';

interface DoctorSettingsPageProps {
  uid: string;
  doctorProfile: DoctorProfileSettings | null;
}

export const DoctorSettingsPage: React.FC<DoctorSettingsPageProps> = ({
  uid,
  doctorProfile,
}) => {
  const [fullName, setFullName] = useState(doctorProfile?.fullName || 'Dr. Sarah Jenkins');
  const [credentials, setCredentials] = useState(
    doctorProfile?.credentials || 'MD, FACC — Non-Invasive Cardiology'
  );
  const [specialty, setSpecialty] = useState(doctorProfile?.specialty || 'Cardiology');
  const [npiNumber, setNpiNumber] = useState(doctorProfile?.npiNumber || '1497820341');
  const [bio, setBio] = useState(doctorProfile?.bio || '');
  const [practiceName, setPracticeName] = useState(
    doctorProfile?.practiceName || 'Pavilion B — Heart & Vascular Center'
  );
  const [clinicAddress, setClinicAddress] = useState(
    doctorProfile?.clinicAddress || '450 Meridian Parkway, Pavilion B, Suite 204'
  );
  const [consultationFee, setConsultationFee] = useState(
    String(doctorProfile?.consultationFee ?? 240)
  );
  const [videoFee, setVideoFee] = useState(String(doctorProfile?.videoFee ?? 195));
  const [bufferMinutes, setBufferMinutes] = useState(
    String(doctorProfile?.bufferMinutes ?? 10)
  );
  const [maxDailyConsults, setMaxDailyConsults] = useState(
    String(doctorProfile?.maxDailyConsults ?? 18)
  );
  const [acceptingNewPatients, setAcceptingNewPatients] = useState(
    doctorProfile?.acceptingNewPatients ?? true
  );
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    doctorProfile?.twoFactorEnabled ?? true
  );
  const [smsAlerts, setSmsAlerts] = useState(doctorProfile?.smsAlerts ?? true);
  const [emailDigest, setEmailDigest] = useState(doctorProfile?.emailDigest ?? true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (!doctorProfile) return;
    setFullName(doctorProfile.fullName);
    setCredentials(doctorProfile.credentials || '');
    setSpecialty(doctorProfile.specialty);
    setNpiNumber(doctorProfile.npiNumber || '');
    setBio(doctorProfile.bio || '');
    setPracticeName(doctorProfile.practiceName || '');
    setClinicAddress(doctorProfile.clinicAddress || '');
    setConsultationFee(String(doctorProfile.consultationFee));
    setVideoFee(String(doctorProfile.videoFee ?? 195));
    setBufferMinutes(String(doctorProfile.bufferMinutes));
    setMaxDailyConsults(String(doctorProfile.maxDailyConsults));
    setAcceptingNewPatients(doctorProfile.acceptingNewPatients);
    setTwoFactorEnabled(doctorProfile.twoFactorEnabled ?? true);
    setSmsAlerts(doctorProfile.smsAlerts ?? true);
    setEmailDigest(doctorProfile.emailDigest ?? true);
  }, [doctorProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveDoctorProfileSettings(uid, {
        fullName,
        credentials,
        specialty,
        npiNumber,
        bio,
        practiceName,
        clinicAddress,
        consultationFee: Number(consultationFee) || 240,
        videoFee: Number(videoFee) || 195,
        acceptedPayers: doctorProfile?.acceptedPayers || [
          'Aetna Premier',
          'BlueCross PPO',
          'UnitedHealthcare',
          'Medicare Part B',
        ],
        bufferMinutes: Number(bufferMinutes) || 10,
        maxDailyConsults: Number(maxDailyConsults) || 18,
        acceptingNewPatients,
        twoFactorEnabled,
        smsAlerts,
        emailDigest,
        avatarUrl: doctorProfile?.avatarUrl || ASSETS.drSarahJenkins,
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-tertiary-fixed">check_circle</span>
          <span>Clinician profile &amp; preferences synced to Firestore.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Profile &amp; Practice Settings</h2>
          <p className="text-sm text-on-surface-variant">
            Manage your public physician directory card, clinic fees, and scheduling rules.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer self-start"
        >
          {saving ? 'Saving Changes...' : 'Save Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Settings Form Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile Information */}
          <div className="rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/25 clinical-shadow space-y-4">
            <h3 className="text-base font-bold text-primary">Profile Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Credentials</label>
                <input
                  type="text"
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Specialty</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">NPI Number</label>
                <input
                  type="text"
                  value={npiNumber}
                  onChange={(e) => setNpiNumber(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-primary block mb-1">Clinical Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Practice & Fees */}
          <div className="rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/25 clinical-shadow space-y-4">
            <h3 className="text-base font-bold text-primary">Practice &amp; Consultation Fees</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Practice Name</label>
                <input
                  type="text"
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Clinic Address</label>
                <input
                  type="text"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  In-Person Consult Fee ($)
                </label>
                <input
                  type="number"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  HD Video Visit Fee ($)
                </label>
                <input
                  type="number"
                  value={videoFee}
                  onChange={(e) => setVideoFee(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
            </div>
          </div>

          {/* Scheduling & Security */}
          <div className="rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/25 clinical-shadow space-y-4">
            <h3 className="text-base font-bold text-primary">Scheduling &amp; Security Preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Buffer Minutes Between Visits
                </label>
                <input
                  type="number"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Max Daily Consultations
                </label>
                <input
                  type="number"
                  value={maxDailyConsults}
                  onChange={(e) => setMaxDailyConsults(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-low p-2.5 text-sm border border-outline-variant/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                <span className="text-xs font-semibold text-primary">Accepting New Patients</span>
                <input
                  type="checkbox"
                  checked={acceptingNewPatients}
                  onChange={(e) => setAcceptingNewPatients(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                <span className="text-xs font-semibold text-primary">2FA Hardware Enforcement</span>
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                <span className="text-xs font-semibold text-primary">SMS Urgent Telemetry Alerts</span>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                <span className="text-xs font-semibold text-primary">Daily Morning Schedule Digest</span>
                <input
                  type="checkbox"
                  checked={emailDigest}
                  onChange={(e) => setEmailDigest(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Sticky Public Preview Card */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 rounded-2xl bg-surface-container-low p-6 border border-outline-variant/25 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
            Live Patient Directory Preview
          </span>
          <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/25 clinical-shadow space-y-4">
            <div className="flex items-center gap-3.5">
              <img
                src={doctorProfile?.avatarUrl || ASSETS.drSarahJenkins}
                alt={fullName}
                className="w-14 h-14 rounded-2xl object-cover"
              />
              <div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                  {specialty}
                </span>
                <h4 className="font-bold text-primary text-sm mt-1">{fullName}</h4>
                <p className="text-[11px] text-on-surface-variant">{credentials}</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{bio}</p>
            <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
              <span className="font-bold text-primary">
                ${consultationFee} In-Person • ${videoFee} Video
              </span>
              <span
                className={`font-semibold ${
                  acceptingNewPatients ? 'text-secondary' : 'text-error'
                }`}
              >
                {acceptingNewPatients ? 'Open' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
