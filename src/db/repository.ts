import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from './index.ts';
import {
  bookings,
  customerAddresses,
  profiles,
  savedTechnicians,
  serviceCategories,
  technicianAvailability,
  technicianProfiles,
  technicianServices,
} from './schema.ts';
import { calculateHaversineKm, estimateCoordinatesFromAddress } from '../lib/geo.ts';
import type { VerifiedIdentity } from '../middleware/auth.ts';

function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const configured = (process.env.ADMIN_EMAILS || 'ytamboli943@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(clean);
}

export async function getActiveServiceCategories() {
  try {
    return await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.isActive, true));
  } catch (error) {
    console.error('Failed to fetch service categories:', error);
    throw new Error('Unable to load repair categories at the moment.', { cause: error });
  }
}

export async function getPublicCompletedReviews() {
  try {
    const rows = await db
      .select({
        id: bookings.id,
        deviceType: bookings.deviceType,
        deviceBrand: bookings.deviceBrand,
        repairProblem: bookings.repairProblem,
        rating: bookings.customerRating,
        review: bookings.customerReview,
        updatedAt: bookings.updatedAt,
        customerName: profiles.fullName,
        isDemoCustomer: profiles.isDemo,
        technicianCity: technicianProfiles.city,
        technicianName: technicianProfiles.shopName,
      })
      .from(bookings)
      .innerJoin(profiles, eq(bookings.customerId, profiles.id))
      .innerJoin(technicianProfiles, eq(bookings.technicianId, technicianProfiles.id))
      .where(
        and(
          eq(bookings.bookingStatus, 'Completed'),
          isNotNull(bookings.customerReview)
        )
      )
      .orderBy(desc(bookings.updatedAt))
      .limit(6);

    return rows.map((r) => {
      const parts = r.customerName.trim().split(/\s+/);
      const safeCustomerLabel =
        parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
      return {
        id: r.id,
        customerLabel: r.isDemoCustomer ? `${safeCustomerLabel} (Demo)` : safeCustomerLabel,
        city: r.technicianCity,
        deviceType: r.deviceType,
        deviceBrand: r.deviceBrand,
        repairProblem: r.repairProblem,
        rating: r.rating || 5,
        review: r.review || '',
        completedAt: r.updatedAt,
      };
    });
  } catch (error) {
    console.error('Failed to fetch public reviews:', error);
    throw new Error('Unable to load customer feedback.', { cause: error });
  }
}

export interface DiscoverTechniciansFilter {
  lat?: number;
  lng?: number;
  deviceType?: string;
  problem?: string;
  search?: string;
  availableOnly?: boolean;
  withinRadiusOnly?: boolean;
  sortBy?: 'nearest' | 'experience';
}

export async function discoverApprovedTechnicians(filters: DiscoverTechniciansFilter) {
  try {
    const techRows = await db
      .select({
        tech: technicianProfiles,
        userFullName: profiles.fullName,
        userIsDemo: profiles.isDemo,
      })
      .from(technicianProfiles)
      .innerJoin(profiles, eq(technicianProfiles.userId, profiles.id))
      .where(
        and(
          eq(technicianProfiles.verificationStatus, 'approved'),
          eq(technicianProfiles.isActive, true)
        )
      );

    if (techRows.length === 0) {
      return [];
    }

    const techIds = techRows.map((r) => r.tech.id);
    const [allServices, allAvailability] = await Promise.all([
      db
        .select()
        .from(technicianServices)
        .where(inArray(technicianServices.technicianId, techIds)),
      db
        .select()
        .from(technicianAvailability)
        .where(inArray(technicianAvailability.technicianId, techIds)),
    ]);

    const servicesByTech = new Map<string, typeof allServices>();
    for (const s of allServices) {
      const arr = servicesByTech.get(s.technicianId) || [];
      arr.push(s);
      servicesByTech.set(s.technicianId, arr);
    }

    const availByTech = new Map<string, typeof allAvailability>();
    for (const a of allAvailability) {
      const arr = availByTech.get(a.technicianId) || [];
      arr.push(a);
      availByTech.set(a.technicianId, arr);
    }

    const hasCustomerCoords =
      typeof filters.lat === 'number' &&
      !Number.isNaN(filters.lat) &&
      typeof filters.lng === 'number' &&
      !Number.isNaN(filters.lng);

    let results = techRows.map(({ tech, userFullName, userIsDemo }) => {
      const services = servicesByTech.get(tech.id) || [];
      const availability = availByTech.get(tech.id) || [];
      const distanceKm = hasCustomerCoords
        ? calculateHaversineKm(filters.lat!, filters.lng!, tech.latitude, tech.longitude)
        : null;
      const withinServiceRadius =
        distanceKm !== null ? distanceKm <= tech.serviceRadiusKm : true;

      const workingDays = availability.filter((d) => d.isAvailable);
      const workingHoursSummary =
        workingDays.length > 0
          ? `${workingDays[0].startTime} – ${workingDays[0].endTime} (${workingDays.length} days/wk)`
          : 'By appointment';

      const allBrandsSet = new Set<string>();
      const allCategoriesSet = new Set<string>();
      for (const s of services) {
        s.supportedBrands
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean)
          .forEach((b) => allBrandsSet.add(b));
        s.repairCategory
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
          .forEach((c) => allCategoriesSet.add(c));
      }

      // Return ONLY safe public fields (never expose private fullAddress, phone, or email)
      return {
        id: tech.id,
        fullName: userFullName,
        isDemo: tech.isDemo || userIsDemo,
        experienceYears: tech.experienceYears,
        professionalDescription: tech.professionalDescription,
        skills: tech.skills,
        deviceSpecialization: tech.deviceSpecialization,
        hasShop: tech.hasShop,
        shopName: tech.shopName,
        shopLocation: tech.shopLocation,
        serviceMode: tech.serviceMode,
        serviceArea: tech.serviceArea,
        city: tech.city,
        state: tech.state,
        pincode: tech.pincode,
        serviceRadiusKm: tech.serviceRadiusKm,
        profileImage: tech.profileImage,
        breakTime: tech.breakTime,
        verificationStatus: tech.verificationStatus,
        isAvailable: tech.isAvailable,
        distanceKm,
        withinServiceRadius,
        workingHoursSummary,
        supportedBrands: Array.from(allBrandsSet),
        repairCategories: Array.from(allCategoriesSet),
        services,
        availability,
      };
    });

    if (filters.availableOnly) {
      results = results.filter((t) => t.isAvailable);
    }

    if (filters.deviceType) {
      const target = filters.deviceType.toLowerCase();
      results = results.filter((t) => {
        if (target.includes('mobile')) {
          return (
            t.deviceSpecialization === 'mobile' ||
            t.deviceSpecialization === 'both' ||
            t.services.some((s) => s.deviceType.toLowerCase().includes('mobile'))
          );
        }
        if (target.includes('laptop')) {
          return (
            t.deviceSpecialization === 'laptop' ||
            t.deviceSpecialization === 'both' ||
            t.services.some((s) => s.deviceType.toLowerCase().includes('laptop'))
          );
        }
        return true;
      });
    }

    if (filters.problem && filters.problem.toLowerCase() !== 'other') {
      const prob = filters.problem.toLowerCase();
      results = results.filter(
        (t) =>
          t.repairCategories.some((c) => c.toLowerCase().includes(prob)) ||
          t.skills.toLowerCase().includes(prob) ||
          t.professionalDescription.toLowerCase().includes(prob)
      );
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter(
        (t) =>
          t.fullName.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          t.serviceArea.toLowerCase().includes(q) ||
          t.skills.toLowerCase().includes(q) ||
          t.supportedBrands.some((b) => b.toLowerCase().includes(q)) ||
          (t.shopName && t.shopName.toLowerCase().includes(q))
      );
    }

    if (filters.withinRadiusOnly && hasCustomerCoords) {
      results = results.filter((t) => t.withinServiceRadius);
    }

    if (filters.sortBy === 'experience') {
      results.sort((a, b) => b.experienceYears - a.experienceYears);
    } else if (hasCustomerCoords) {
      results.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
    } else {
      results.sort((a, b) => b.experienceYears - a.experienceYears);
    }

    return results;
  } catch (error) {
    console.error('Failed to discover technicians:', error);
    throw new Error('Unable to search nearby technicians right now.', { cause: error });
  }
}

export async function getPublicTechnicianById(techId: string, lat?: number, lng?: number) {
  try {
    const all = await discoverApprovedTechnicians({ lat, lng });
    const match = all.find((t) => t.id === techId);
    if (!match) return null;

    const completedBookings = await db
      .select({ id: bookings.id, rating: bookings.customerRating, review: bookings.customerReview, updatedAt: bookings.updatedAt, repairProblem: bookings.repairProblem, deviceBrand: bookings.deviceBrand })
      .from(bookings)
      .where(and(eq(bookings.technicianId, techId), eq(bookings.bookingStatus, 'Completed')));

    return {
      ...match,
      completedRepairsCount: completedBookings.length,
      reviews: completedBookings
        .filter((b) => b.review)
        .map((b) => ({
          id: b.id,
          rating: b.rating || 5,
          review: b.review,
          repairProblem: b.repairProblem,
          deviceBrand: b.deviceBrand,
          date: b.updatedAt,
        })),
    };
  } catch (error) {
    console.error('Failed to get public technician profile:', error);
    throw new Error('Unable to load technician profile.', { cause: error });
  }
}

export async function findProfileByIdentity(identity: VerifiedIdentity) {
  try {
    if (identity.authMethod === 'phone_otp' && identity.phone) {
      const byPhone = await db
        .select()
        .from(profiles)
        .where(eq(profiles.phone, identity.phone))
        .limit(1);
      if (byPhone[0]) return byPhone[0];
    }

    const byUid = await db
      .select()
      .from(profiles)
      .where(eq(profiles.firebaseUid, identity.uid))
      .limit(1);

    if (byUid[0]) {
      // Elevate to admin automatically if authorized owner email
      if (isAuthorizedAdminEmail(identity.email) && byUid[0].role !== 'admin') {
        const updated = await db
          .update(profiles)
          .set({ role: 'admin', updatedAt: new Date() })
          .where(eq(profiles.id, byUid[0].id))
          .returning();
        return updated[0];
      }
      return byUid[0];
    }

    if (identity.phone) {
      const byPhone = await db
        .select()
        .from(profiles)
        .where(eq(profiles.phone, identity.phone))
        .limit(1);
      if (byPhone[0]) return byPhone[0];
    }

    return null;
  } catch (error) {
    console.error('Failed to lookup profile by identity:', error);
    throw new Error('Unable to load account profile.', { cause: error });
  }
}

export async function upsertUserProfile(
  identity: VerifiedIdentity,
  input: {
    fullName: string;
    phone?: string;
    email?: string;
    gender?: string;
    requestedRole?: 'customer' | 'technician';
  }
) {
  try {
    const existing = await findProfileByIdentity(identity);
    const shouldBeAdmin = isAuthorizedAdminEmail(identity.email || input.email);
    // Security rule: never allow user registration form to set 'admin'
    const safeRequestedRole =
      input.requestedRole === 'technician' ? 'technician' : 'customer';

    if (existing) {
      const nextRole =
        existing.role === 'admin' || shouldBeAdmin
          ? 'admin'
          : input.requestedRole === 'technician'
          ? 'technician'
          : existing.role;

      const updated = await db
        .update(profiles)
        .set({
          fullName: input.fullName.trim() || existing.fullName,
          phone: input.phone || existing.phone,
          email: input.email || identity.email || existing.email,
          gender: input.gender ?? existing.gender,
          firebaseUid:
            identity.authMethod === 'firebase' ? identity.uid : existing.firebaseUid,
          role: nextRole,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, existing.id))
        .returning();
      return updated[0];
    }

    const effectiveRole = shouldBeAdmin ? 'admin' : safeRequestedRole;
    const effectivePhone = input.phone || identity.phone || null;

    if (identity.authMethod === 'firebase') {
      const inserted = await db
        .insert(profiles)
        .values({
          firebaseUid: identity.uid,
          fullName: input.fullName.trim(),
          phone: effectivePhone,
          email: input.email || identity.email || null,
          gender: input.gender || null,
          role: effectiveRole,
          isDemo: false,
        })
        .onConflictDoUpdate({
          target: profiles.firebaseUid,
          set: {
            fullName: input.fullName.trim(),
            email: input.email || identity.email || null,
            updatedAt: new Date(),
          },
        })
        .returning();
      return inserted[0];
    }

    const insertedPhone = await db
      .insert(profiles)
      .values({
        firebaseUid: identity.uid,
        fullName: input.fullName.trim(),
        phone: effectivePhone,
        email: input.email || null,
        gender: input.gender || null,
        role: effectiveRole,
        isDemo: false,
      })
      .onConflictDoUpdate({
        target: profiles.phone,
        set: {
          fullName: input.fullName.trim(),
          email: input.email || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return insertedPhone[0];
  } catch (error) {
    console.error('Failed to upsert user profile:', error);
    throw new Error('Could not save user profile. Phone number may already be registered to another account.', {
      cause: error,
    });
  }
}

export async function getFullAccountBundle(profileId: string) {
  try {
    const [profileRows, addresses, techRows, savedRows] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1),
      db
        .select()
        .from(customerAddresses)
        .where(eq(customerAddresses.customerId, profileId))
        .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.createdAt)),
      db
        .select()
        .from(technicianProfiles)
        .where(eq(technicianProfiles.userId, profileId))
        .limit(1),
      db
        .select()
        .from(savedTechnicians)
        .where(eq(savedTechnicians.customerId, profileId)),
    ]);

    const profile = profileRows[0] || null;
    const tech = techRows[0] || null;

    let techDetails = null;
    if (tech) {
      const [services, availability] = await Promise.all([
        db
          .select()
          .from(technicianServices)
          .where(eq(technicianServices.technicianId, tech.id)),
        db
          .select()
          .from(technicianAvailability)
          .where(eq(technicianAvailability.technicianId, tech.id)),
      ]);
      techDetails = {
        ...tech,
        services,
        availability,
      };
    }

    return {
      profile,
      addresses,
      technicianProfile: techDetails,
      savedTechnicianIds: savedRows.map((s) => s.technicianId),
    };
  } catch (error) {
    console.error('Failed to fetch account bundle:', error);
    throw new Error('Unable to load account details.', { cause: error });
  }
}

export async function saveCustomerLocation(
  customerId: string,
  input: {
    fullAddress?: string;
    locality: string;
    city: string;
    state?: string;
    pincode: string;
    latitude?: number | null;
    longitude?: number | null;
  }
) {
  try {
    let lat = input.latitude ?? null;
    let lng = input.longitude ?? null;

    if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) {
      const estimated = estimateCoordinatesFromAddress(
        input.locality,
        input.city,
        input.pincode
      );
      lat = estimated.latitude;
      lng = estimated.longitude;
    }

    await db
      .update(customerAddresses)
      .set({ isDefault: false })
      .where(eq(customerAddresses.customerId, customerId));

    const inserted = await db
      .insert(customerAddresses)
      .values({
        customerId,
        fullAddress: input.fullAddress?.trim() || `${input.locality.trim()}, ${input.city.trim()}`,
        locality: input.locality.trim(),
        city: input.city.trim(),
        state: input.state?.trim() || '',
        pincode: input.pincode.trim(),
        latitude: lat,
        longitude: lng,
        isDefault: true,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to save customer location:', error);
    throw new Error('Unable to save your location.', { cause: error });
  }
}

export async function toggleSavedTechnician(customerId: string, technicianId: string) {
  try {
    const existing = await db
      .select()
      .from(savedTechnicians)
      .where(
        and(
          eq(savedTechnicians.customerId, customerId),
          eq(savedTechnicians.technicianId, technicianId)
        )
      )
      .limit(1);

    if (existing[0]) {
      await db
        .delete(savedTechnicians)
        .where(eq(savedTechnicians.id, existing[0].id));
      return { saved: false };
    }

    await db.insert(savedTechnicians).values({ customerId, technicianId });
    return { saved: true };
  } catch (error) {
    console.error('Failed to toggle saved technician:', error);
    throw new Error('Unable to update saved technicians.', { cause: error });
  }
}

export async function submitTechnicianOnboarding(
  profileId: string,
  currentRole: string,
  payload: {
    fullName?: string;
    email?: string;
    gender?: string;
    profileImage?: string;
    fullAddress: string;
    serviceArea: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number | null;
    longitude?: number | null;
    serviceRadiusKm: number;
    hasShop: boolean;
    shopName?: string;
    shopAddress?: string;
    shopLocation?: string;
    shopContact?: string;
    serviceMode: string;
    experienceYears: number;
    professionalDescription: string;
    deviceSpecialization: 'mobile' | 'laptop' | 'both';
    skills: string;
    supportedBrands: string;
    mobileProblems: string[];
    laptopProblems: string[];
    workingDays: string[];
    startTime: string;
    endTime: string;
    breakTime?: string;
    isAvailable: boolean;
  }
) {
  try {
    if (currentRole !== 'admin') {
      await db
        .update(profiles)
        .set({
          role: 'technician',
          fullName: payload.fullName?.trim() || undefined,
          email: payload.email?.trim() || undefined,
          gender: payload.gender || undefined,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, profileId));
    }

    let lat = payload.latitude ?? null;
    let lng = payload.longitude ?? null;
    if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) {
      const est = estimateCoordinatesFromAddress(
        payload.serviceArea,
        payload.city,
        payload.pincode
      );
      lat = est.latitude;
      lng = est.longitude;
    }

    // Security rule: Initial verification status MUST be 'pending'; technician can never self-approve
    const upsertedTech = await db
      .insert(technicianProfiles)
      .values({
        userId: profileId,
        experienceYears: Math.max(0, Number(payload.experienceYears) || 0),
        professionalDescription: payload.professionalDescription.trim(),
        skills: payload.skills.trim(),
        deviceSpecialization: payload.deviceSpecialization,
        hasShop: Boolean(payload.hasShop),
        shopName: payload.hasShop ? payload.shopName?.trim() || null : null,
        shopAddress: payload.hasShop ? payload.shopAddress?.trim() || null : null,
        shopLocation: payload.hasShop ? payload.shopLocation?.trim() || null : null,
        shopContact: payload.hasShop ? payload.shopContact?.trim() || null : null,
        serviceMode: payload.serviceMode || (payload.hasShop ? 'both' : 'home_service'),
        fullAddress: payload.fullAddress.trim(),
        serviceArea: payload.serviceArea.trim(),
        city: payload.city.trim(),
        state: payload.state.trim(),
        pincode: payload.pincode.trim(),
        latitude: lat,
        longitude: lng,
        serviceRadiusKm: Math.max(1, Math.min(100, Number(payload.serviceRadiusKm) || 10)),
        profileImage: payload.profileImage || null,
        breakTime: payload.breakTime?.trim() || null,
        verificationStatus: 'pending',
        isAvailable: Boolean(payload.isAvailable),
        isActive: true,
        isDemo: false,
      })
      .onConflictDoUpdate({
        target: technicianProfiles.userId,
        set: {
          experienceYears: Math.max(0, Number(payload.experienceYears) || 0),
          professionalDescription: payload.professionalDescription.trim(),
          skills: payload.skills.trim(),
          deviceSpecialization: payload.deviceSpecialization,
          hasShop: Boolean(payload.hasShop),
          shopName: payload.hasShop ? payload.shopName?.trim() || null : null,
          shopAddress: payload.hasShop ? payload.shopAddress?.trim() || null : null,
          shopLocation: payload.hasShop ? payload.shopLocation?.trim() || null : null,
          shopContact: payload.hasShop ? payload.shopContact?.trim() || null : null,
          serviceMode: payload.serviceMode || (payload.hasShop ? 'both' : 'home_service'),
          fullAddress: payload.fullAddress.trim(),
          serviceArea: payload.serviceArea.trim(),
          city: payload.city.trim(),
          state: payload.state.trim(),
          pincode: payload.pincode.trim(),
          latitude: lat,
          longitude: lng,
          serviceRadiusKm: Math.max(1, Math.min(100, Number(payload.serviceRadiusKm) || 10)),
          profileImage: payload.profileImage || null,
          breakTime: payload.breakTime?.trim() || null,
          isAvailable: Boolean(payload.isAvailable),
          updatedAt: new Date(),
        },
      })
      .returning();

    const tech = upsertedTech[0];

    await db
      .delete(technicianServices)
      .where(eq(technicianServices.technicianId, tech.id));

    const serviceRowsToInsert: Array<{
      technicianId: string;
      deviceType: string;
      repairCategory: string;
      supportedBrands: string;
    }> = [];

    if (
      payload.deviceSpecialization === 'mobile' ||
      payload.deviceSpecialization === 'both'
    ) {
      serviceRowsToInsert.push({
        technicianId: tech.id,
        deviceType: 'Mobile Phone',
        repairCategory:
          payload.mobileProblems.length > 0
            ? payload.mobileProblems.join(', ')
            : 'Screen damage, Battery replacement, Charging port issue',
        supportedBrands: payload.supportedBrands.trim(),
      });
    }

    if (
      payload.deviceSpecialization === 'laptop' ||
      payload.deviceSpecialization === 'both'
    ) {
      serviceRowsToInsert.push({
        technicianId: tech.id,
        deviceType: 'Laptop / Desktop',
        repairCategory:
          payload.laptopProblems.length > 0
            ? payload.laptopProblems.join(', ')
            : 'Display problem, Battery problem, Performance issue',
        supportedBrands: payload.supportedBrands.trim(),
      });
    }

    if (serviceRowsToInsert.length > 0) {
      await db.insert(technicianServices).values(serviceRowsToInsert);
    }

    await db
      .delete(technicianAvailability)
      .where(eq(technicianAvailability.technicianId, tech.id));

    const allDays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    await db.insert(technicianAvailability).values(
      allDays.map((day) => ({
        technicianId: tech.id,
        dayOfWeek: day,
        startTime: payload.startTime || '09:30',
        endTime: payload.endTime || '19:30',
        isAvailable: payload.workingDays.includes(day),
      }))
    );

    return tech;
  } catch (error) {
    console.error('Failed to submit technician onboarding:', error);
    throw new Error('Failed to submit technician registration.', { cause: error });
  }
}

export async function updateTechnicianDashboardSettings(
  profileId: string,
  input: {
    experienceYears?: number;
    professionalDescription?: string;
    skills?: string;
    serviceArea?: string;
    serviceRadiusKm?: number;
    hasShop?: boolean;
    shopName?: string;
    shopAddress?: string;
    serviceMode?: string;
    breakTime?: string;
    isAvailable?: boolean;
    workingDays?: string[];
    startTime?: string;
    endTime?: string;
    supportedBrands?: string;
    mobileProblems?: string[];
    laptopProblems?: string[];
    deviceSpecialization?: 'mobile' | 'laptop' | 'both';
  }
) {
  try {
    const existingRows = await db
      .select()
      .from(technicianProfiles)
      .where(eq(technicianProfiles.userId, profileId))
      .limit(1);

    const existing = existingRows[0];
    if (!existing) {
      throw new Error('Technician profile not found.');
    }

    // Notice verificationStatus and isActive are strictly omitted so technician can NEVER self-approve
    await db
      .update(technicianProfiles)
      .set({
        experienceYears:
          input.experienceYears !== undefined
            ? Number(input.experienceYears)
            : existing.experienceYears,
        professionalDescription:
          input.professionalDescription ?? existing.professionalDescription,
        skills: input.skills ?? existing.skills,
        serviceArea: input.serviceArea ?? existing.serviceArea,
        serviceRadiusKm:
          input.serviceRadiusKm !== undefined
            ? Number(input.serviceRadiusKm)
            : existing.serviceRadiusKm,
        hasShop: input.hasShop !== undefined ? input.hasShop : existing.hasShop,
        shopName: input.shopName !== undefined ? input.shopName : existing.shopName,
        shopAddress:
          input.shopAddress !== undefined ? input.shopAddress : existing.shopAddress,
        serviceMode: input.serviceMode ?? existing.serviceMode,
        breakTime: input.breakTime !== undefined ? input.breakTime : existing.breakTime,
        isAvailable:
          input.isAvailable !== undefined ? input.isAvailable : existing.isAvailable,
        deviceSpecialization:
          input.deviceSpecialization ?? existing.deviceSpecialization,
        updatedAt: new Date(),
      })
      .where(eq(technicianProfiles.id, existing.id));

    if (input.workingDays && input.startTime && input.endTime) {
      await db
        .delete(technicianAvailability)
        .where(eq(technicianAvailability.technicianId, existing.id));
      const allDays = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      await db.insert(technicianAvailability).values(
        allDays.map((day) => ({
          technicianId: existing.id,
          dayOfWeek: day,
          startTime: input.startTime!,
          endTime: input.endTime!,
          isAvailable: input.workingDays!.includes(day),
        }))
      );
    }

    if (input.supportedBrands !== undefined) {
      const spec = input.deviceSpecialization || existing.deviceSpecialization;
      await db
        .delete(technicianServices)
        .where(eq(technicianServices.technicianId, existing.id));
      const newServices: Array<{
        technicianId: string;
        deviceType: string;
        repairCategory: string;
        supportedBrands: string;
      }> = [];

      if (spec === 'mobile' || spec === 'both') {
        newServices.push({
          technicianId: existing.id,
          deviceType: 'Mobile Phone',
          repairCategory:
            input.mobileProblems && input.mobileProblems.length > 0
              ? input.mobileProblems.join(', ')
              : 'Screen damage, Battery replacement, Charging port issue',
          supportedBrands: input.supportedBrands,
        });
      }
      if (spec === 'laptop' || spec === 'both') {
        newServices.push({
          technicianId: existing.id,
          deviceType: 'Laptop / Desktop',
          repairCategory:
            input.laptopProblems && input.laptopProblems.length > 0
              ? input.laptopProblems.join(', ')
              : 'Display problem, Battery problem, Performance issue',
          supportedBrands: input.supportedBrands,
        });
      }
      if (newServices.length > 0) {
        await db.insert(technicianServices).values(newServices);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to update technician settings:', error);
    throw new Error('Unable to update technician settings.', { cause: error });
  }
}

export async function createRepairBooking(
  customerId: string,
  input: {
    technicianId: string;
    deviceType: string;
    deviceBrand: string;
    deviceModel?: string;
    repairProblem: string;
    problemDescription: string;
    problemPhoto?: string;
    customerAddress: string;
    customerLatitude?: number | null;
    customerLongitude?: number | null;
    preferredDate: string;
    preferredTime: string;
  }
) {
  try {
    const techRows = await db
      .select()
      .from(technicianProfiles)
      .where(
        and(
          eq(technicianProfiles.id, input.technicianId),
          eq(technicianProfiles.verificationStatus, 'approved'),
          eq(technicianProfiles.isActive, true)
        )
      )
      .limit(1);

    if (!techRows[0]) {
      throw new Error('Selected technician is not currently verified or active.');
    }

    const inserted = await db
      .insert(bookings)
      .values({
        customerId,
        technicianId: input.technicianId,
        deviceType: input.deviceType.trim(),
        deviceBrand: input.deviceBrand.trim(),
        deviceModel: input.deviceModel?.trim() || null,
        repairProblem: input.repairProblem.trim(),
        problemDescription: input.problemDescription.trim(),
        problemPhoto: input.problemPhoto || null,
        customerAddress: input.customerAddress.trim(),
        customerLatitude: input.customerLatitude ?? null,
        customerLongitude: input.customerLongitude ?? null,
        preferredDate: input.preferredDate,
        preferredTime: input.preferredTime,
        paymentMethod: 'Pay Technician Directly',
        bookingStatus: 'Pending',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to create booking:', error);
    throw new Error('Unable to place repair booking. Please check your details and try again.', {
      cause: error,
    });
  }
}

export async function getCustomerBookingsList(customerId: string) {
  try {
    const rows = await db
      .select({
        booking: bookings,
        tech: technicianProfiles,
        techUserName: profiles.fullName,
        techIsDemo: profiles.isDemo,
      })
      .from(bookings)
      .innerJoin(technicianProfiles, eq(bookings.technicianId, technicianProfiles.id))
      .innerJoin(profiles, eq(technicianProfiles.userId, profiles.id))
      .where(eq(bookings.customerId, customerId))
      .orderBy(desc(bookings.createdAt));

    return rows.map(({ booking, tech, techUserName, techIsDemo }) => ({
      ...booking,
      technician: {
        id: tech.id,
        fullName: techUserName,
        isDemo: tech.isDemo || techIsDemo,
        shopName: tech.shopName,
        shopAddress:
          booking.bookingStatus !== 'Pending' && booking.bookingStatus !== 'Rejected'
            ? tech.shopAddress
            : null,
        shopContact:
          booking.bookingStatus !== 'Pending' && booking.bookingStatus !== 'Rejected'
            ? tech.shopContact
            : null,
        serviceArea: tech.serviceArea,
        city: tech.city,
        serviceMode: tech.serviceMode,
        profileImage: tech.profileImage,
      },
    }));
  } catch (error) {
    console.error('Failed to fetch customer bookings:', error);
    throw new Error('Unable to load your repair bookings.', { cause: error });
  }
}

export async function cancelCustomerBooking(customerId: string, bookingId: string) {
  try {
    const existing = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, customerId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error('Booking not found.');
    }
    if (
      existing[0].bookingStatus !== 'Pending' &&
      existing[0].bookingStatus !== 'Accepted'
    ) {
      throw new Error('Only pending or accepted bookings can be cancelled.');
    }

    const updated = await db
      .update(bookings)
      .set({ bookingStatus: 'Cancelled', updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Failed to cancel booking:', error);
    throw new Error('Unable to cancel this booking.', { cause: error });
  }
}

export async function addCustomerBookingReview(
  customerId: string,
  bookingId: string,
  rating: number,
  reviewText: string
) {
  try {
    const existing = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, customerId)))
      .limit(1);

    if (!existing[0] || existing[0].bookingStatus !== 'Completed') {
      throw new Error('Feedback can only be submitted for completed repairs.');
    }

    const updated = await db
      .update(bookings)
      .set({
        customerRating: Math.max(1, Math.min(5, Math.round(rating))),
        customerReview: reviewText.trim(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Failed to submit booking review:', error);
    throw new Error('Unable to save your repair review.', { cause: error });
  }
}

export async function getTechnicianAssignedBookings(profileId: string) {
  try {
    const techRows = await db
      .select()
      .from(technicianProfiles)
      .where(eq(technicianProfiles.userId, profileId))
      .limit(1);

    if (!techRows[0]) return [];

    const rows = await db
      .select({
        booking: bookings,
        customerName: profiles.fullName,
        customerPhone: profiles.phone,
      })
      .from(bookings)
      .innerJoin(profiles, eq(bookings.customerId, profiles.id))
      .where(eq(bookings.technicianId, techRows[0].id))
      .orderBy(desc(bookings.createdAt));

    return rows.map(({ booking, customerName, customerPhone }) => ({
      ...booking,
      customerName,
      // Reveal customer contact phone only on active/authorized bookings
      customerPhone:
        booking.bookingStatus === 'Accepted' || booking.bookingStatus === 'In Progress'
          ? customerPhone
          : null,
    }));
  } catch (error) {
    console.error('Failed to fetch technician bookings:', error);
    throw new Error('Unable to load assigned repair requests.', { cause: error });
  }
}

export async function updateBookingStatusByTechnician(
  profileId: string,
  bookingId: string,
  nextStatus: 'Accepted' | 'Rejected' | 'In Progress' | 'Completed'
) {
  try {
    const techRows = await db
      .select()
      .from(technicianProfiles)
      .where(eq(technicianProfiles.userId, profileId))
      .limit(1);

    if (!techRows[0]) {
      throw new Error('Technician profile not found.');
    }

    const existingRows = await db
      .select()
      .from(bookings)
      .where(
        and(eq(bookings.id, bookingId), eq(bookings.technicianId, techRows[0].id))
      )
      .limit(1);

    if (!existingRows[0]) {
      throw new Error('Booking not assigned to your technician account.');
    }

    const updated = await db
      .update(bookings)
      .set({ bookingStatus: nextStatus, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Failed to update booking status:', error);
    throw new Error('Unable to update booking status.', { cause: error });
  }
}

export async function getAdminDashboardData() {
  try {
    const [allProfiles, allTechs, allServices, allBookings, allAddresses] =
      await Promise.all([
        db.select().from(profiles).orderBy(desc(profiles.createdAt)),
        db.select().from(technicianProfiles).orderBy(desc(technicianProfiles.createdAt)),
        db.select().from(technicianServices),
        db.select().from(bookings).orderBy(desc(bookings.createdAt)),
        db.select().from(customerAddresses),
      ]);

    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
    const techMap = new Map(allTechs.map((t) => [t.id, t]));
    const servicesByTech = new Map<string, typeof allServices>();
    for (const s of allServices) {
      const list = servicesByTech.get(s.technicianId) || [];
      list.push(s);
      servicesByTech.set(s.technicianId, list);
    }

    const defaultAddrByCustomer = new Map<string, (typeof allAddresses)[0]>();
    for (const addr of allAddresses) {
      if (addr.isDefault || !defaultAddrByCustomer.has(addr.customerId)) {
        defaultAddrByCustomer.set(addr.customerId, addr);
      }
    }

    const customers = allProfiles
      .filter((p) => p.role === 'customer')
      .map((c) => {
        const addr = defaultAddrByCustomer.get(c.id);
        const count = allBookings.filter((b) => b.customerId === c.id).length;
        return {
          ...c,
          city: addr?.city || 'Not set',
          locality: addr?.locality || '',
          bookingsCount: count,
        };
      });

    const technicians = allTechs.map((t) => {
      const user = profileMap.get(t.userId);
      const count = allBookings.filter((b) => b.technicianId === t.id).length;
      return {
        ...t,
        fullName: user?.fullName || 'Unknown Technician',
        phone: user?.phone || '',
        email: user?.email || '',
        services: servicesByTech.get(t.id) || [],
        bookingsCount: count,
      };
    });

    const enrichedBookings = allBookings.map((b) => {
      const cust = profileMap.get(b.customerId);
      const tech = techMap.get(b.technicianId);
      const techUser = tech ? profileMap.get(tech.userId) : undefined;
      return {
        ...b,
        customerName: cust?.fullName || 'Customer',
        customerPhone: cust?.phone || '',
        technicianName: techUser?.fullName || 'Technician',
        technicianCity: tech?.city || '',
      };
    });

    const metrics = {
      totalCustomers: customers.length,
      totalTechnicians: technicians.length,
      pendingTechnicians: technicians.filter((t) => t.verificationStatus === 'pending').length,
      approvedTechnicians: technicians.filter((t) => t.verificationStatus === 'approved').length,
      rejectedTechnicians: technicians.filter((t) => t.verificationStatus === 'rejected').length,
      totalBookings: enrichedBookings.length,
      activeBookings: enrichedBookings.filter((b) =>
        ['Pending', 'Accepted', 'In Progress'].includes(b.bookingStatus)
      ).length,
      completedBookings: enrichedBookings.filter((b) => b.bookingStatus === 'Completed').length,
    };

    return {
      metrics,
      customers,
      technicians,
      bookings: enrichedBookings,
    };
  } catch (error) {
    console.error('Failed to load admin dashboard data:', error);
    throw new Error('Unable to load administrator dashboard records.', { cause: error });
  }
}

export async function adminUpdateTechnicianVerification(
  techId: string,
  verificationStatus: 'approved' | 'rejected' | 'pending'
) {
  try {
    const updated = await db
      .update(technicianProfiles)
      .set({ verificationStatus, updatedAt: new Date() })
      .where(eq(technicianProfiles.id, techId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Admin verification update failed:', error);
    throw new Error('Unable to update technician verification status.', { cause: error });
  }
}

export async function adminToggleTechnicianActive(techId: string, isActive: boolean) {
  try {
    const updated = await db
      .update(technicianProfiles)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(technicianProfiles.id, techId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Admin technician active toggle failed:', error);
    throw new Error('Unable to update technician active status.', { cause: error });
  }
}
