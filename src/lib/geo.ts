export interface CityCoordinates {
  city: string;
  state: string;
  pincodePrefix: string;
  latitude: number;
  longitude: number;
}

export const INDIAN_CITY_COORDINATES: CityCoordinates[] = [
  { city: 'Bengaluru', state: 'Karnataka', pincodePrefix: '560', latitude: 12.9716, longitude: 77.5946 },
  { city: 'Bangalore', state: 'Karnataka', pincodePrefix: '560', latitude: 12.9716, longitude: 77.5946 },
  { city: 'Mumbai', state: 'Maharashtra', pincodePrefix: '400', latitude: 19.076, longitude: 72.8777 },
  { city: 'Pune', state: 'Maharashtra', pincodePrefix: '411', latitude: 18.5204, longitude: 73.8567 },
  { city: 'New Delhi', state: 'Delhi', pincodePrefix: '110', latitude: 28.6139, longitude: 77.209 },
  { city: 'Delhi', state: 'Delhi', pincodePrefix: '110', latitude: 28.6139, longitude: 77.209 },
  { city: 'Noida', state: 'Uttar Pradesh', pincodePrefix: '201', latitude: 28.5355, longitude: 77.391 },
  { city: 'Gurugram', state: 'Haryana', pincodePrefix: '122', latitude: 28.4595, longitude: 77.0266 },
  { city: 'Hyderabad', state: 'Telangana', pincodePrefix: '500', latitude: 17.385, longitude: 78.4867 },
  { city: 'Chennai', state: 'Tamil Nadu', pincodePrefix: '600', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Kolkata', state: 'West Bengal', pincodePrefix: '700', latitude: 22.5726, longitude: 88.3639 },
  { city: 'Ahmedabad', state: 'Gujarat', pincodePrefix: '380', latitude: 23.0225, longitude: 72.5714 },
  { city: 'Jaipur', state: 'Rajasthan', pincodePrefix: '302', latitude: 26.9124, longitude: 75.7873 },
  { city: 'Lucknow', state: 'Uttar Pradesh', pincodePrefix: '226', latitude: 26.8467, longitude: 80.9462 },
  { city: 'Kochi', state: 'Kerala', pincodePrefix: '682', latitude: 9.9312, longitude: 76.2673 },
  { city: 'Indore', state: 'Madhya Pradesh', pincodePrefix: '452', latitude: 22.7196, longitude: 75.8577 },
  { city: 'Chandigarh', state: 'Chandigarh', pincodePrefix: '160', latitude: 30.7333, longitude: 76.7794 },
];

export const LOCALITY_OVERRIDES: Record<string, { lat: number; lng: number }> = {
  koramangala: { lat: 12.9352, lng: 77.6245 },
  indiranagar: { lat: 12.9784, lng: 77.6408 },
  'hsr layout': { lat: 12.9121, lng: 77.6446 },
  jayanagar: { lat: 12.925, lng: 77.5938 },
  whitefield: { lat: 12.9698, lng: 77.75 },
  andheri: { lat: 19.1197, lng: 72.8464 },
  bandra: { lat: 19.0596, lng: 72.8295 },
  powai: { lat: 19.1176, lng: 72.906 },
  kothrud: { lat: 18.5074, lng: 73.8077 },
  baner: { lat: 18.559, lng: 73.7868 },
  hinjewadi: { lat: 18.5913, lng: 73.7389 },
  adyar: { lat: 13.0012, lng: 80.2565 },
  velachery: { lat: 12.9815, lng: 80.218 },
  madhapur: { lat: 17.4486, lng: 78.3908 },
  gachibowli: { lat: 17.4401, lng: 78.3489 },
  'lajpat nagar': { lat: 28.5677, lng: 77.2433 },
  saket: { lat: 28.5246, lng: 77.2066 },
  navrangpura: { lat: 23.0365, lng: 72.5611 },
  'salt lake': { lat: 22.5867, lng: 88.4171 },
};

/**
 * Calculates great-circle distance in kilometres between two points using the Haversine formula.
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Resolves fallback coordinates from locality, city, or Indian pincode when browser GPS is unavailable.
 */
export function estimateCoordinatesFromAddress(
  locality: string,
  city: string,
  pincode: string
): { latitude: number; longitude: number } {
  const cleanLocality = locality.trim().toLowerCase();
  for (const [key, coords] of Object.entries(LOCALITY_OVERRIDES)) {
    if (cleanLocality.includes(key)) {
      return { latitude: coords.lat, longitude: coords.lng };
    }
  }

  const cleanCity = city.trim().toLowerCase();
  const matchedCity = INDIAN_CITY_COORDINATES.find(
    (item) => item.city.toLowerCase() === cleanCity || cleanCity.includes(item.city.toLowerCase())
  );
  if (matchedCity) {
    return { latitude: matchedCity.latitude, longitude: matchedCity.longitude };
  }

  const pinPrefix = pincode.trim().slice(0, 3);
  const matchedPin = INDIAN_CITY_COORDINATES.find((item) => item.pincodePrefix === pinPrefix);
  if (matchedPin) {
    return { latitude: matchedPin.latitude, longitude: matchedPin.longitude };
  }

  // Default central India fallback (Bengaluru center) if completely unrecognized
  return { latitude: 12.9716, longitude: 77.5946 };
}

export function normalizeIndianPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+91') && digits.length === 13) {
    return digits;
  }
  const justNumbers = rawPhone.replace(/\D/g, '');
  if (justNumbers.length === 10) {
    return `+91${justNumbers}`;
  }
  if (justNumbers.length === 12 && justNumbers.startsWith('91')) {
    return `+${justNumbers}`;
  }
  return digits.startsWith('+') ? digits : `+${justNumbers}`;
}
