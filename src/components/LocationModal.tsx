import React, { useState } from 'react';
import { LocateFixed, MapPin, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { estimateCoordinatesFromAddress, INDIAN_CITY_COORDINATES } from '../lib/geo';
import { useAuth } from '../context/AuthContext';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { profile, defaultAddress, refreshAccount, setGuestLocation } = useAuth();
  const [mode, setMode] = useState<'choice' | 'manual'>('choice');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locality, setLocality] = useState(defaultAddress?.locality || '');
  const [city, setCity] = useState(defaultAddress?.city || 'Bengaluru');
  const [stateName, setStateName] = useState(defaultAddress?.state || 'Karnataka');
  const [pincode, setPincode] = useState(defaultAddress?.pincode || '560034');
  const [fullAddress, setFullAddress] = useState(defaultAddress?.fullAddress || '');
  const [detectedCoords, setDetectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  if (!isOpen) return null;

  const findNearestKnownCity = (lat: number, lng: number) => {
    let best = INDIAN_CITY_COORDINATES[0];
    let bestDist = Infinity;
    for (const c of INDIAN_CITY_COORDINATES) {
      const d = Math.hypot(c.latitude - lat, c.longitude - lng);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best;
  };

  const handleUseCurrentLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError(
        'Browser geolocation is not supported on this device. Please enter your area and pincode manually below.'
      );
      setMode('manual');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const nearest = findNearestKnownCity(lat, lng);

        setDetectedCoords({ lat, lng });
        const resolvedLocality = locality.trim() || 'Current GPS Area';
        const resolvedCity = nearest.city;
        const resolvedState = nearest.state;
        const resolvedPin = `${nearest.pincodePrefix}001`;

        try {
          if (profile) {
            await apiRequest('/api/customer/addresses', {
              method: 'POST',
              body: JSON.stringify({
                fullAddress: fullAddress.trim() || `${resolvedLocality}, ${resolvedCity}`,
                locality: resolvedLocality,
                city: resolvedCity,
                state: resolvedState,
                pincode: /^\d{6}$/.test(pincode) ? pincode : resolvedPin,
                latitude: lat,
                longitude: lng,
              }),
            });
            await refreshAccount();
          } else {
            setGuestLocation({
              locality: resolvedLocality,
              city: resolvedCity,
              pincode: resolvedPin,
              latitude: lat,
              longitude: lng,
            });
          }
          setGpsLoading(false);
          onSaved?.();
          onClose();
        } catch (err: any) {
          setGpsLoading(false);
          setError(err.message || 'Could not store GPS coordinates. Please confirm manually.');
          setMode('manual');
        }
      },
      () => {
        setGpsLoading(false);
        setError(
          'Location permission was declined or unavailable. You can continue smoothly by entering your area, city, and pincode below.'
        );
        setMode('manual');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!locality.trim() || !city.trim() || !/^\d{6}$/.test(pincode.trim())) {
      setError('Please enter your area/locality, city, and a valid 6-digit Indian pincode.');
      return;
    }

    setSaving(true);
    try {
      const coords =
        detectedCoords ||
        (() => {
          const est = estimateCoordinatesFromAddress(locality, city, pincode);
          return { lat: est.latitude, lng: est.longitude };
        })();

      if (profile) {
        await apiRequest('/api/customer/addresses', {
          method: 'POST',
          body: JSON.stringify({
            fullAddress: fullAddress.trim() || `${locality.trim()}, ${city.trim()}`,
            locality: locality.trim(),
            city: city.trim(),
            state: stateName.trim(),
            pincode: pincode.trim(),
            latitude: coords.lat,
            longitude: coords.lng,
          }),
        });
        await refreshAccount();
      } else {
        setGuestLocation({
          locality: locality.trim(),
          city: city.trim(),
          pincode: pincode.trim(),
          latitude: coords.lat,
          longitude: coords.lng,
        });
      }

      setSaving(false);
      onSaved?.();
      onClose();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || 'Unable to save location.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-slate-200 shadow-lg">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Allow location access to discover repair technicians near you.
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your exact street address is kept private and never displayed publicly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close location setup"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            {error}
          </div>
        )}

        {mode === 'choice' ? (
          <div className="py-6 space-y-3">
            <button
              type="button"
              disabled={gpsLoading}
              onClick={handleUseCurrentLocation}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-600 bg-emerald-50/60 hover:bg-emerald-50 text-left transition-colors cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <LocateFixed className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {gpsLoading ? 'Detecting GPS coordinates...' : '1. Use my current location'}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Automatically match nearby mobile & laptop technicians by distance
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('manual')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-700 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    2. Enter my location manually
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Search by your locality/area, city, and 6-digit Indian pincode
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Area / Locality *
                </label>
                <input
                  type="text"
                  required
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Koramangala, Andheri West"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  list="indian-cities-list"
                  value={city}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCity(val);
                    const matched = INDIAN_CITY_COORDINATES.find(
                      (c) => c.city.toLowerCase() === val.toLowerCase()
                    );
                    if (matched) {
                      setStateName(matched.state);
                    }
                  }}
                  placeholder="e.g. Bengaluru, Mumbai, Pune"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
                <datalist id="indian-cities-list">
                  {INDIAN_CITY_COORDINATES.map((c) => (
                    <option key={c.city} value={c.city} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pincode (6 digits) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 560034"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Complete Doorstep Address (Optional — private for bookings only)
              </label>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="Flat / House No., Building, Landmark"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Back to GPS Option
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
