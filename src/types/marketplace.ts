export type UserRole = 'customer' | 'technician' | 'admin';

export type BookingStatus =
  | 'Pending'
  | 'Accepted'
  | 'Rejected'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export interface UserProfile {
  id: string;
  firebaseUid?: string | null;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  role: UserRole;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  fullAddress?: string | null;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface TechnicianServiceItem {
  id: string;
  technicianId: string;
  deviceType: string;
  repairCategory: string;
  supportedBrands: string;
}

export interface TechnicianAvailabilityItem {
  id: string;
  technicianId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface OwnTechnicianProfile {
  id: string;
  userId: string;
  experienceYears: number;
  professionalDescription: string;
  skills: string;
  deviceSpecialization: 'mobile' | 'laptop' | 'both' | string;
  hasShop: boolean;
  shopName?: string | null;
  shopAddress?: string | null;
  shopLocation?: string | null;
  shopContact?: string | null;
  serviceMode: string;
  fullAddress?: string | null;
  serviceArea: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  profileImage?: string | null;
  breakTime?: string | null;
  verificationStatus: 'pending' | 'approved' | 'rejected' | string;
  isAvailable: boolean;
  isActive: boolean;
  isDemo: boolean;
  services: TechnicianServiceItem[];
  availability: TechnicianAvailabilityItem[];
}

export interface PublicTechnician {
  id: string;
  fullName: string;
  isDemo: boolean;
  experienceYears: number;
  professionalDescription: string;
  skills: string;
  deviceSpecialization: string;
  hasShop: boolean;
  shopName?: string | null;
  shopLocation?: string | null;
  serviceMode: string;
  serviceArea: string;
  city: string;
  state: string;
  pincode: string;
  serviceRadiusKm: number;
  profileImage?: string | null;
  breakTime?: string | null;
  verificationStatus: string;
  isAvailable: boolean;
  distanceKm: number | null;
  withinServiceRadius: boolean;
  workingHoursSummary: string;
  supportedBrands: string[];
  repairCategories: string[];
  services: TechnicianServiceItem[];
  availability: TechnicianAvailabilityItem[];
  completedRepairsCount?: number;
  reviews?: Array<{
    id: string;
    rating: number;
    review: string | null;
    repairProblem: string;
    deviceBrand: string;
    date: string;
  }>;
}

export interface ServiceCategory {
  id: string;
  deviceType: string;
  categoryName: string;
  description: string;
  isActive: boolean;
}

export interface CustomerBooking {
  id: string;
  customerId: string;
  technicianId: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel?: string | null;
  repairProblem: string;
  problemDescription: string;
  problemPhoto?: string | null;
  customerAddress: string;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
  preferredDate: string;
  preferredTime: string;
  paymentMethod: string;
  bookingStatus: BookingStatus;
  customerRating?: number | null;
  customerReview?: string | null;
  createdAt: string;
  updatedAt: string;
  technician: {
    id: string;
    fullName: string;
    isDemo: boolean;
    shopName?: string | null;
    shopAddress?: string | null;
    shopContact?: string | null;
    serviceArea: string;
    city: string;
    serviceMode: string;
    profileImage?: string | null;
  };
}

export interface TechnicianBooking {
  id: string;
  customerId: string;
  technicianId: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel?: string | null;
  repairProblem: string;
  problemDescription: string;
  problemPhoto?: string | null;
  customerAddress: string;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
  preferredDate: string;
  preferredTime: string;
  paymentMethod: string;
  bookingStatus: BookingStatus;
  customerRating?: number | null;
  customerReview?: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone?: string | null;
}

export interface PublicReview {
  id: string;
  customerLabel: string;
  city: string;
  deviceType: string;
  deviceBrand: string;
  repairProblem: string;
  rating: number;
  review: string;
  completedAt: string;
}

export const MOBILE_REPAIR_PROBLEMS = [
  'Screen damage',
  'Battery replacement',
  'Charging port issue',
  'Speaker or microphone issue',
  'Software problem',
  'Phone not turning on',
  'Camera issue',
  'Other',
];

export const LAPTOP_REPAIR_PROBLEMS = [
  'Display problem',
  'Battery problem',
  'Keyboard problem',
  'Charging issue',
  'Hardware damage',
  'Software or operating system problem',
  'Performance issue',
  'Other',
];

export const POPULAR_MOBILE_BRANDS = [
  'Samsung',
  'Apple',
  'OnePlus',
  'Xiaomi',
  'Vivo',
  'Oppo',
  'Realme',
  'Motorola',
  'Google Pixel',
  'Nothing',
];

export const POPULAR_LAPTOP_BRANDS = [
  'Dell',
  'HP',
  'Lenovo',
  'Apple MacBook',
  'ASUS',
  'Acer',
  'MSI',
  'Microsoft Surface',
];

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
