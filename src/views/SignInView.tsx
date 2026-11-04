import React, { useState } from 'react';
import { ArrowLeft, User, Wrench } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { AppView } from '../components/Navbar';

interface SignInViewProps {
  authRole?: 'customer' | 'technician';
  onSwitchToSignUp: () => void;
  onNavigate: (view: AppView, sectionId?: string) => void;
}

export const SignInView: React.FC<SignInViewProps> = ({
  authRole = 'customer',
  onSwitchToSignUp,
  onNavigate,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTechnicianAuth = authRole === 'technician';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Redirect to Home page ("/")
      window.history.pushState({}, '', '/');
      onNavigate('landing');
    } catch (err: any) {
      setError(err.message || 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <button
        type="button"
        onClick={() => onNavigate('landing', 'role-selection-login')}
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
            {isTechnicianAuth ? (
              <Wrench className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#071120]">
              {isTechnicianAuth ? 'Technician Login' : 'Customer Login'}
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          {isTechnicianAuth
            ? 'Sign in with your registered email and password to access your Fixora Technician account.'
            : 'Sign in with your email and password to discover nearby technicians, book repairs, and track progress.'}
        </p>

        {!isTechnicianAuth && (
          <div className="mt-6 grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="py-2 text-xs font-semibold rounded-lg transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              New Customer Sign Up
            </button>
            <button
              type="button"
              className="py-2 text-xs font-semibold rounded-lg transition-colors bg-white text-slate-900 shadow-xs cursor-pointer"
            >
              Existing Customer Login
            </button>
          </div>
        )}

        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#16A34A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#16A34A]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
          >
            <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
          </button>

          {error && (
            <p className="text-xs text-red-600 font-medium pt-1">{error}</p>
          )}
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center text-xs text-slate-600 space-y-1.5">
          {isTechnicianAuth ? (
            <>
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
            </>
          ) : (
            <div>
              Are you a mobile or laptop technician?{' '}
              <button
                type="button"
                onClick={() => onNavigate('customer-auth', 'technician-login')}
                className="font-semibold text-[#16A34A] hover:underline cursor-pointer"
              >
                Switch to Technician Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
