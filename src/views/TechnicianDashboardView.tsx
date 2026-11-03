import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  LogOut,
  Settings,
  UserCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  DAYS_OF_WEEK,
  LAPTOP_REPAIR_PROBLEMS,
  MOBILE_REPAIR_PROBLEMS,
  type TechnicianBooking,
} from '../types/marketplace';
import {
  BookingStatusText,
  VerificationStatusText,
} from '../components/StatusIndicator';
import type { AppView } from '../components/Navbar';

interface TechnicianDashboardViewProps {
  onNavigate: (view: AppView) => void;
}

type TechTab =
  | 'overview'
  | 'new'
  | 'accepted'
  | 'ongoing'
  | 'completed'
  | 'rejected'
  | 'availability'
  | 'services';

export const TechnicianDashboardView: React.FC<TechnicianDashboardViewProps> = ({
  onNavigate,
}) => {
  const { profile, technicianProfile, refreshAccount, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<TechTab>('overview');
  const [bookings, setBookings] = useState<TechnicianBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Availability form state
  const [workingDays, setWorkingDays] = useState<string[]>(
    technicianProfile?.availability
      .filter((a) => a.isAvailable)
      .map((a) => a.dayOfWeek) || [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]
  );
  const [startTime, setStartTime] = useState<string>(
    technicianProfile?.availability[0]?.startTime || '09:30'
  );
  const [endTime, setEndTime] = useState<string>(
    technicianProfile?.availability[0]?.endTime || '19:30'
  );
  const [breakTime, setBreakTime] = useState<string>(
    technicianProfile?.breakTime || ''
  );
  const [isAvailable, setIsAvailable] = useState<boolean>(
    technicianProfile?.isAvailable ?? true
  );

  // Service & Profile management state
  const [experienceYears, setExperienceYears] = useState<number>(
    technicianProfile?.experienceYears ?? 3
  );
  const [professionalDescription, setProfessionalDescription] = useState<string>(
    technicianProfile?.professionalDescription || ''
  );
  const [skills, setSkills] = useState<string>(technicianProfile?.skills || '');
  const [serviceArea, setServiceArea] = useState<string>(
    technicianProfile?.serviceArea || ''
  );
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(
    technicianProfile?.serviceRadiusKm ?? 12
  );
  const [deviceSpecialization, setDeviceSpecialization] = useState<
    'mobile' | 'laptop' | 'both'
  >(
    (technicianProfile?.deviceSpecialization as 'mobile' | 'laptop' | 'both') ||
      'both'
  );
  const [supportedBrands, setSupportedBrands] = useState<string>(
    technicianProfile?.services[0]?.supportedBrands ||
      'Samsung, Apple, OnePlus, Dell, HP'
  );
  const [mobileProblems, setMobileProblems] = useState<string[]>(
    technicianProfile?.services
      .find((s) => s.deviceType.includes('Mobile'))
      ?.repairCategory.split(',')
      .map((c) => c.trim())
      .filter(Boolean) || ['Screen damage', 'Battery replacement']
  );
  const [laptopProblems, setLaptopProblems] = useState<string[]>(
    technicianProfile?.services
      .find((s) => s.deviceType.includes('Laptop'))
      ?.repairCategory.split(',')
      .map((c) => c.trim())
      .filter(Boolean) || ['Display problem', 'Battery problem']
  );
  const [savingSettings, setSavingSettings] = useState(false);

  const loadAssignedBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await apiRequest<{ bookings: TechnicianBooking[] }>(
        '/api/technician/bookings'
      );
      setBookings(res.bookings || []);
    } catch (err) {
      console.error('Error loading technician bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    loadAssignedBookings();
  }, [loadAssignedBookings]);

  if (!technicianProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">
            Complete Your Technician Onboarding
          </h1>
          <p className="text-sm text-slate-600">
            Your account does not have a technician workshop/service profile yet. Complete the 6-step form to start receiving customer bookings.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('technician-onboarding')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
          >
            Start Technician Registration
          </button>
        </div>
      </div>
    );
  }

  const handleStatusUpdate = async (
    bookingId: string,
    nextStatus: 'Accepted' | 'Rejected' | 'In Progress' | 'Completed'
  ) => {
    setUpdatingBookingId(bookingId);
    setNotice(null);
    try {
      await apiRequest(`/api/technician/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadAssignedBookings();
      setNotice({
        type: 'success',
        text: `Booking status updated to "${nextStatus}". Customer dashboard has been updated.`,
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.message || 'Could not update booking status.',
      });
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setNotice(null);
    try {
      await apiRequest('/api/technician/settings', {
        method: 'PUT',
        body: JSON.stringify({
          workingDays,
          startTime,
          endTime,
          breakTime,
          isAvailable,
        }),
      });
      await refreshAccount();
      setNotice({
        type: 'success',
        text: 'Working hours and live booking availability saved.',
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.message || 'Could not save availability.',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveServicesProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setNotice(null);
    try {
      await apiRequest('/api/technician/settings', {
        method: 'PUT',
        body: JSON.stringify({
          experienceYears,
          professionalDescription,
          skills,
          serviceArea,
          serviceRadiusKm,
          deviceSpecialization,
          supportedBrands,
          mobileProblems,
          laptopProblems,
        }),
      });
      await refreshAccount();
      setNotice({
        type: 'success',
        text: 'Technician profile and repair capabilities saved.',
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.message || 'Failed to save service capabilities.',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleItem = (
    list: string[],
    item: string,
    setter: (v: string[]) => void
  ) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const newRequests = bookings.filter((b) => b.bookingStatus === 'Pending');
  const acceptedBookings = bookings.filter((b) => b.bookingStatus === 'Accepted');
  const ongoingRepairs = bookings.filter((b) => b.bookingStatus === 'In Progress');
  const completedRepairs = bookings.filter((b) => b.bookingStatus === 'Completed');
  const rejectedCancelled = bookings.filter(
    (b) => b.bookingStatus === 'Rejected' || b.bookingStatus === 'Cancelled'
  );

  const renderBookingsSection = (title: string, items: TechnicianBooking[]) => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
            {items.length} booking{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={loadAssignedBookings}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
        >
          Refresh Requests
        </button>
      </div>

      {loadingBookings ? (
        <div className="p-8 text-center text-xs text-slate-500">
          Loading assigned bookings...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-600">
          No bookings in this status category right now.
        </div>
      ) : (
        items.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  Request #{b.id.slice(0, 8).toUpperCase()} · {b.paymentMethod}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {b.deviceType}: {b.deviceBrand} {b.deviceModel || ''} —{' '}
                  {b.repairProblem}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Customer: <strong className="text-slate-900">{b.customerName}</strong>
                  {b.customerPhone ? ` · Phone: ${b.customerPhone}` : ''}
                </p>
              </div>
              <BookingStatusText status={b.bookingStatus} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <div>
                <span className="font-semibold text-slate-900">Preferred Slot: </span>
                <span className="font-mono tabular-nums">
                  {b.preferredDate} · {b.preferredTime}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-900">
                  Authorized Service Address:{' '}
                </span>
                <span>{b.customerAddress}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-semibold text-slate-900">
                  Problem Description:{' '}
                </span>
                <span>{b.problemDescription}</span>
              </div>
            </div>

            {b.problemPhoto && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-700 mb-1">
                  Customer Uploaded Device Photo:
                </div>
                <img
                  src={b.problemPhoto}
                  alt="Customer reported device issue"
                  referrerPolicy="no-referrer"
                  className="w-40 h-28 object-cover rounded-lg border border-slate-200"
                />
              </div>
            )}

            {/* Technician Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
              {b.bookingStatus === 'Pending' && (
                <>
                  <button
                    type="button"
                    disabled={updatingBookingId === b.id}
                    onClick={() => handleStatusUpdate(b.id, 'Rejected')}
                    className="px-4 py-2 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    Reject Request
                  </button>
                  <button
                    type="button"
                    disabled={updatingBookingId === b.id}
                    onClick={() => handleStatusUpdate(b.id, 'Accepted')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
                  >
                    Accept Request
                  </button>
                </>
              )}

              {b.bookingStatus === 'Accepted' && (
                <button
                  type="button"
                  disabled={updatingBookingId === b.id}
                  onClick={() => handleStatusUpdate(b.id, 'In Progress')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
                >
                  Mark Repair as In Progress
                </button>
              )}

              {b.bookingStatus === 'In Progress' && (
                <button
                  type="button"
                  disabled={updatingBookingId === b.id}
                  onClick={() => handleStatusUpdate(b.id, 'Completed')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
                >
                  Mark Repair as Completed
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white rounded-xl border border-slate-200 p-4 space-y-1">
          <div className="px-3 py-3 border-b border-slate-100 mb-2">
            <div className="text-xs text-slate-500">Technician Portal</div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {profile?.fullName}
            </div>
            <div className="mt-1">
              <VerificationStatusText status={technicianProfile.verificationStatus} />
            </div>
          </div>

          {[
            { id: 'overview', label: 'Dashboard Overview', icon: Wrench },
            {
              id: 'new',
              label: `New Requests (${newRequests.length})`,
              icon: Clock,
            },
            {
              id: 'accepted',
              label: `Accepted (${acceptedBookings.length})`,
              icon: UserCheck,
            },
            {
              id: 'ongoing',
              label: `Ongoing Repairs (${ongoingRepairs.length})`,
              icon: Wrench,
            },
            {
              id: 'completed',
              label: `Completed (${completedRepairs.length})`,
              icon: CheckCircle2,
            },
            {
              id: 'rejected',
              label: `Rejected / Cancelled (${rejectedCancelled.length})`,
              icon: XCircle,
            },
            { id: 'availability', label: 'Availability & Hours', icon: Calendar },
            { id: 'services', label: 'Service & Profile', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as TechTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

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

        {/* Main Content */}
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

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Verification Banner */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {profile?.fullName}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <VerificationStatusText
                      status={technicianProfile.verificationStatus}
                    />
                    <span>·</span>
                    <span>
                      {technicianProfile.serviceArea}, {technicianProfile.city} (
                      {technicianProfile.serviceRadiusKm} km radius)
                    </span>
                  </div>
                  {technicianProfile.verificationStatus === 'pending' && (
                    <p className="mt-2 text-xs text-amber-800">
                      Your technician profile is awaiting administrator approval before appearing in public customer search.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('availability')}
                  className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {technicianProfile.isAvailable
                    ? 'Accepting Bookings (Edit)'
                    : 'Bookings Paused (Edit)'}
                </button>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-emerald-500 cursor-pointer"
                >
                  <div className="text-xs text-slate-500">New Requests</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {newRequests.length}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('accepted')}
                  className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-emerald-500 cursor-pointer"
                >
                  <div className="text-xs text-slate-500">Accepted</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {acceptedBookings.length}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ongoing')}
                  className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-emerald-500 cursor-pointer"
                >
                  <div className="text-xs text-slate-500">In Progress</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {ongoingRepairs.length}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-emerald-500 cursor-pointer"
                >
                  <div className="text-xs text-slate-500">Completed</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                    {completedRepairs.length}
                  </div>
                </button>
              </div>

              {renderBookingsSection('Recent Incoming Repair Requests', newRequests)}
            </div>
          )}

          {activeTab === 'new' &&
            renderBookingsSection('New Repair Requests (Pending)', newRequests)}
          {activeTab === 'accepted' &&
            renderBookingsSection('Accepted Bookings', acceptedBookings)}
          {activeTab === 'ongoing' &&
            renderBookingsSection('Ongoing Repairs (In Progress)', ongoingRepairs)}
          {activeTab === 'completed' &&
            renderBookingsSection('Completed Repairs', completedRepairs)}
          {activeTab === 'rejected' &&
            renderBookingsSection(
              'Rejected & Cancelled Requests',
              rejectedCancelled
            )}

          {activeTab === 'availability' && (
            <form
              onSubmit={handleSaveAvailability}
              className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5"
            >
              <h1 className="text-xl font-bold text-slate-900">
                Availability & Working Hours Management
              </h1>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Currently Accepting Customer Bookings
                  </div>
                  <div className="text-xs text-slate-600">
                    Pause this when your repair bench is at full capacity
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailable((p) => !p)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    isAvailable
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isAvailable ? 'Yes, Accepting' : 'No, Paused'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Working Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const selected = workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          toggleItem(workingDays, day, setWorkingDays)
                        }
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
                    Start Time
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
                    End Time
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
                    Break Time
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

              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
              >
                {savingSettings ? 'Saving...' : 'Save Availability Schedule'}
              </button>
            </form>
          )}

          {activeTab === 'services' && (
            <form
              onSubmit={handleSaveServicesProfile}
              className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5"
            >
              <h1 className="text-xl font-bold text-slate-900">
                Service & Professional Profile Management
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={experienceYears}
                    onChange={(e) =>
                      setExperienceYears(Number(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Radius (km)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={serviceRadiusKm}
                    onChange={(e) =>
                      setServiceRadiusKm(Number(e.target.value) || 10)
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Device Focus
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
                    <option value="both">Mobile & Laptop</option>
                    <option value="mobile">Mobile Only</option>
                    <option value="laptop">Laptop Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Area / Localities Covered
                </label>
                <input
                  type="text"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Professional Description
                </label>
                <textarea
                  rows={3}
                  value={professionalDescription}
                  onChange={(e) => setProfessionalDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Skills & Specializations
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supported Brands (comma-separated)
                </label>
                <input
                  type="text"
                  value={supportedBrands}
                  onChange={(e) => setSupportedBrands(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Mobile Problems Handled
                  </div>
                  <div className="space-y-1.5">
                    {MOBILE_REPAIR_PROBLEMS.map((p) => (
                      <label
                        key={p}
                        className="flex items-center gap-2 text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={mobileProblems.includes(p)}
                          onChange={() =>
                            toggleItem(mobileProblems, p, setMobileProblems)
                          }
                          className="accent-emerald-600"
                        />
                        <span>{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Laptop Problems Handled
                  </div>
                  <div className="space-y-1.5">
                    {LAPTOP_REPAIR_PROBLEMS.map((p) => (
                      <label
                        key={p}
                        className="flex items-center gap-2 text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={laptopProblems.includes(p)}
                          onChange={() =>
                            toggleItem(laptopProblems, p, setLaptopProblems)
                          }
                          className="accent-emerald-600"
                        />
                        <span>{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
              >
                {savingSettings ? 'Saving...' : 'Save Service Profile'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
