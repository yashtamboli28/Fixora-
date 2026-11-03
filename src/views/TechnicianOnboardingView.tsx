import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  LocateFixed,
  Phone,
  Upload,
} from 'lucide-react';
import { apiRequest, compressImageFile } from '../lib/api';
import { INDIAN_CITY_COORDINATES } from '../lib/geo';
import { useAuth } from '../context/AuthContext';
import {
  DAYS_OF_WEEK,
  LAPTOP_REPAIR_PROBLEMS,
  MOBILE_REPAIR_PROBLEMS,
  POPULAR_LAPTOP_BRANDS,
  POPULAR_MOBILE_BRANDS,
} from '../types/marketplace';
import type { AppView } from '../components/Navbar';

interface TechnicianOnboardingViewProps {
  onNavigate: (view: AppView, sectionId?: string) => void;
}

export const TechnicianOnboardingView: React.FC<TechnicianOnboardingViewProps> = ({
  onNavigate,
}) => {
  const {
    isAuthenticated,
    profile,
    signInWithGoogle,
    applyOtpLoginBundle,
    refreshAccount,
  } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Personal & OTP Auth
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [mobileDigits, setMobileDigits] = useState(
    profile?.phone ? profile.phone.replace(/^\+91/, '') : ''
  );
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState<boolean>(isAuthenticated);
  const [demoHint, setDemoHint] = useState<string | null>(null);
  const [email, setEmail] = useState(profile?.email || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [profileImage, setProfileImage] = useState<string>('');

  // Step 2: Address & Location
  const [fullAddress, setFullAddress] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [stateName, setStateName] = useState('Karnataka');
  const [pincode, setPincode] = useState('560034');
  const [latitude, setLatitude] = useState<string>('12.9352');
  const [longitude, setLongitude] = useState<string>('77.6245');
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(12);
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // Step 3: Shop Information
  const [hasShop, setHasShop] = useState<boolean>(true);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopLocation, setShopLocation] = useState('');
  const [shopContact, setShopContact] = useState('');
  const [independentMode, setIndependentMode] = useState<'home_service' | 'both'>(
    'home_service'
  );
  const [independentCoverageAreas, setIndependentCoverageAreas] = useState('');

  // Step 4: Professional Information
  const [experienceYears, setExperienceYears] = useState<number>(4);
  const [professionalDescription, setProfessionalDescription] = useState('');
  const [deviceSpecialization, setDeviceSpecialization] = useState<
    'mobile' | 'laptop' | 'both'
  >('both');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([
    'Samsung',
    'Apple',
    'OnePlus',
    'Dell',
    'HP',
  ]);
  const [customBrands, setCustomBrands] = useState('');
  const [mobileProblems, setMobileProblems] = useState<string[]>([
    'Screen damage',
    'Battery replacement',
    'Charging port issue',
  ]);
  const [laptopProblems, setLaptopProblems] = useState<string[]>([
    'Display problem',
    'Battery problem',
    'Performance issue',
  ]);
  const [skills, setSkills] = useState(
    'Display replacement, battery diagnostics, charging port micro-soldering'
  );

  // Step 5: Availability
  const [workingDays, setWorkingDays] = useState<string[]>([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]);
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('19:30');
  const [breakTime, setBreakTime] = useState('13:30 - 14:15');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const formattedPhone = `+91${mobileDigits.replace(/\D/g, '')}`;

  const handleSendOtp = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError('Please enter your full name before requesting OTP.');
      return;
    }
    if (!/^\d{10}$/.test(mobileDigits)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest<{ demoNotice: string }>('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: formattedPhone }),
      });
      setOtpSent(true);
      setDemoHint(res.demoNotice);
    } catch (err: any) {
      setError(err.message || 'Could not send OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Enter the 6-digit OTP code.');
      return;
    }
    setSubmitting(true);
    try {
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
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          requestedRole: 'technician',
        }),
      });
      applyOtpLoginBundle(res.sessionToken, {
        profile: res.profile,
        addresses: res.addresses,
        technicianProfile: res.technicianProfile,
        savedTechnicianIds: res.savedTechnicianIds,
      });
      setPhoneVerified(true);
      if (res.technicianProfile) {
        onNavigate('technician-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const bundle = await signInWithGoogle();
      setPhoneVerified(true);
      if (bundle.profile?.fullName && !fullName) {
        setFullName(bundle.profile.fullName);
      }
      if (bundle.technicianProfile) {
        onNavigate('technician-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 360);
      setProfileImage(compressed);
    } catch (err: any) {
      setError(err.message || 'Failed to process profile photograph.');
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser. Enter coordinates or pincode manually.');
      return;
    }
    setGpsDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsDetecting(false);
      },
      () => {
        setGpsDetecting(false);
        setError('Could not read GPS coordinates. We will estimate coordinates from your city and pincode.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const validateCurrentStep = (): boolean => {
    setError(null);
    if (step === 1) {
      if (!fullName.trim()) {
        setError('Full name is required.');
        return false;
      }
      if (!phoneVerified && !isAuthenticated) {
        setError('Please verify your mobile number via OTP (or Google Sign-In) before continuing.');
        return false;
      }
    }
    if (step === 2) {
      if (!fullAddress.trim() || !serviceArea.trim() || !city.trim() || !stateName.trim()) {
        setError('Please complete your address, locality, city, and state.');
        return false;
      }
      if (!/^\d{6}$/.test(pincode.trim())) {
        setError('Please enter a valid 6-digit Indian pincode.');
        return false;
      }
    }
    if (step === 3) {
      if (hasShop && (!shopName.trim() || !shopAddress.trim())) {
        setError('Please enter your physical shop name and shop address.');
        return false;
      }
      if (!hasShop && !independentCoverageAreas.trim() && !serviceArea.trim()) {
        setError('Please specify the localities where you provide repairs.');
        return false;
      }
    }
    if (step === 4) {
      if (!professionalDescription.trim() || !skills.trim()) {
        setError('Please provide a short professional description and your repair skills.');
        return false;
      }
    }
    if (step === 5) {
      if (workingDays.length === 0) {
        setError('Please select at least one working day.');
        return false;
      }
    }
    return true;
  };

  const handleFinalSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const combinedBrands = [
        ...selectedBrands,
        ...customBrands
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean),
      ].join(', ');

      const effectiveServiceArea =
        !hasShop && independentCoverageAreas.trim()
          ? `${serviceArea.trim()} (${independentCoverageAreas.trim()})`
          : serviceArea.trim();

      const res = await apiRequest<{ message: string }>('/api/technician/onboard', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: /^\d{10}$/.test(mobileDigits) ? formattedPhone : undefined,
          email: email.trim() || undefined,
          gender: gender || undefined,
          profileImage: profileImage || undefined,
          fullAddress: fullAddress.trim(),
          serviceArea: effectiveServiceArea,
          city: city.trim(),
          state: stateName.trim(),
          pincode: pincode.trim(),
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          serviceRadiusKm,
          hasShop,
          shopName: hasShop ? shopName.trim() : undefined,
          shopAddress: hasShop ? shopAddress.trim() : undefined,
          shopLocation: hasShop ? shopLocation.trim() || serviceArea.trim() : undefined,
          shopContact: hasShop ? shopContact.trim() : undefined,
          serviceMode: hasShop ? 'both' : independentMode,
          experienceYears,
          professionalDescription: professionalDescription.trim(),
          deviceSpecialization,
          skills: skills.trim(),
          supportedBrands: combinedBrands || 'Samsung, Apple, Dell, HP',
          mobileProblems,
          laptopProblems,
          workingDays,
          startTime,
          endTime,
          breakTime: breakTime.trim() || undefined,
          isAvailable,
        }),
      });

      await refreshAccount();
      setSubmittedMessage(
        res.message ||
          'Your technician profile has been submitted successfully. Your account is awaiting administrator approval.'
      );
    } catch (err: any) {
      setError(err.message || 'Could not submit technician application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedMessage) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-5">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Application Submitted</h1>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {submittedMessage}
          </p>
          <p className="text-xs text-slate-500">
            Initial verification status: <strong className="text-amber-700">Pending</strong>. Once an administrator approves your profile, customers in your service radius will be able to discover and book you.
          </p>
          <div className="pt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('technician-dashboard')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
            >
              Open Technician Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepTitles = [
    '01. Personal Info',
    '02. Location & Radius',
    '03. Shop Details',
    '04. Repair Skills',
    '05. Working Hours',
    '06. Review & Submit',
  ];

  const brandChoices = Array.from(
    new Set([
      ...(deviceSpecialization !== 'laptop' ? POPULAR_MOBILE_BRANDS : []),
      ...(deviceSpecialization !== 'mobile' ? POPULAR_LAPTOP_BRANDS : []),
    ])
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('customer-auth', 'technician-login')}
          className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
        >
          Already registered? Technician Login
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
        <div className="pb-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">
            Join Fixora as a Repair Technician
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Complete the 6-step onboarding profile to receive nearby mobile and laptop repair requests.
          </p>

          {/* Stepper Bar */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-6 gap-2">
            {stepTitles.map((label, index) => {
              const stepNum = index + 1;
              const active = stepNum === step;
              const done = stepNum < step;
              return (
                <div
                  key={label}
                  className={`px-2.5 py-2 rounded-lg text-xs font-semibold border ${
                    active
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : done
                      ? 'border-slate-300 bg-slate-50 text-slate-800'
                      : 'border-slate-200 text-slate-400'
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mt-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        {/* STEP 1: Personal Information */}
        {step === 1 && (
          <div className="py-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender (Optional)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="workshop@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profile Photograph (Optional)
                </label>
                <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  <span>{profileImage ? 'Photo Attached (Change)' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Mobile OTP or Google Auth Box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-800">
                  Mobile Number & OTP Verification *
                </div>
                {(phoneVerified || isAuthenticated) && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Identity Verified</span>
                  </span>
                )}
              </div>

              {!phoneVerified && !isAuthenticated ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex flex-1 gap-2">
                      <span className="px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mobileDigits}
                        onChange={(e) =>
                          setMobileDigits(e.target.value.replace(/\D/g, ''))
                        }
                        placeholder="10-digit mobile number"
                        className="flex-1 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSendOtp}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{otpSent ? 'Resend OTP' : 'Send OTP'}</span>
                    </button>
                  </div>

                  {demoHint && (
                    <p className="text-xs text-emerald-800 font-medium">{demoHint}</p>
                  )}

                  {otpSent && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit OTP (123456)"
                        className="flex-1 px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleVerifyOtp}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
                      >
                        Verify OTP
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Or verify identity using Google Sign-In:
                    </span>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleGoogleAuth}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      Verify with Google
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Contact Mobile Number (+91)
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobileDigits}
                      onChange={(e) => setMobileDigits(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Address & Location */}
        {step === 2 && (
          <div className="py-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Complete Base Address * (Kept private — never displayed publicly)
              </label>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="Building, Street, Landmark"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Area / Locality *
                </label>
                <input
                  type="text"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g. Koramangala"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  list="tech-cities"
                  value={city}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCity(val);
                    const matched = INDIAN_CITY_COORDINATES.find(
                      (c) => c.city.toLowerCase() === val.toLowerCase()
                    );
                    if (matched) {
                      setStateName(matched.state);
                      setLatitude(String(matched.latitude));
                      setLongitude(String(matched.longitude));
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <datalist id="tech-cities">
                  {INDIAN_CITY_COORDINATES.map((c) => (
                    <option key={c.city} value={c.city} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pincode (6 digits) *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handleDetectGps}
                disabled={gpsDetecting}
                className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LocateFixed className="w-4 h-4" />
                <span>
                  {gpsDetecting ? 'Detecting GPS...' : 'Use Current GPS Location'}
                </span>
              </button>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  Service Radius (km):
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={serviceRadiusKm}
                  onChange={(e) => setServiceRadiusKm(Number(e.target.value) || 10)}
                  className="w-20 px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Shop Information */}
        {step === 3 && (
          <div className="py-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">
                Do you have a physical repair shop?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHasShop(true)}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    hasShop
                      ? 'border-emerald-600 bg-emerald-50/60'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900">
                    Yes, I have a shop
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Customers can visit my shop or request local pickup/doorstep repair
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setHasShop(false)}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    !hasShop
                      ? 'border-emerald-600 bg-emerald-50/60'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900">
                    No, I work independently
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    I travel to customer locations or provide home-visit repair services
                  </div>
                </button>
              </div>
            </div>

            {hasShop ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shop Name *
                    </label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Metro Mobile & Laptop Care"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shop Locality / Landmark
                    </label>
                    <input
                      type="text"
                      value={shopLocation}
                      onChange={(e) => setShopLocation(e.target.value)}
                      placeholder="e.g. Near Metro Pillar 42"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Complete Shop Address *
                  </label>
                  <input
                    type="text"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    placeholder="Shop No., Commercial Complex, Main Road"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shop Contact Details (Optional — shared only on accepted bookings)
                  </label>
                  <input
                    type="text"
                    value={shopContact}
                    onChange={(e) => setShopContact(e.target.value)}
                    placeholder="Landline or desk number"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Service Mode
                  </label>
                  <select
                    value={independentMode}
                    onChange={(e) =>
                      setIndependentMode(e.target.value as 'home_service' | 'both')
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="home_service">
                      Home-Service / Doorstep Repair at Customer Location
                    </option>
                    <option value="both">
                      Doorstep Repair & Scheduled Customer Drop-off
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Neighbourhoods / Areas Where Repairs Are Provided *
                  </label>
                  <input
                    type="text"
                    value={independentCoverageAreas}
                    onChange={(e) => setIndependentCoverageAreas(e.target.value)}
                    placeholder="e.g. Indiranagar, Domlur, HSR Layout, Koramangala"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Professional Information */}
        {step === 4 && (
          <div className="py-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Work Experience (Years) *
                </label>
                <input
                  type="number"
                  min={0}
                  max={45}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Repair Category *
                </label>
                <select
                  value={deviceSpecialization}
                  onChange={(e) =>
                    setDeviceSpecialization(
                      e.target.value as 'mobile' | 'laptop' | 'both'
                    )
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  <option value="both">Both Mobile & Laptop Repair</option>
                  <option value="mobile">Mobile Phone Repair Only</option>
                  <option value="laptop">Laptop / Desktop Repair Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Professional Description *
              </label>
              <textarea
                rows={3}
                value={professionalDescription}
                onChange={(e) => setProfessionalDescription(e.target.value)}
                placeholder="Describe your background, diagnostic approach, and turnaround times..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Skills & Specializations *
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. OLED screen swap, motherboard chip-level diagnostics, SSD upgrades"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Supported Brands
              </label>
              <div className="flex flex-wrap gap-2">
                {brandChoices.map((brand) => {
                  const active = selectedBrands.includes(brand);
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() =>
                        toggleItem(selectedBrands, brand, setSelectedBrands)
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        active
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={customBrands}
                onChange={(e) => setCustomBrands(e.target.value)}
                placeholder="Additional brands (comma-separated, optional)"
                className="mt-2 w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            {(deviceSpecialization === 'mobile' ||
              deviceSpecialization === 'both') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Mobile Repair Problems Handled
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MOBILE_REPAIR_PROBLEMS.map((prob) => (
                    <label
                      key={prob}
                      className="flex items-center gap-2 text-xs text-slate-700 p-2 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={mobileProblems.includes(prob)}
                        onChange={() =>
                          toggleItem(mobileProblems, prob, setMobileProblems)
                        }
                        className="accent-emerald-600"
                      />
                      <span>{prob}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(deviceSpecialization === 'laptop' ||
              deviceSpecialization === 'both') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Laptop Repair Problems Handled
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LAPTOP_REPAIR_PROBLEMS.map((prob) => (
                    <label
                      key={prob}
                      className="flex items-center gap-2 text-xs text-slate-700 p-2 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={laptopProblems.includes(prob)}
                        onChange={() =>
                          toggleItem(laptopProblems, prob, setLaptopProblems)
                        }
                        className="accent-emerald-600"
                      />
                      <span>{prob}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Availability */}
        {step === 5 && (
          <div className="py-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Working Days *
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const selected = workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleItem(workingDays, day, setWorkingDays)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Break Time (Optional)
                </label>
                <input
                  type="text"
                  value={breakTime}
                  onChange={(e) => setBreakTime(e.target.value)}
                  placeholder="e.g. 13:30 - 14:15"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Currently Accepting Bookings
                </div>
                <div className="text-xs text-slate-600">
                  You can toggle this anytime from your Technician Dashboard
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailable((prev) => !prev)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  isAvailable
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isAvailable ? 'Yes, Accepting' : 'No, Paused'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Review & Submit */}
        {step === 6 && (
          <div className="py-6 space-y-4 text-sm">
            <h2 className="text-base font-bold text-slate-900">
              Review Your Technician Registration Details
            </h2>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="pt-1">
                <span className="font-semibold text-slate-800">Personal: </span>
                <span>
                  {fullName} · {mobileDigits ? formattedPhone : 'Google Verified'}{' '}
                  {email ? `· ${email}` : ''}
                </span>
              </div>
              <div className="pt-3">
                <span className="font-semibold text-slate-800">Location & Radius: </span>
                <span>
                  {serviceArea}, {city}, {stateName} ({pincode}) · Up to{' '}
                  {serviceRadiusKm} km
                </span>
              </div>
              <div className="pt-3">
                <span className="font-semibold text-slate-800">Shop / Mode: </span>
                <span>
                  {hasShop
                    ? `Shop: ${shopName} (${shopAddress})`
                    : `Independent (${independentMode}) · Areas: ${independentCoverageAreas || serviceArea}`}
                </span>
              </div>
              <div className="pt-3">
                <span className="font-semibold text-slate-800">Experience & Skills: </span>
                <span>
                  {experienceYears} yrs · {deviceSpecialization.toUpperCase()} · {skills}
                </span>
              </div>
              <div className="pt-3">
                <span className="font-semibold text-slate-800">Brands: </span>
                <span>{selectedBrands.join(', ')}</span>
              </div>
              <div className="pt-3">
                <span className="font-semibold text-slate-800">Working Schedule: </span>
                <span>
                  {workingDays.join(', ')} ({startTime} – {endTime}) · Accepting:{' '}
                  {isAvailable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Upon submission, your verification status will be set to <strong>Pending</strong> until reviewed by an authorized platform administrator.
            </p>
          </div>
        )}

        {/* Step Navigation Footer */}
        <div className="pt-5 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button
              type="button"
              onClick={() => {
                if (validateCurrentStep()) setStep((s) => s + 1);
              }}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
            >
              Next Step
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Submitting Application...' : 'Submit Technician Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
