import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { calculateHaversineKm } from './geo';
import type { PublicTechnician, ServiceCategory } from '../types/marketplace';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseClientConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl.startsWith('http');

export const supabase: SupabaseClient | null = isSupabaseClientConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Uploads an image file to Supabase Storage bucket `repair-media` when Supabase is configured,
 * returning the public URL, or returns null so the caller falls back to compressed Data URL persistence.
 */
export async function uploadImageToSupabaseStorage(
  file: File,
  folder: 'profiles' | 'bookings'
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from('repair-media')
      .upload(filePath, file, { upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from('repair-media').getPublicUrl(filePath);
    return data.publicUrl || null;
  } catch {
    return null;
  }
}

export async function fetchCategoriesFromSupabase(): Promise<ServiceCategory[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('is_active', true);
  if (error || !data) return null;
  return data.map((row: any) => ({
    id: row.id,
    deviceType: row.device_type,
    categoryName: row.category_name,
    description: row.description,
    isActive: row.is_active,
  }));
}

export async function fetchApprovedTechniciansFromSupabase(params: {
  lat?: number;
  lng?: number;
  deviceType?: string;
  search?: string;
  availableOnly?: boolean;
  withinRadiusOnly?: boolean;
  sortBy?: 'nearest' | 'experience';
}): Promise<PublicTechnician[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('technician_profiles')
    .select(
      `
      id,
      experience_years,
      professional_description,
      skills,
      device_specialization,
      has_shop,
      shop_name,
      shop_location,
      service_mode,
      service_area,
      city,
      state,
      pincode,
      latitude,
      longitude,
      service_radius_km,
      profile_image,
      break_time,
      verification_status,
      is_available,
      is_demo,
      profiles!inner(full_name, is_demo),
      technician_services(id, technician_id, device_type, repair_category, supported_brands),
      technician_availability(id, technician_id, day_of_week, start_time, end_time, is_available)
    `
    )
    .eq('verification_status', 'approved')
    .eq('is_active', true);

  if (error || !data) return null;

  const hasCoords =
    typeof params.lat === 'number' &&
    !Number.isNaN(params.lat) &&
    typeof params.lng === 'number' &&
    !Number.isNaN(params.lng);

  let mapped: PublicTechnician[] = data.map((row: any) => {
    const profileObj = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const services = (row.technician_services || []).map((s: any) => ({
      id: s.id,
      technicianId: s.technician_id,
      deviceType: s.device_type,
      repairCategory: s.repair_category,
      supportedBrands: s.supported_brands,
    }));
    const availability = (row.technician_availability || []).map((a: any) => ({
      id: a.id,
      technicianId: a.technician_id,
      dayOfWeek: a.day_of_week,
      startTime: a.start_time,
      endTime: a.end_time,
      isAvailable: a.is_available,
    }));

    const distanceKm = hasCoords
      ? calculateHaversineKm(params.lat!, params.lng!, row.latitude, row.longitude)
      : null;

    const workingDays = availability.filter((d: any) => d.isAvailable);
    const workingHoursSummary =
      workingDays.length > 0
        ? `${workingDays[0].startTime} – ${workingDays[0].endTime} (${workingDays.length} days/wk)`
        : 'By appointment';

    const brandsSet = new Set<string>();
    const catsSet = new Set<string>();
    for (const s of services) {
      s.supportedBrands
        .split(',')
        .map((b: string) => b.trim())
        .filter(Boolean)
        .forEach((b: string) => brandsSet.add(b));
      s.repairCategory
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean)
        .forEach((c: string) => catsSet.add(c));
    }

    return {
      id: row.id,
      fullName: profileObj?.full_name || 'Technician',
      isDemo: Boolean(row.is_demo || profileObj?.is_demo),
      experienceYears: row.experience_years,
      professionalDescription: row.professional_description,
      skills: row.skills,
      deviceSpecialization: row.device_specialization,
      hasShop: row.has_shop,
      shopName: row.shop_name,
      shopLocation: row.shop_location,
      serviceMode: row.service_mode,
      serviceArea: row.service_area,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      serviceRadiusKm: row.service_radius_km,
      profileImage: row.profile_image,
      breakTime: row.break_time,
      verificationStatus: row.verification_status,
      isAvailable: row.is_available,
      distanceKm,
      withinServiceRadius:
        distanceKm !== null ? distanceKm <= row.service_radius_km : true,
      workingHoursSummary,
      supportedBrands: Array.from(brandsSet),
      repairCategories: Array.from(catsSet),
      services,
      availability,
    };
  });

  if (params.availableOnly) {
    mapped = mapped.filter((t) => t.isAvailable);
  }
  if (params.deviceType && params.deviceType !== 'all') {
    const dev = params.deviceType.toLowerCase();
    mapped = mapped.filter((t) =>
      dev.includes('mobile')
        ? t.deviceSpecialization === 'mobile' || t.deviceSpecialization === 'both'
        : t.deviceSpecialization === 'laptop' || t.deviceSpecialization === 'both'
    );
  }
  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    mapped = mapped.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.serviceArea.toLowerCase().includes(q) ||
        t.skills.toLowerCase().includes(q) ||
        t.supportedBrands.some((b) => b.toLowerCase().includes(q))
    );
  }
  if (params.withinRadiusOnly && hasCoords) {
    mapped = mapped.filter((t) => t.withinServiceRadius);
  }
  if (params.sortBy === 'experience') {
    mapped.sort((a, b) => b.experienceYears - a.experienceYears);
  } else if (hasCoords) {
    mapped.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  }

  return mapped;
}
