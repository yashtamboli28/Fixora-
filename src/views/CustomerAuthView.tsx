import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Phone, ShieldCheck, Wrench, User } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { isSupabaseClientConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { AppView } from '../components/Navbar';

interface CustomerAuthViewProps {
  initialMode?: 'signup' | 'login';
  authRole?: 'customer' | 'technician';
  onSuccessRedirect: (
    role: 'customer' | 'technician' | 'admin',
    isNewLocationNeeded: boolean
  ) => void;
  onNavigate: (view: AppView, sectionId?: string) => void;
}

export const CustomerAuthView: React.FC<CustomerAuthViewProps> = ({
  initialMode = 'signup',
  authRole = 'customer',
  onSuccessRedirect,
  onNavigate,
}) => {
  const { signInWithGoogle, applyOtpLoginBundle, refreshAccount } = useAuth();

  const [mode, setMode] = useState<'signup' | 'login'>(
    authRole === 'technician' ? 'login' : initialMode
  );
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileDigits, setMobileDigits] = useState('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const [googleNeedsPhoneStep, setGoogleNeedsPhoneStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(authRole === 'technician' ? 'login' : initialMode);
    setOtpSent(false);
    setOtpCode('');
    setError(null);
  }, [initialMode, authRole]);

  const isTechnicianAuth = authRole === 'technician';
  const formattedPhone = `${countryCode}${mobileDigits.replace(/\D/g, '')}`;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isTechnicianAuth && mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^\d{10}$/.test(mobileDigits)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSupabaseClientConfigured && supabase) {
        const { error: supaError } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
        if (!supaError) {
          setOtpSent(true);
          setDemoNotice('OTP sent via configured Supabase Phone Auth provider.');
          setSubmitting(false);
          return;
        }
      }

      const res = await apiRequest<{
        phone: string;
        expiresInSeconds: number;
        demoNotice: string;
      }>('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: formattedPhone }),
      });
      setOtpSent(true);
      setDemoNotice(res.demoNotice);
    } catch (err: any) {
      setError(err.message || 'Could not send OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Please enter the 6-digit OTP verification code.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSupabaseClientConfigured && supabase) {
        const { data: supaVerify, error: supaErr } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otpCode.trim(),
          type: 'sms',
        });
        if (!supaErr && supaVerify.session && supaVerify.user) {
          await supabase.from('profiles').upsert({
            id: supaVerify.user.id,
            full_name: fullName.trim() || (isTechnicianAuth ? 'Technician' : 'Customer'),
            phone: formattedPhone,
            email: email.trim() || null,
            role: isTechnicianAuth ? 'technician' : 'customer',
          });
        }
      }

      const res = await apiRequest<{
        sessionToken: string;
        profile: any;
        addresses: any[];
        technicianProfile: any;
        savedTechnicianIds: string[];
      }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: formattedPhone,
          otp: otpCode.trim(),
          fullName: !isTechnicianAuth && mode === 'signup' ? fullName.trim() : undefined,
          email: email.trim() || undefined,
          requestedRole: isTechnicianAuth ? 'technician' : 'customer',
        }),
      });

      applyOtpLoginBundle(res.sessionToken, {
        profile: res.profile,
        addresses: res.addresses,
        technicianProfile: res.technicianProfile,
        savedTechnicianIds: res.savedTechnicianIds,
      });

      const role = res.profile?.role || (isTechnicianAuth ? 'technician' : 'customer');
      if (isTechnicianAuth && role === 'technician' && !res.technicianProfile) {
        onNavigate('technician-onboarding');
        return;
      }
      const needsLocation =
        role === 'customer' && (!res.addresses || res.addresses.length === 0);
      onSuccessRedirect(role, needsLocation);
    } catch (err: any) {
      if (err.data?.needsRegistration) {
        if (isTechnicianAuth) {
          setOtpSent(false);
          setOtpCode('');
          setError(
            'This mobile number is not registered as a technician yet. Click "Join as Technician" below to complete your technician onboarding.'
          );
        } else {
          setMode('signup');
          setOtpSent(false);
          setOtpCode('');
          setError(
            'This mobile number is not registered yet. Switched to Sign Up — enter your full name and verify OTP.'
          );
        }
      } else {
        setError(err.message || 'OTP verification failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const bundle = await signInWithGoogle();
      if (bundle.profile) {
        if (isTechnicianAuth && !bundle.technicianProfile && bundle.profile.role !== 'admin') {
          onNavigate('technician-onboarding');
          return;
        }
        const needsLocation =
          bundle.profile.role === 'customer' &&
          (!bundle.addresses || bundle.addresses.length === 0);
        onSuccessRedirect(bundle.profile.role, needsLocation);
      } else {
        if (isTechnicianAuth) {
          onNavigate('technician-onboarding');
          return;
        }
        setFullName('');
        setGoogleNeedsPhoneStep(true);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Please confirm your full name.');
      return;
    }
    if (mobileDigits && !/^\d{10}$/.test(mobileDigits)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      const bundle = await apiRequest<{
        profile: any;
        addresses: any[];
        technicianProfile: any;
        savedTechnicianIds: string[];
      }>('/api/me/sync', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: mobileDigits ? formattedPhone : undefined,
          requestedRole: 'customer',
        }),
      });
      await refreshAccount();
      const role = bundle.profile?.role || 'customer';
      const needsLocation =
        role === 'customer' && (!bundle.addresses || bundle.addresses.length === 0);
      onSuccessRedirect(role, needsLocation);
    } catch (err: any) {
      setError(err.message || 'Could not complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <button
        type="button"
        onClick={() =>
          onNavigate(
            'landing',
            mode === 'login' ? 'role-selection-login' : 'role-selection-signup'
          )
        }
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Customer / Technician Selection</span>
      </button>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isTechnicianAuth
                ? 'bg-[#071120] text-[#22C55E]'
                : 'bg-[#DCFCE7] text-[#16A34A]'
            }`}
          >
            {isTechnicianAuth ? <Wrench className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#071120]">
              {isTechnicianAuth
                ? 'Technician Login'
                : mode === 'signup'
                ? 'Customer Registration'
                : 'Customer Login'}
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          {isTechnicianAuth
            ? 'Verify your registered mobile number via OTP to open your Fixora Technician Portal and manage repair bookings.'
            : 'Verify your mobile number via OTP to discover nearby technicians, book repairs, and track progress.'}
        </p>

        {/* Mode Switcher for Customers */}
        {!googleNeedsPhoneStep && !isTechnicianAuth && (
          <div className="mt-6 grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setOtpSent(false);
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Customer Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setOtpSent(false);
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Existing Customer Login
            </button>
          </div>
        )}

        {error && (
          <div className="mt-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        {demoNotice && otpSent && (
          <div className="mt-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">OTP Challenge Sent to {formattedPhone}</div>
              <div className="mt-0.5">{demoNotice}</div>
            </div>
          </div>
        )}

        {googleNeedsPhoneStep ? (
          <form onSubmit={handleCompleteGoogleProfile} className="mt-6 space-y-4">
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              Google account verified. Confirm your name and mobile number to finish creating your profile.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aarav Kulkarni"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#16A34A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={countryCode}
                  className="w-16 px-3 py-2.5 text-sm font-mono bg-slate-100 border border-slate-300 rounded-xl text-center"
                />
                <input
                  type="tel"
                  maxLength={10}
                  value={mobileDigits}
                  onChange={(e) => setMobileDigits(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="flex-1 px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl focus:outline-none focus:border-[#16A34A]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-xl disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Saving Profile...' : 'Continue to Dashboard'}
            </button>
          </form>
        ) : !otpSent ? (
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
            {!isTechnicianAuth && mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#16A34A]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number with Country Code *
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Country code"
                  className="w-22 px-2.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#16A34A]"
                >
                  <option value="+91">+91 IN</option>
                </select>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobileDigits}
                  onChange={(e) => setMobileDigits(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="flex-1 px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-xl focus:outline-none focus:border-[#16A34A]"
                />
              </div>
            </div>

            {!isTechnicianAuth && mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#16A34A]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>{submitting ? 'Sending OTP...' : 'Send Verification OTP'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter 6-Digit OTP Sent to {formattedPhone} *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 text-base tracking-widest font-mono tabular-nums border border-slate-300 rounded-xl focus:outline-none focus:border-[#16A34A]"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode('');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Change Mobile Number
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-xl disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Verifying...' : 'Verify OTP & Continue'}
              </button>
            </div>
          </form>
        )}

        {/* Google Sign-In Alternative */}
        {!googleNeedsPhoneStep && (
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Continue with Google Account
            </button>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>Controlled Demo Test Credentials</span>
              </div>
              <p>
                Fixed Test OTP: <span className="font-mono font-semibold text-slate-900">123456</span>
              </p>
              <p>
                Demo Technician Login: <span className="font-mono">+91 9000000101</span> · Demo Admin Login:{' '}
                <span className="font-mono">+91 9000000001</span>
              </p>
            </div>

            {isTechnicianAuth ? (
              <div className="text-center text-xs text-slate-600 space-y-1.5">
                <div>
                  Not registered as a technician yet?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('technician-onboarding')}
                    className="font-semibold text-[#16A34A] hover:underline cursor-pointer"
                  >
                    Join as Technician
                  </button>
                </div>
                <div>
                  Looking to book a repair?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('customer-auth', 'login')}
                    className="font-semibold text-slate-800 hover:underline cursor-pointer"
                  >
                    Switch to Customer Login
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-600">
                Are you a mobile or laptop technician?{' '}
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      mode === 'login' ? 'customer-auth' : 'technician-onboarding',
                      mode === 'login' ? 'technician-login' : undefined
                    )
                  }
                  className="font-semibold text-[#16A34A] hover:underline cursor-pointer"
                >
                  {mode === 'login' ? 'Switch to Technician Login' : 'Join as Technician'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
