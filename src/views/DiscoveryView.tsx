import React, { useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { PublicTechnician } from '../types/marketplace';
import { TechnicianCard } from '../components/TechnicianCard';
import { TechnicianProfileModal } from '../components/TechnicianProfileModal';
import type { AppView } from '../components/Navbar';

interface DiscoveryViewProps {
  initialDeviceFilter?: string;
  initialProblemFilter?: string;
  onOpenLocationModal: () => void;
  onBookTechnician: (tech: PublicTechnician) => void;
  onNavigate: (view: AppView, sectionId?: string) => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  initialDeviceFilter = 'all',
  initialProblemFilter = '',
  onOpenLocationModal,
  onBookTechnician,
  onNavigate,
}) => {
  const { profile, defaultAddress, guestLocation, savedTechnicianIds, refreshAccount } =
    useAuth();

  const [deviceFilter, setDeviceFilter] = useState<string>(initialDeviceFilter);
  const [sortBy, setSortBy] = useState<'nearest' | 'experience'>('nearest');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [withinRadiusOnly, setWithinRadiusOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(initialProblemFilter);

  const [technicians, setTechnicians] = useState<PublicTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PublicTechnician | null>(null);

  const activeLat = defaultAddress?.latitude ?? guestLocation?.latitude;
  const activeLng = defaultAddress?.longitude ?? guestLocation?.longitude;
  const activeLocationLabel = defaultAddress
    ? `${defaultAddress.locality}, ${defaultAddress.city} (${defaultAddress.pincode})`
    : guestLocation
    ? `${guestLocation.locality}, ${guestLocation.city} (${guestLocation.pincode})`
    : null;

  useEffect(() => {
    setDeviceFilter(initialDeviceFilter || 'all');
  }, [initialDeviceFilter]);

  useEffect(() => {
    if (initialProblemFilter) {
      setSearchQuery(initialProblemFilter);
    }
  }, [initialProblemFilter]);

  useEffect(() => {
    let cancelled = false;
    async function loadTechnicians() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (activeLat !== undefined && activeLat !== null && activeLng !== undefined && activeLng !== null) {
          params.set('lat', String(activeLat));
          params.set('lng', String(activeLng));
        }
        if (deviceFilter !== 'all') {
          params.set('deviceType', deviceFilter);
        }
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }
        if (availableOnly) {
          params.set('availableOnly', 'true');
        }
        if (withinRadiusOnly) {
          params.set('withinRadiusOnly', 'true');
        }
        params.set('sortBy', sortBy);

        const res = await apiRequest<{ technicians: PublicTechnician[] }>(
          `/api/technicians?${params.toString()}`
        );
        if (!cancelled) {
          setTechnicians(res.technicians || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Could not load nearby technicians.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTechnicians();
    return () => {
      cancelled = true;
    };
  }, [activeLat, activeLng, deviceFilter, sortBy, availableOnly, withinRadiusOnly, searchQuery]);

  const handleToggleSave = async (techId: string) => {
    if (!profile) {
      onNavigate('customer-auth', 'login');
      return;
    }
    try {
      await apiRequest(`/api/customer/saved-technicians/${techId}`, { method: 'POST' });
      await refreshAccount();
    } catch (err) {
      console.error('Error toggling saved technician:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Location Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Find a Local Repair Technician</h1>
          <p className="mt-2 text-sm text-slate-600">
            Compare administrator-approved mobile and laptop technicians by proximity, supported brands, and service mode.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="text-xs text-slate-700">
            {activeLocationLabel ? (
              <span>
                Searching near <strong className="text-slate-900">{activeLocationLabel}</strong>
              </span>
            ) : (
              <span>Location not set — showing all cities</span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            {activeLocationLabel ? 'Change Location' : 'Set Location'}
          </button>
        </div>
      </div>

      {/* Interactive Filter & Sort Controls */}
      <div className="py-6 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, locality, brand (Apple, Dell), or skill..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Device Category Segmented Control */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setDeviceFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  deviceFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Devices
              </button>
              <button
                type="button"
                onClick={() => setDeviceFilter('Mobile Phone')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  deviceFilter === 'Mobile Phone'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mobile Repair
              </button>
              <button
                type="button"
                onClick={() => setDeviceFilter('Laptop / Desktop')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  deviceFilter === 'Laptop / Desktop'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Laptop Repair
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Sort & Availability Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setSortBy('nearest')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sortBy === 'nearest'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nearest First
              </button>
              <button
                type="button"
                onClick={() => setSortBy('experience')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sortBy === 'experience'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Most Experienced
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAvailableOnly((prev) => !prev)}
              className={`px-3 py-2 rounded-lg border font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                availableOnly
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Currently Available Only
            </button>

            {activeLocationLabel && (
              <button
                type="button"
                onClick={() => setWithinRadiusOnly((prev) => !prev)}
                className={`px-3 py-2 rounded-lg border font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  withinRadiusOnly
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Within Service Radius Only
              </button>
            )}
          </div>

          <div className="text-slate-600 font-mono tabular-nums">
            Showing {technicians.length} approved technician{technicians.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Results Area */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 rounded-xl border border-slate-200 bg-white p-5 animate-pulse"
            />
          ))}
        </div>
      ) : technicians.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center max-w-xl mx-auto my-8">
          <h2 className="text-lg font-bold text-slate-900">
            No matching approved technicians found
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Try clearing your search filter, disabling the strict service radius filter, or updating your city/pincode.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setDeviceFilter('all');
                setSearchQuery('');
                setAvailableOnly(false);
                setWithinRadiusOnly(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
            >
              Reset All Filters
            </button>
            <button
              type="button"
              onClick={onOpenLocationModal}
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Change Location
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((tech) => (
            <TechnicianCard
              key={tech.id}
              technician={tech}
              isSaved={savedTechnicianIds.includes(tech.id)}
              onToggleSave={handleToggleSave}
              onViewProfile={(t) => setSelectedProfile(t)}
              onBook={onBookTechnician}
            />
          ))}
        </div>
      )}

      <TechnicianProfileModal
        technician={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onBook={onBookTechnician}
      />
    </div>
  );
};
