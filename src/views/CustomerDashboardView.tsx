import React, { useCallback, useEffect, useState } from 'react';
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Laptop,
  LogOut,
  MapPin,
  Search,
  Smartphone,
  Star,
  Upload,
  User,
} from 'lucide-react';
import { apiRequest, compressImageFile } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  LAPTOP_REPAIR_PROBLEMS,
  MOBILE_REPAIR_PROBLEMS,
  POPULAR_LAPTOP_BRANDS,
  POPULAR_MOBILE_BRANDS,
  type CustomerBooking,
  type PublicTechnician,
} from '../types/marketplace';
import { BookingStatusText } from '../components/StatusIndicator';
import { TechnicianCard } from '../components/TechnicianCard';
import { TechnicianProfileModal } from '../components/TechnicianProfileModal';
import { ProblemIconBadge } from '../components/ProblemIconBadge';
import type { AppView } from '../components/Navbar';

interface CustomerDashboardViewProps {
  initialTab?:
    | 'overview'
    | 'book'
    | 'bookings'
    | 'saved'
    | 'profile'
    | 'support';
  preselectedDevice?: string;
  preselectedProblem?: string;
  preselectedTechnician?: PublicTechnician | null;
  onClearPreselectedTechnician?: () => void;
  onOpenLocationModal: () => void;
  onNavigate: (view: AppView) => void;
}

export const CustomerDashboardView: React.FC<CustomerDashboardViewProps> = ({
  initialTab = 'overview',
  preselectedDevice,
  preselectedProblem,
  preselectedTechnician,
  onClearPreselectedTechnician,
  onOpenLocationModal,
  onNavigate,
}) => {
  const {
    profile,
    defaultAddress,
    savedTechnicianIds,
    refreshAccount,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'book' | 'bookings' | 'saved' | 'profile' | 'support'
  >(initialTab);

  // Bookings & Saved Technicians state
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [allApprovedTechs, setAllApprovedTechs] = useState<PublicTechnician[]>([]);
  const [selectedProfileModal, setSelectedProfileModal] =
    useState<PublicTechnician | null>(null);

  // Notification banner
  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Repair Selection Wizard State (4 Steps)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [deviceType, setDeviceType] = useState<string>(
    preselectedDevice || 'Mobile Phone'
  );
  const [repairProblem, setRepairProblem] = useState<string>(
    preselectedProblem || 'Screen damage'
  );
  const [deviceBrand, setDeviceBrand] = useState<string>('');
  const [deviceModel, setDeviceModel] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [problemPhoto, setProblemPhoto] = useState<string>('');
  const [preferredDate, setPreferredDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [preferredTime, setPreferredTime] = useState<string>('11:00 AM - 01:00 PM');
  const [serviceAddressInput, setServiceAddressInput] = useState<string>(
    defaultAddress?.fullAddress ||
      (defaultAddress
        ? `${defaultAddress.locality}, ${defaultAddress.city} - ${defaultAddress.pincode}`
        : '')
  );
  const [matchedTechs, setMatchedTechs] = useState<PublicTechnician[]>([]);
  const [searchingTechs, setSearchingTechs] = useState(false);
  const [bookingSubmittingId, setBookingSubmittingId] = useState<string | null>(
    null
  );

  // Cancel confirmation & Review state
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');

  // Profile edit state
  const [editFullName, setEditFullName] = useState(profile?.fullName || '');
  const [editEmail, setEditEmail] = useState(profile?.email || '');
  const [editGender, setEditGender] = useState(profile?.gender || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (defaultAddress && !serviceAddressInput) {
      setServiceAddressInput(
        defaultAddress.fullAddress ||
          `${defaultAddress.locality}, ${defaultAddress.city} - ${defaultAddress.pincode}`
      );
    }
  }, [defaultAddress, serviceAddressInput]);

  useEffect(() => {
    if (preselectedTechnician) {
      setActiveTab('book');
      const dev =
        preselectedTechnician.deviceSpecialization === 'laptop'
          ? 'Laptop / Desktop'
          : 'Mobile Phone';
      setDeviceType(dev);
      setRepairProblem(
        dev === 'Mobile Phone' ? 'Screen damage' : 'Display problem'
      );
      setWizardStep(3);
    } else if (preselectedDevice) {
      setActiveTab('book');
      setDeviceType(preselectedDevice);
      if (preselectedProblem) {
        setRepairProblem(preselectedProblem);
        setWizardStep(3);
      } else {
        setWizardStep(2);
      }
    }
  }, [preselectedDevice, preselectedProblem, preselectedTechnician]);

  const loadCustomerData = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const latQuery =
        defaultAddress?.latitude && defaultAddress?.longitude
          ? `?lat=${defaultAddress.latitude}&lng=${defaultAddress.longitude}`
          : '';
      const [bookRes, techRes] = await Promise.all([
        apiRequest<{ bookings: CustomerBooking[] }>('/api/customer/bookings'),
        apiRequest<{ technicians: PublicTechnician[] }>(`/api/technicians${latQuery}`),
      ]);
      setBookings(bookRes.bookings || []);
      setAllApprovedTechs(techRes.technicians || []);
    } catch (err) {
      console.error('Failed to load customer dashboard data:', err);
    } finally {
      setLoadingBookings(false);
    }
  }, [defaultAddress?.latitude, defaultAddress?.longitude]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  const handleFindMatchingTechnicians = async () => {
    setNotice(null);
    if (!deviceBrand.trim() || !problemDescription.trim() || !serviceAddressInput.trim()) {
      setNotice({
        type: 'error',
        text: 'Please enter the device brand, problem description, and service address before finding technicians.',
      });
      return;
    }

    if (preselectedTechnician) {
      setMatchedTechs([preselectedTechnician]);
      setWizardStep(4);
      return;
    }

    setSearchingTechs(true);
    try {
      const params = new URLSearchParams();
      params.set('deviceType', deviceType);
      params.set('availableOnly', 'true');
      if (defaultAddress?.latitude && defaultAddress?.longitude) {
        params.set('lat', String(defaultAddress.latitude));
        params.set('lng', String(defaultAddress.longitude));
      }
      const res = await apiRequest<{ technicians: PublicTechnician[] }>(
        `/api/technicians?${params.toString()}`
      );
      setMatchedTechs(res.technicians || []);
      setWizardStep(4);
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.message || 'Could not search technicians.',
      });
    } finally {
      setSearchingTechs(false);
    }
  };

  const handleConfirmBookingWithTech = async (tech: PublicTechnician) => {
    setNotice(null);
    setBookingSubmittingId(tech.id);
    try {
      await apiRequest('/api/customer/bookings', {
        method: 'POST',
        body: JSON.stringify({
          technicianId: tech.id,
          deviceType,
          deviceBrand: deviceBrand.trim(),
          deviceModel: deviceModel.trim() || undefined,
          repairProblem,
          problemDescription: problemDescription.trim(),
          problemPhoto: problemPhoto || undefined,
          customerAddress: serviceAddressInput.trim(),
          customerLatitude: defaultAddress?.latitude ?? null,
          customerLongitude: defaultAddress?.longitude ?? null,
          preferredDate,
          preferredTime,
        }),
      });

      onClearPreselectedTechnician?.();
      setProblemDescription('');
      setProblemPhoto('');
      setDeviceModel('');
      setWizardStep(1);
      await loadCustomerData();
      setActiveTab('bookings');
      setNotice({
        type: 'success',
        text: `Repair request sent to ${tech.fullName}. Status is now Pending technician confirmation.`,
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.message || 'Failed to place repair booking.',
      });
    } finally {
      setBookingSubmittingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await apiRequest(`/api/customer/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
      });
      setConfirmCancelId(null);
      await loadCustomerData();
      setNotice({ type: 'success', text: 'Booking has been cancelled.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Could not cancel booking.' });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBookingId) return;
    try {
      await apiRequest(`/api/customer/bookings/${reviewBookingId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          rating: reviewRating,
          review: reviewText,
        }),
      });
      setReviewBookingId(null);
      setReviewText('');
      await loadCustomerData();
      setNotice({
        type: 'success',
        text: 'Thank you! Your verified repair review has been saved.',
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Could not submit review.' });
    }
  };

  const handleToggleSaveTech = async (techId: string) => {
    try {
      await apiRequest(`/api/customer/saved-technicians/${techId}`, {
        method: 'POST',
      });
      await refreshAccount();
    } catch (err) {
      console.error('Failed to toggle saved technician:', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setNotice(null);
    try {
      await apiRequest('/api/me/sync', {
        method: 'POST',
        body: JSON.stringify({
          fullName: editFullName.trim(),
          email: editEmail.trim() || undefined,
          gender: editGender || undefined,
          requestedRole: 'customer',
        }),
      });
      await refreshAccount();
      setNotice({ type: 'success', text: 'Account profile updated successfully.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProblemPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 480);
      setProblemPhoto(dataUrl);
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Invalid photo file.' });
    }
  };

  const savedTechObjects = allApprovedTechs.filter((t) =>
    savedTechnicianIds.includes(t.id)
  );

  const problemsList =
    deviceType === 'Mobile Phone' ? MOBILE_REPAIR_PROBLEMS : LAPTOP_REPAIR_PROBLEMS;
  const brandsSuggestions =
    deviceType === 'Mobile Phone' ? POPULAR_MOBILE_BRANDS : POPULAR_LAPTOP_BRANDS;

  const timelineSteps = ['Pending', 'Accepted', 'In Progress', 'Completed'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 bg-white rounded-xl border border-slate-200 p-4 space-y-1">
          <div className="px-3 py-3 border-b border-slate-100 mb-2">
            <div className="text-xs text-slate-500">Customer Account</div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {profile?.fullName || 'Customer'}
            </div>
            {profile?.phone && (
              <div className="text-xs font-mono text-slate-500 mt-0.5">
                {profile.phone}
              </div>
            )}
          </div>

          {[
            { id: 'overview', label: 'Dashboard Overview', icon: Smartphone },
            { id: 'book', label: 'Book a Repair', icon: Calendar },
            { id: 'bookings', label: 'Bookings & Tracking', icon: CheckCircle2 },
            { id: 'saved', label: 'Saved Technicians', icon: Bookmark },
            { id: 'profile', label: 'Profile & Location', icon: User },
            { id: 'support', label: 'Help & Support', icon: HelpCircle },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onNavigate('discover')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Search Technicians</span>
          </button>

          <div className="pt-2 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={async () => {
                await logout();
                onNavigate('landing');
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          {notice && (
            <div
              className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between gap-4 ${
                notice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <span>{notice.text}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="font-semibold underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Welcome back, {profile?.fullName?.split(' ')[0] || 'Customer'}
                  </h1>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    {defaultAddress ? (
                      <span>
                        Current Location:{' '}
                        <strong className="text-slate-900">
                          {defaultAddress.locality}, {defaultAddress.city} ({defaultAddress.pincode})
                        </strong>
                      </span>
                    ) : (
                      <span>Location not configured yet — add your locality for distance matching</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenLocationModal}
                  className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {defaultAddress ? 'Update Location' : 'Set My Location'}
                </button>
              </div>

              {/* Quick Device Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <button
                  type="button"
                  onClick={() => {
                    setDeviceType('Mobile Phone');
                    setRepairProblem('Screen damage');
                    setWizardStep(2);
                    setActiveTab('book');
                  }}
                  className="bg-white rounded-xl border border-slate-200 hover:border-emerald-600 p-6 text-left transition-colors cursor-pointer"
                >
                  <Smartphone className="w-6 h-6 text-emerald-600 mb-3" />
                  <h2 className="text-lg font-bold text-slate-900">Mobile Phone Repair</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Screen damage, battery replacement, charging port, camera, speaker, or dead phone diagnostics.
                  </p>
                  <div className="mt-4 text-xs font-semibold text-emerald-700">
                    Start Mobile Booking →
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeviceType('Laptop / Desktop');
                    setRepairProblem('Display problem');
                    setWizardStep(2);
                    setActiveTab('book');
                  }}
                  className="bg-white rounded-xl border border-slate-200 hover:border-emerald-600 p-6 text-left transition-colors cursor-pointer"
                >
                  <Laptop className="w-6 h-6 text-emerald-600 mb-3" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Laptop / Desktop Repair
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Display panel, battery, keyboard, charging circuit, OS troubleshooting, and SSD/RAM upgrades.
                  </p>
                  <div className="mt-4 text-xs font-semibold text-emerald-700">
                    Start Laptop Booking →
                  </div>
                </button>
              </div>

              {/* Recent Bookings Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900">Recent Bookings</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    View Full History ({bookings.length})
                  </button>
                </div>

                {loadingBookings ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Loading bookings...
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-sm text-slate-600">
                      You have not placed any repair bookings yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('book')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
                    >
                      Book Your First Repair
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {bookings.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {b.deviceBrand} {b.deviceModel || ''} · {b.repairProblem}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Technician: {b.technician.fullName} · Slot: {b.preferredDate} ({b.preferredTime})
                          </div>
                        </div>
                        <BookingStatusText status={b.bookingStatus} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 4-STEP BOOK A REPAIR FLOW */}
          {activeTab === 'book' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-slate-200">
                <h1 className="text-xl font-bold text-slate-900">Book a Local Repair</h1>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
                  {[
                    '01. Select Device',
                    '02. Select Problem',
                    '03. Device & Slot Info',
                    '04. Choose Technician',
                  ].map((lbl, idx) => {
                    const num = idx + 1;
                    return (
                      <div
                        key={lbl}
                        className={`p-2.5 rounded-lg border ${
                          wizardStep === num
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                            : wizardStep > num
                            ? 'border-slate-300 bg-slate-50 text-slate-800'
                            : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        {lbl}
                      </div>
                    );
                  })}
                </div>
              </div>

              {preselectedTechnician && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                  <span>
                    Booking directly with{' '}
                    <strong>{preselectedTechnician.fullName}</strong> ({preselectedTechnician.city})
                  </span>
                  <button
                    type="button"
                    onClick={() => onClearPreselectedTechnician?.()}
                    className="font-semibold underline cursor-pointer"
                  >
                    Compare All Technicians Instead
                  </button>
                </div>
              )}

              {/* Step 1: Select Device */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">
                    Step 1: Which device needs repair?
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['Mobile Phone', 'Laptop / Desktop'].map((dev) => (
                      <button
                        key={dev}
                        type="button"
                        onClick={() => {
                          setDeviceType(dev);
                          setRepairProblem(
                            dev === 'Mobile Phone' ? 'Screen damage' : 'Display problem'
                          );
                          setWizardStep(2);
                        }}
                        className={`p-6 rounded-xl border text-left transition-colors cursor-pointer ${
                          deviceType === dev
                            ? 'border-emerald-600 bg-emerald-50/50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {dev === 'Mobile Phone' ? (
                          <Smartphone className="w-6 h-6 text-emerald-600 mb-2" />
                        ) : (
                          <Laptop className="w-6 h-6 text-emerald-600 mb-2" />
                        )}
                        <div className="text-base font-bold text-slate-900">{dev}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          {dev === 'Mobile Phone'
                            ? 'Android & Apple smartphones'
                            : 'Laptops, MacBooks, and desktop systems'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Select Problem */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">
                    Step 2: Select the {deviceType.toLowerCase()} problem
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {problemsList.map((prob) => (
                      <button
                        key={prob}
                        type="button"
                        onClick={() => {
                          setRepairProblem(prob);
                          setWizardStep(3);
                        }}
                        className={`px-4 py-3.5 rounded-2xl border flex items-center gap-3.5 text-left text-sm font-semibold transition-all cursor-pointer ${
                          repairProblem === prob
                            ? 'border-[#16A34A] bg-emerald-50/40 text-[#071120] shadow-xs'
                            : 'border-slate-200/90 hover:border-[#16A34A] bg-white text-[#071120]'
                        }`}
                      >
                        <ProblemIconBadge problem={prob} />
                        <span className="leading-snug">{prob}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      ← Back to Device Selection
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Additional Information */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">
                    Step 3: Enter Device & Preferred Schedule Details
                  </h2>
                  <div className="text-xs text-slate-600">
                    Selected: <strong className="text-slate-900">{deviceType}</strong> ·{' '}
                    <strong className="text-emerald-700">{repairProblem}</strong>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Device Brand *
                      </label>
                      <input
                        type="text"
                        list="brand-suggestions"
                        value={deviceBrand}
                        onChange={(e) => setDeviceBrand(e.target.value)}
                        placeholder="e.g. Samsung, Apple, Dell"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <datalist id="brand-suggestions">
                        {brandsSuggestions.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Device Model (Optional)
                      </label>
                      <input
                        type="text"
                        value={deviceModel}
                        onChange={(e) => setDeviceModel(e.target.value)}
                        placeholder="e.g. Galaxy S23, Inspiron 15"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Problem Description *
                    </label>
                    <textarea
                      rows={3}
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      placeholder="Explain what happened (e.g. dropped phone, bottom half of screen flickering, or battery drains within 1 hour)..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Preferred Repair Date *
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Preferred Time Slot *
                      </label>
                      <select
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="09:30 AM - 11:30 AM">09:30 AM - 11:30 AM</option>
                        <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                        <option value="02:00 PM - 04:30 PM">02:00 PM - 04:30 PM</option>
                        <option value="04:30 PM - 07:30 PM">04:30 PM - 07:30 PM</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Device / Problem Photo (Optional)
                      </label>
                      <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer">
                        <Upload className="w-4 h-4 text-emerald-700" />
                        <span>{problemPhoto ? 'Photo Attached' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProblemPhotoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Service / Doorstep Address * (Shared only with your selected technician)
                    </label>
                    <input
                      type="text"
                      value={serviceAddressInput}
                      onChange={(e) => setServiceAddressInput(e.target.value)}
                      placeholder="Flat/House No., Street, Locality, City, Pincode"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      ← Back to Problem
                    </button>
                    <button
                      type="button"
                      disabled={searchingTechs}
                      onClick={handleFindMatchingTechnicians}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
                    >
                      {searchingTechs
                        ? 'Finding Specialists...'
                        : preselectedTechnician
                        ? 'Review & Confirm Technician →'
                        : 'Step 4: Find Matching Technicians →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Choose Technician & Book */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Step 4: Select Technician to Place Booking
                      </h2>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Payment Mode: <strong>Pay Technician Directly</strong> (Offline upon repair inspection)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      ← Edit Details
                    </button>
                  </div>

                  {matchedTechs.length === 0 ? (
                    <div className="p-8 text-center border border-slate-200 rounded-xl">
                      <p className="text-sm text-slate-600">
                        No currently available approved technicians matched that exact category.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {matchedTechs.map((tech) => (
                        <div key={tech.id} className="relative">
                          <TechnicianCard
                            technician={tech}
                            isSaved={savedTechnicianIds.includes(tech.id)}
                            onToggleSave={handleToggleSaveTech}
                            onViewProfile={(t) => setSelectedProfileModal(t)}
                            onBook={(t) => handleConfirmBookingWithTech(t)}
                          />
                          {bookingSubmittingId === tech.id && (
                            <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center text-xs font-semibold text-emerald-800">
                              Confirming Booking...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BOOKING HISTORY & LIVE TRACKING */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Booking History & Repair Tracking
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Track real-time status updates as your technician accepts, diagnoses, and completes your repair.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadCustomerData}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Refresh Status
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
                  <p className="text-sm text-slate-600">No bookings recorded yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('book')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg cursor-pointer"
                  >
                    Book a Repair
                  </button>
                </div>
              ) : (
                bookings.map((b) => {
                  const activeStepIdx = timelineSteps.indexOf(b.bookingStatus);
                  const isTerminalNegative =
                    b.bookingStatus === 'Rejected' || b.bookingStatus === 'Cancelled';

                  return (
                    <div
                      key={b.id}
                      className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <div className="text-xs font-mono text-slate-500">
                            Booking ID: {b.id.slice(0, 8).toUpperCase()} · {b.paymentMethod}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-1">
                            {b.deviceType}: {b.deviceBrand} {b.deviceModel || ''} —{' '}
                            {b.repairProblem}
                          </h3>
                          <p className="text-xs text-slate-600 mt-1">
                            Assigned Technician:{' '}
                            <strong className="text-slate-900">
                              {b.technician.fullName}
                            </strong>{' '}
                            ({b.technician.serviceArea}, {b.technician.city})
                          </p>
                        </div>
                        <BookingStatusText status={b.bookingStatus} />
                      </div>

                      {/* Progress Timeline */}
                      {!isTerminalNegative && (
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          {timelineSteps.map((stepLabel, idx) => {
                            const reached = activeStepIdx >= idx;
                            return (
                              <div key={stepLabel} className="space-y-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    reached ? 'bg-emerald-600' : 'bg-slate-200'
                                  }`}
                                />
                                <div
                                  className={`text-xs font-medium ${
                                    reached ? 'text-emerald-800 font-semibold' : 'text-slate-400'
                                  }`}
                                >
                                  {stepLabel}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-2">
                        <div>
                          <span className="font-semibold text-slate-800">
                            Preferred Slot:{' '}
                          </span>
                          <span className="font-mono tabular-nums">
                            {b.preferredDate} · {b.preferredTime}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800">
                            Service Address:{' '}
                          </span>
                          <span>{b.customerAddress}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="font-semibold text-slate-800">
                            Issue Notes:{' '}
                          </span>
                          <span>{b.problemDescription}</span>
                        </div>
                        {b.technician.shopAddress && (
                          <div className="sm:col-span-2 text-emerald-800">
                            <span className="font-semibold">Workshop Address: </span>
                            {b.technician.shopAddress}{' '}
                            {b.technician.shopContact
                              ? `· Desk: ${b.technician.shopContact}`
                              : ''}
                          </div>
                        )}
                      </div>

                      {/* Cancel Confirmation or Review Actions */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          Updated: {new Date(b.updatedAt).toLocaleDateString('en-IN')}
                        </div>

                        <div className="flex items-center gap-2">
                          {(b.bookingStatus === 'Pending' ||
                            b.bookingStatus === 'Accepted') &&
                            (confirmCancelId === b.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-red-700 font-semibold">
                                  Confirm cancel?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCancelBooking(b.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg cursor-pointer"
                                >
                                  Yes, Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelId(null)}
                                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                                >
                                  Keep
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmCancelId(b.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 border border-red-200 rounded-lg cursor-pointer"
                              >
                                Cancel Booking
                              </button>
                            ))}

                          {b.bookingStatus === 'Completed' && !b.customerReview && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewBookingId(b.id);
                                setReviewRating(5);
                                setReviewText('');
                              }}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5" />
                              <span>Leave Repair Feedback</span>
                            </button>
                          )}

                          {b.customerReview && (
                            <span className="text-xs text-emerald-700 font-semibold">
                              Rated {b.customerRating}/5 ★
                            </span>
                          )}
                        </div>
                      </div>

                      {reviewBookingId === b.id && (
                        <form
                          onSubmit={handleSubmitReview}
                          className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                        >
                          <div className="flex items-center gap-3 text-xs">
                            <label className="font-semibold text-slate-800">
                              Rating (1–5):
                            </label>
                            <select
                              value={reviewRating}
                              onChange={(e) => setReviewRating(Number(e.target.value))}
                              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-mono"
                            >
                              {[5, 4, 3, 2, 1].map((r) => (
                                <option key={r} value={r}>
                                  {r} Stars
                                </option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            rows={2}
                            required
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Share an honest summary of your completed repair..."
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setReviewBookingId(null)}
                              className="px-3 py-1.5 text-xs text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg cursor-pointer"
                            >
                              Submit Feedback
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: SAVED TECHNICIANS */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h1 className="text-xl font-bold text-slate-900">Saved Technicians</h1>
                <p className="text-xs text-slate-600 mt-1">
                  Quickly access trusted local technicians you have bookmarked.
                </p>
              </div>

              {savedTechObjects.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
                  <p className="text-sm text-slate-600">
                    You have not bookmarked any technicians yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('discover')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg cursor-pointer"
                  >
                    Browse Nearby Technicians
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {savedTechObjects.map((tech) => (
                    <TechnicianCard
                      key={tech.id}
                      technician={tech}
                      isSaved={true}
                      onToggleSave={handleToggleSaveTech}
                      onViewProfile={(t) => setSelectedProfileModal(t)}
                      onBook={(t) => {
                        setDeviceType(
                          t.deviceSpecialization === 'laptop'
                            ? 'Laptop / Desktop'
                            : 'Mobile Phone'
                        );
                        setMatchedTechs([t]);
                        setWizardStep(3);
                        setActiveTab('book');
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROFILE & LOCATION MANAGEMENT */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
              <h1 className="text-xl font-bold text-slate-900">
                Profile & Saved Location
              </h1>

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Default Search & Service Location
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {defaultAddress
                      ? `${defaultAddress.locality}, ${defaultAddress.city}, ${defaultAddress.state} - ${defaultAddress.pincode}`
                      : 'No location saved yet.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenLocationModal}
                  className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                >
                  Update Location
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: HELP & SUPPORT */}
          {activeTab === 'support' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5">
              <h1 className="text-xl font-bold text-slate-900">Help & Support</h1>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <div className="p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-900">
                    How do repair payments work on Fixora?
                  </h3>
                  <p className="mt-1 text-xs">
                    All bookings use direct offline settlement (“Pay Technician Directly”). Inspect your repaired smartphone or laptop thoroughly before paying via UPI or cash directly to the technician.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-900">
                    Is my home address visible to everyone?
                  </h3>
                  <p className="mt-1 text-xs">
                    Never. Your street address is strictly protected and shared only with the approved technician assigned to your booking.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-900">Need further assistance?</h3>
                  <p className="mt-1 text-xs">
                    Contact Fixora Support at <strong>support@fixora.in</strong> (Monday – Saturday, 09:00 AM to 08:00 PM IST).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TechnicianProfileModal
        technician={selectedProfileModal}
        onClose={() => setSelectedProfileModal(null)}
        onBook={(t) => {
          setSelectedProfileModal(null);
          setDeviceType(
            t.deviceSpecialization === 'laptop' ? 'Laptop / Desktop' : 'Mobile Phone'
          );
          setMatchedTechs([t]);
          setWizardStep(3);
          setActiveTab('book');
        }}
      />
    </div>
  );
};
