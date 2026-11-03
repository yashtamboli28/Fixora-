import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { AppView } from './Navbar';

interface FooterProps {
  onNavigate: (view: AppView, sectionId?: string) => void;
}

type PolicyTopic = 'privacy' | 'terms' | 'safety' | 'support' | null;

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [activePolicy, setActivePolicy] = useState<PolicyTopic>(null);

  const policyContent: Record<
    Exclude<PolicyTopic, null>,
    { title: string; paragraphs: string[] }
  > = {
    privacy: {
      title: 'Privacy & Data Protection Policy',
      paragraphs: [
        'Customer residential addresses and contact phone numbers are never displayed publicly on Fixora. Your service address is shared exclusively with the verified technician you choose to book.',
        'Technician discovery cards expose only safe public business information: name, verification status, skills, supported brands, general service area, and approximate distance.',
        'Location coordinates are stored only after explicit consent and may be updated or switched to manual city/pincode entry at any time.',
      ],
    },
    terms: {
      title: 'Platform Terms of Use',
      paragraphs: [
        'Fixora operates as a two-sided local discovery and booking marketplace connecting customers across India with independent mobile and laptop repair technicians.',
        'All technician registrations undergo manual administrator verification before appearing in public search results. Technicians cannot approve their own profiles.',
        'For this MVP release, repair charges are settled directly with the technician offline ("Pay Technician Directly") after inspection and agreed service completion.',
      ],
    },
    safety: {
      title: 'Device Backup & Repair Safety Guidelines',
      paragraphs: [
        'Before handing over a smartphone or laptop, back up critical personal files and remove SIM or memory cards if not required for diagnostics.',
        'Confirm the diagnostic quote directly with your assigned technician before hardware part replacement begins.',
        'Inspect screen touch response, charging, audio, and camera functionality upon repair completion before making direct offline payment.',
      ],
    },
    support: {
      title: 'Customer & Technician Support',
      paragraphs: [
        'Support Hours: Monday to Saturday, 09:00 IST – 20:00 IST.',
        'Marketplace Helpdesk: support@fixora.in · Bengaluru, Karnataka, India.',
        'For active repair bookings, check real-time status updates directly inside your Customer Dashboard or Technician Portal.',
      ],
    },
  };

  return (
    <footer className="bg-[#071120] text-slate-300 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-3">
            <div className="text-xl font-bold tracking-tight">
              <span className="text-white">Fix</span>
              <span className="text-[#22C55E]">ora</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Connecting Indian households and professionals with skilled local mobile phone and laptop repair technicians.
            </p>
            <p className="text-xs text-slate-400 pt-1">
              Helpdesk: support@fixora.in · Mon–Sat, 9 AM – 8 PM IST
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Marketplace</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('landing')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('landing', 'services')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Repair Services
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('discover')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Find a Technician
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('landing', 'how-it-works')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  How It Works
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Get Started</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('customer-auth', 'signup')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Continue as Customer
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('technician-onboarding')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Join as Technician
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('landing', 'role-selection-login')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Existing Account Login
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Support & Policies</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy('support')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Contact Support
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy('safety')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Repair Safety Checklist
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy('privacy')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy('terms')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Fixora Local Electronics Repair Marketplace. All rights reserved.</p>
          <p>Built for transparent local mobile & laptop servicing across India.</p>
        </div>
      </div>

      {activePolicy && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 border border-slate-200 shadow-lg">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {policyContent[activePolicy].title}
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-5 space-y-3 text-sm text-slate-600 leading-relaxed">
              {policyContent[activePolicy].paragraphs.map((text, idx) => (
                <p key={idx}>{text}</p>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
