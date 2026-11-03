import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Laptop,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Star,
  User,
  Wrench,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MARKETPLACE_MEDIA } from '../assets/media';
import {
  LAPTOP_REPAIR_PROBLEMS,
  MOBILE_REPAIR_PROBLEMS,
  type PublicReview,
  type PublicTechnician,
} from '../types/marketplace';
import { ProblemIconBadge } from '../components/ProblemIconBadge';
import type { AppView } from '../components/Navbar';

interface LandingViewProps {
  roleSelectionIntent?: 'signup' | 'login';
  onChangeRoleIntent?: (intent: 'signup' | 'login') => void;
  onNavigate: (view: AppView, sectionId?: string) => void;
  onSelectRepairIntent: (deviceType: string, problem?: string) => void;
  onBookTechnician: (tech: PublicTechnician) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  roleSelectionIntent = 'signup',
  onChangeRoleIntent,
  onNavigate,
  onSelectRepairIntent,
}) => {
  const { profile } = useAuth();
  const [selectedDeviceTab, setSelectedDeviceTab] = useState<
    'Mobile Phone' | 'Laptop / Desktop'
  >('Mobile Phone');
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const isLoginIntent = roleSelectionIntent === 'login';

  useEffect(() => {
    let cancelled = false;
    async function loadReviews() {
      try {
        const revRes = await apiRequest<{ reviews: PublicReview[] }>(
          '/api/reviews/public'
        );
        if (!cancelled) {
          setReviews(revRes.reviews || []);
        }
      } catch (err) {
        console.error('Error loading verified reviews:', err);
      }
    }
    loadReviews();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayedProblems =
    selectedDeviceTab === 'Mobile Phone'
      ? MOBILE_REPAIR_PROBLEMS
      : LAPTOP_REPAIR_PROBLEMS;

  const fourSteps = [
    {
      number: '1',
      icon: Search,
      title: 'Tell us the problem',
      description: "Pick your device and the issue you're facing.",
    },
    {
      number: '2',
      icon: MapPin,
      title: 'Find technicians nearby',
      description: 'Compare approved technicians by distance, skills and hours.',
    },
    {
      number: '3',
      icon: Calendar,
      title: 'Book a slot',
      description: 'Choose a preferred date and time. The technician accepts.',
    },
    {
      number: '4',
      icon: ClipboardCheck,
      title: 'Track & pay directly',
      description: 'Follow progress live and pay the technician directly.',
    },
  ];

  return (
    <div className="bg-[#F8FAFC]">
      {/* HERO SECTION + DUAL ROLE CARDS */}
      <section className="bg-[radial-gradient(ellipse_at_top_left,_#DCFCE7_0%,_#F8FAFC_45%,_#FFFFFF_100%)] border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-16 lg:pb-24">
          {/* Split Hero Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-6">
              <p className="text-sm font-semibold text-[#16A34A] mb-4">
                Mobile & laptop repair marketplace
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#071120] leading-[1.08]">
                Electronics repair, made{' '}
                <span className="text-[#16A34A]">simple and local.</span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Find trusted mobile and laptop repair technicians near you. Connect with skilled professionals, compare services, and book your repair without unnecessary hassle.
              </p>
            </div>

            {/* Right Photographic Showcase Column */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden shadow-xl shadow-slate-900/10 border border-slate-200/80 bg-slate-900 aspect-4/3">
                {!heroImgFailed ? (
                  <img
                    src={MARKETPLACE_MEDIA.heroTechnicianPhoto}
                    alt="Skilled Indian electronics repair technician servicing a smartphone with precision tools"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white bg-gradient-to-br from-[#071120] to-emerald-950">
                    <Wrench className="w-12 h-12 text-[#22C55E] mb-3" />
                    <span className="text-lg font-bold">Precision Mobile & Laptop Care</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Two Prominent Role Entry CTA Cards (Target for Navbar Get Started & Login) */}
          <div id="role-selection" className="mt-14 lg:mt-16 scroll-mt-24">
            {!profile && (
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#071120]">
                    {isLoginIntent
                      ? 'Welcome back — choose whether you are logging in as a Customer or a Technician'
                      : 'Choose whether you are joining Fixora as a Customer or a Technician'}
                  </p>
                </div>
                {onChangeRoleIntent && (
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => onChangeRoleIntent('signup')}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        !isLoginIntent
                          ? 'bg-white text-[#071120] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Get Started
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeRoleIntent('login')}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        isLoginIntent
                          ? 'bg-white text-[#071120] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Login
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-stretch">
              {/* Card A: I am a Customer */}
              <div className="bg-white rounded-3xl p-8 sm:p-9 border border-slate-200/80 shadow-lg shadow-slate-200/60 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold text-[#071120]">
                    I am a Customer
                  </h2>
                  <ul className="mt-5 space-y-3 text-sm text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                      <span>Find a local technician</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                      <span>Book a repair</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                      <span>Track repair requests</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      profile?.role === 'customer'
                        ? onNavigate('customer-dashboard')
                        : onNavigate(
                            'customer-auth',
                            isLoginIntent ? 'login' : 'signup'
                          )
                    }
                    className="w-full py-3.5 px-6 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>
                      {profile?.role === 'customer'
                        ? 'Open Customer Dashboard'
                        : isLoginIntent
                        ? 'Login as Customer'
                        : 'Continue as Customer'}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                  {!profile && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate(
                            'customer-auth',
                            isLoginIntent ? 'signup' : 'login'
                          )
                        }
                        className="text-xs font-medium text-slate-500 hover:text-[#16A34A] transition-colors cursor-pointer"
                      >
                        {isLoginIntent
                          ? 'New to Fixora? Register as Customer'
                          : 'Already have an account? Login as Customer'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card B: I am a Technician */}
              <div className="bg-[#071120] text-white rounded-3xl p-8 sm:p-9 border border-slate-800 shadow-xl shadow-slate-900/15 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold text-white">
                    I am a Technician
                  </h2>
                  <ul className="mt-5 space-y-3 text-sm text-slate-200">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                      <span>Join our technician network</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                      <span>Receive nearby customer requests</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                      <span>Grow your repair business</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      profile?.role === 'technician'
                        ? onNavigate('technician-dashboard')
                        : isLoginIntent
                        ? onNavigate('customer-auth', 'technician-login')
                        : onNavigate('technician-onboarding')
                    }
                    className="w-full py-3.5 px-6 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>
                      {profile?.role === 'technician'
                        ? 'Open Technician Portal'
                        : isLoginIntent
                        ? 'Login as Technician'
                        : 'Join as Technician'}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                  {!profile && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() =>
                          isLoginIntent
                            ? onNavigate('technician-onboarding')
                            : onNavigate('customer-auth', 'technician-login')
                        }
                        className="text-xs font-medium text-slate-400 hover:text-[#22C55E] transition-colors cursor-pointer"
                      >
                        {isLoginIntent
                          ? 'New technician? Join as Technician'
                          : 'Already registered? Login as Technician'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AVAILABLE REPAIR SERVICES SECTION (Clean 2 Device Cards + 4x2 Problem Icon Cards) */}
      <section id="services" className="py-20 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#16A34A]">Services</p>
            <h2 className="mt-1.5 text-3xl sm:text-4xl font-extrabold text-[#071120] tracking-tight">
              Available repair services
            </h2>
            <p className="mt-2.5 text-base text-slate-500">
              Choose your device to get started.
            </p>
          </div>

          {/* Primary Device Horizontal Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => setSelectedDeviceTab('Mobile Phone')}
              className={`group bg-white rounded-2xl border p-6 flex items-center justify-between gap-4 text-left transition-all cursor-pointer ${
                selectedDeviceTab === 'Mobile Phone'
                  ? 'border-[#16A34A] shadow-sm'
                  : 'border-slate-200/90 hover:border-[#16A34A]/60 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#071120] text-[#22C55E] flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#071120]">Mobile Phones</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Screen, battery, charging, camera & more
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#16A34A] group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDeviceTab('Laptop / Desktop')}
              className={`group bg-white rounded-2xl border p-6 flex items-center justify-between gap-4 text-left transition-all cursor-pointer ${
                selectedDeviceTab === 'Laptop / Desktop'
                  ? 'border-[#16A34A] shadow-sm'
                  : 'border-slate-200/90 hover:border-[#16A34A]/60 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#071120] text-[#22C55E] flex items-center justify-center shrink-0">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#071120]">
                    Laptops & Desktops
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Display, keyboard, hardware, OS & more
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#16A34A] group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          </div>

          {/* 4x2 Horizontal Problem Cards with Soft-Green Circular Icons */}
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <p className="text-sm font-semibold text-slate-700">
                Select a {selectedDeviceTab === 'Mobile Phone' ? 'mobile phone' : 'laptop or desktop'} issue to find nearby technicians:
              </p>
              <button
                type="button"
                onClick={() => onSelectRepairIntent(selectedDeviceTab)}
                className="text-xs font-semibold text-[#16A34A] hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>Browse all {selectedDeviceTab === 'Mobile Phone' ? 'mobile' : 'laptop'} technicians</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedProblems.map((problem) => (
                <button
                  key={`${selectedDeviceTab}-${problem}`}
                  type="button"
                  onClick={() => onSelectRepairIntent(selectedDeviceTab, problem)}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#16A34A] hover:shadow-sm px-5 py-4 flex items-center gap-4 text-left transition-all cursor-pointer"
                >
                  <ProblemIconBadge problem={problem} />
                  <span className="text-sm sm:text-[15px] font-semibold text-[#071120] leading-snug">
                    {problem}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 bg-[#F8FAFC] border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#16A34A]">How it works</p>
            <h2 className="mt-1.5 text-3xl sm:text-4xl font-extrabold text-[#071120] tracking-tight">
              From problem to fixed in four steps
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {fourSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-[#16A34A] text-white font-bold text-sm flex items-center justify-center font-mono tabular-nums shrink-0">
                      {step.number}
                    </span>
                    <Icon className="w-5 h-5 text-[#16A34A] shrink-0" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-[#071120]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BENEFITS FOR CUSTOMERS & TECHNICIANS */}
      <section id="about-us" className="py-20 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200/80 p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#071120]">
                  Benefits for Customers
                </h3>
              </div>
              <ul className="space-y-3.5 text-sm text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    <strong className="text-slate-900">Nearby Distance Search:</strong> Discover approved technicians within genuine travel range of your pincode or GPS coordinates.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    <strong className="text-slate-900">Protected Personal Privacy:</strong> Your street address is never exposed publicly and is revealed only to your booked technician.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    <strong className="text-slate-900">Doorstep or Workshop Choice:</strong> Choose home-service visits or drop off at verified local repair shops.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200/80 p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#071120] text-[#22C55E] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#071120]">
                  Benefits for Technicians
                </h3>
              </div>
              <ul className="space-y-3.5 text-sm text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    <strong className="text-slate-900">Dedicated Professional Presence:</strong> Highlight years of experience, supported brands, and chip-level or modular specialties.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    <strong className="text-slate-900">Custom Radius & Working Hours:</strong> Control your kilometre coverage area, weekly schedule, and live booking toggle.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  <span>
                    <strong className="text-slate-900">Direct Offline Settlement:</strong> Customers pay you directly upon inspection with zero platform commission deductions.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* VERIFIED CUSTOMER REVIEWS */}
      {reviews.length > 0 && (
        <section className="py-16 bg-[#F8FAFC] border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-8">
              <p className="text-sm font-semibold text-[#16A34A]">Customer feedback</p>
              <h2 className="mt-1.5 text-3xl font-extrabold text-[#071120] tracking-tight">
                Verified repair reviews
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="font-mono tabular-nums">{rev.rating}/5</span>
                      </span>
                      <span>·</span>
                      <span>
                        {rev.deviceBrand} ({rev.repairProblem})
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                      “{rev.review}”
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{rev.customerLabel}</span>
                    <span> · {rev.city}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL REGISTRATION CTA BANNER */}
      <section className="bg-[#071120] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Need a repair or ready to grow your local workshop?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-300">
              Register on Fixora as a customer in seconds with mobile OTP verification, or onboard as an independent technician.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('customer-auth', 'signup')}
              className="px-6 py-3.5 text-sm font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              Continue as Customer
            </button>
            <button
              type="button"
              onClick={() => onNavigate('technician-onboarding')}
              className="px-6 py-3.5 text-sm font-semibold text-[#071120] bg-white hover:bg-slate-100 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              Join as Technician
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
