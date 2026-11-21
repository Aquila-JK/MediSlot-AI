import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { PortalMode } from '../types.ts';
import { ASSETS } from '../data/seedData.ts';

interface PortalLoginPageProps {
  onEnterPatientDashboard: () => void;
  onEnterClinicalDashboard: () => void;
  onOpenChatbot?: () => void;
}

export const PortalLoginPage: React.FC<PortalLoginPageProps> = ({
  onEnterPatientDashboard,
  onEnterClinicalDashboard,
  onOpenChatbot,
}) => {
  const { login, register, forgotPassword, resetPassword } = useAuth();

  // Tab State: 'login' | 'signup' | 'forgot'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Form Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up Fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState<PortalMode>('patient');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Forgot Password Fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotVerified, setForgotVerified] = useState(false);

  // UI States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(loginEmail, loginPassword);
      setSuccessMessage(`Welcome back, ${user.name}!`);
      if (user.role === 'clinical') {
        onEnterClinicalDashboard();
      } else {
        onEnterPatientDashboard();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Sign Up
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!signUpName.trim() || signUpName.trim().length < 2) {
      setErrorMessage('Please enter your full legal name (minimum 2 characters).');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!signUpEmail.trim() || !emailRegex.test(signUpEmail.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (signUpPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password entry.');
      return;
    }

    setLoading(true);
    try {
      const newUser = await register({
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
        role: signUpRole,
      });
      setSuccessMessage(`Account created successfully! Welcome to MediSlot, ${newUser.name}.`);
      if (newUser.role === 'clinical') {
        onEnterClinicalDashboard();
      } else {
        onEnterPatientDashboard();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Forgot Password
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      if (!forgotVerified) {
        const res = await forgotPassword(forgotEmail);
        setForgotVerified(true);
        setSuccessMessage(res.message);
      } else {
        if (newPassword.length < 6) {
          setErrorMessage('New password must be at least 6 characters long.');
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setErrorMessage('New passwords do not match.');
          return;
        }
        await resetPassword(forgotEmail, newPassword);
        setSuccessMessage('Password updated successfully! You can now log in with your new password.');
        setAuthMode('login');
        setLoginEmail(forgotEmail);
        setLoginPassword('');
        setForgotVerified(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to verify account.');
    } finally {
      setLoading(false);
    }
  };

  // Fast autofill for testing
  const autofillDemo = (role: 'patient' | 'doctor') => {
    clearMessages();
    setAuthMode('login');
    if (role === 'patient') {
      setLoginEmail('patient@medislot.com');
      setLoginPassword('Patient@123');
    } else {
      setLoginEmail('doctor@medislot.com');
      setLoginPassword('Doctor@123');
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="w-full px-6 md:px-12 h-20 flex items-center justify-between max-w-7xl mx-auto shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-on-primary text-[22px]">vital_signs</span>
          </div>
          <div>
            <span className="text-xl font-bold text-primary tracking-tight">
              MediSlot<span className="text-on-tertiary-container ml-0.5">AI</span>
            </span>
            <p className="text-[11px] uppercase tracking-[0.08em] text-secondary font-semibold leading-none mt-0.5">
              Clinical &amp; Concierge Suite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenChatbot && (
            <button
              type="button"
              onClick={onOpenChatbot}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/25 text-xs font-bold hover:bg-primary hover:text-white transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[17px] text-secondary">smart_toy</span>
              <span>Ask AI Chatbot</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-xs font-semibold text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Secure Medical Auth</span>
          </div>
        </div>
      </header>

      {/* Main Login / Registration Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Editorial Branding Hero */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-semibold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Individual Patient &amp; Doctor Accounts</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-primary tracking-tight leading-[1.14]">
            Calm, intelligent healthcare tailored to you.
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
            Sign in with your individual MediSlot credentials to manage confidential appointments, access your medical records, or coordinate clinical care.
          </p>

          {/* Pavilion Facility Card */}
          <div className="rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/30 editorial-shadow">
            <img
              src={ASSETS.pavilionB}
              alt="Meridian Medical Pavilion B Atrium"
              className="w-full h-44 object-cover"
            />
            <div className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Meridian Medical Pavilion B
                </p>
                <p className="text-sm font-semibold text-primary mt-0.5">
                  Cardiology • Neurology • Dermatology • Orthopedics
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-primary">4.9 ★</p>
                <p className="text-[11px] text-on-surface-variant">Verified Clinical Care</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="lg:col-span-7 max-w-xl w-full mx-auto">
          <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/30 p-6 sm:p-9 shadow-xl relative">
            {/* Mode Selector Tabs: Login vs Sign Up */}
            <div className="flex border-b border-outline-variant/30 mb-6 bg-surface-container-low rounded-2xl p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  clearMessages();
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  clearMessages();
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'signup'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Create Account</span>
              </button>
            </div>

            {/* Error & Success Feedback Alerts */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-start gap-2.5 border border-error/20 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">error</span>
                <span className="flex-1">{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage(null)} className="cursor-pointer text-error hover:opacity-80">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-start gap-2.5 border border-emerald-200 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                <span className="flex-1">{successMessage}</span>
                <button type="button" onClick={() => setSuccessMessage(null)} className="cursor-pointer text-emerald-700 hover:opacity-80">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {/* 1. LOGIN FORM */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-outline text-[18px]">
                      mail
                    </span>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. eleanor.vance@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setForgotEmail(loginEmail);
                        clearMessages();
                      }}
                      className="text-[11px] font-semibold text-secondary hover:text-primary hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-outline text-[18px]">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your account password"
                      required
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs outline-none focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-2.5 text-outline hover:text-primary transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm hover:bg-primary-container transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">login</span>
                      <span>Log In to MediSlot</span>
                    </>
                  )}
                </button>

                {/* Convenient 1-Click Demo Credentials for Evaluators */}
                <div className="pt-4 mt-4 border-t border-outline-variant/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    Quick Demo Credentials:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => autofillDemo('patient')}
                      className="p-2.5 rounded-xl bg-surface-container-low hover:bg-secondary-container hover:text-on-secondary-container border border-outline-variant/30 text-left transition-colors cursor-pointer"
                    >
                      <p className="font-bold text-[11px] text-primary">Patient Demo</p>
                      <p className="text-[10px] text-on-surface-variant">Eleanor Vance</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => autofillDemo('doctor')}
                      className="p-2.5 rounded-xl bg-surface-container-low hover:bg-secondary-container hover:text-on-secondary-container border border-outline-variant/30 text-left transition-colors cursor-pointer"
                    >
                      <p className="font-bold text-[11px] text-primary">Doctor Demo</p>
                      <p className="text-[10px] text-on-surface-variant">Dr. Sarah Jenkins</p>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* 2. SIGN UP FORM */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-outline text-[18px]">
                      badge
                    </span>
                    <input
                      type="text"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-outline text-[18px]">
                      mail
                    </span>
                    <input
                      type="email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="e.g. john.doe@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Role Selector: Patient vs Physician */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignUpRole('patient')}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2 ${
                        signUpRole === 'patient'
                          ? 'border-primary bg-primary-container/10 font-bold text-primary'
                          : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      <span>Patient</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignUpRole('clinical')}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2 ${
                        signUpRole === 'clinical'
                          ? 'border-primary bg-primary-container/10 font-bold text-primary'
                          : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                      <span>Physician</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1">
                    Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-outline text-[18px]">
                      lock
                    </span>
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="Create a secure password"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((prev) => !prev)}
                      className="absolute right-3.5 top-2.5 text-outline hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showSignUpPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-outline text-[18px]">
                      lock_reset
                    </span>
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm hover:bg-primary-container transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Creating Secure Account...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">person_add</span>
                      <span>Create Account &amp; Access MediSlot</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* 3. FORGOT PASSWORD VIEW */}
            {authMode === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
                  <span className="material-symbols-outlined text-[20px]">password</span>
                  <span>Account Password Recovery</span>
                </div>
                <p className="text-on-surface-variant leading-relaxed text-[11px]">
                  {!forgotVerified
                    ? 'Enter your registered email address to verify your account identity.'
                    : 'Account identity verified. Please enter your new secure password.'}
                </p>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-outline text-[18px]">
                      mail
                    </span>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      required
                      disabled={forgotVerified}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs outline-none focus:border-primary disabled:opacity-60"
                    />
                  </div>
                </div>

                {forgotVerified && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1">
                        New Password (min 6 characters)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        minLength={6}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        minLength={6}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      clearMessages();
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:text-primary text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {!forgotVerified ? 'Verify Email' : 'Save New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-7xl mx-auto px-6 md:px-12 py-4 text-center text-xs text-on-surface-variant border-t border-outline-variant/20 shrink-0">
        <p>
          MediSlot AI Secure Clinical Access • Protected by HIPAA-compliant protocol standards. Passwords are cryptographically salted and hashed.
        </p>
      </footer>
    </div>
  );
};
