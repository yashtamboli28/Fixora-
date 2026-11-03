import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firebaseUid: text('firebase_uid').unique(),
    fullName: text('full_name').notNull(),
    phone: text('phone').unique(),
    email: text('email'),
    gender: text('gender'),
    role: text('role').notNull().default('customer'), // 'customer' | 'technician' | 'admin'
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_profiles_role').on(table.role),
    index('idx_profiles_phone').on(table.phone),
  ]
);

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    fullAddress: text('full_address'),
    locality: text('locality').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull().default(''),
    pincode: text('pincode').notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    isDefault: boolean('is_default').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_customer_addresses_customer').on(table.customerId)]
);

export const technicianProfiles = pgTable(
  'technician_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    experienceYears: integer('experience_years').notNull().default(1),
    professionalDescription: text('professional_description').notNull().default(''),
    skills: text('skills').notNull().default(''),
    deviceSpecialization: text('device_specialization').notNull().default('both'), // 'mobile' | 'laptop' | 'both'
    hasShop: boolean('has_shop').notNull().default(false),
    shopName: text('shop_name'),
    shopAddress: text('shop_address'),
    shopLocation: text('shop_location'),
    shopContact: text('shop_contact'),
    serviceMode: text('service_mode').notNull().default('both'), // 'shop' | 'home_service' | 'both'
    fullAddress: text('full_address'), // Private technician residential/base address (never exposed publicly)
    serviceArea: text('service_area').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    pincode: text('pincode').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    serviceRadiusKm: integer('service_radius_km').notNull().default(10),
    profileImage: text('profile_image'),
    breakTime: text('break_time'),
    verificationStatus: text('verification_status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
    isAvailable: boolean('is_available').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_tech_verification').on(table.verificationStatus),
    index('idx_tech_city').on(table.city),
    index('idx_tech_coords').on(table.latitude, table.longitude),
  ]
);

export const technicianServices = pgTable(
  'technician_services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    technicianId: uuid('technician_id')
      .notNull()
      .references(() => technicianProfiles.id, { onDelete: 'cascade' }),
    deviceType: text('device_type').notNull(), // 'Mobile Phone' | 'Laptop / Desktop'
    repairCategory: text('repair_category').notNull(),
    supportedBrands: text('supported_brands').notNull().default(''),
  },
  (table) => [
    index('idx_tech_services_tech').on(table.technicianId),
    index('idx_tech_services_device').on(table.deviceType),
  ]
);

export const technicianAvailability = pgTable(
  'technician_availability',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    technicianId: uuid('technician_id')
      .notNull()
      .references(() => technicianProfiles.id, { onDelete: 'cascade' }),
    dayOfWeek: text('day_of_week').notNull(),
    startTime: text('start_time').notNull().default('09:30'),
    endTime: text('end_time').notNull().default('19:30'),
    isAvailable: boolean('is_available').notNull().default(true),
  },
  (table) => [index('idx_tech_avail_tech').on(table.technicianId)]
);

export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceType: text('device_type').notNull(), // 'Mobile Phone' | 'Laptop / Desktop'
  categoryName: text('category_name').notNull(),
  description: text('description').notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    technicianId: uuid('technician_id')
      .notNull()
      .references(() => technicianProfiles.id, { onDelete: 'cascade' }),
    deviceType: text('device_type').notNull(),
    deviceBrand: text('device_brand').notNull(),
    deviceModel: text('device_model'),
    repairProblem: text('repair_problem').notNull(),
    problemDescription: text('problem_description').notNull(),
    problemPhoto: text('problem_photo'),
    customerAddress: text('customer_address').notNull(),
    customerLatitude: doublePrecision('customer_latitude'),
    customerLongitude: doublePrecision('customer_longitude'),
    preferredDate: text('preferred_date').notNull(),
    preferredTime: text('preferred_time').notNull(),
    paymentMethod: text('payment_method').notNull().default('Pay Technician Directly'),
    bookingStatus: text('booking_status').notNull().default('Pending'), // 'Pending' | 'Accepted' | 'Rejected' | 'In Progress' | 'Completed' | 'Cancelled'
    customerRating: integer('customer_rating'),
    customerReview: text('customer_review'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_bookings_customer').on(table.customerId),
    index('idx_bookings_technician').on(table.technicianId),
    index('idx_bookings_status').on(table.bookingStatus),
  ]
);

export const savedTechnicians = pgTable(
  'saved_technicians',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    technicianId: uuid('technician_id')
      .notNull()
      .references(() => technicianProfiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_saved_tech_customer').on(table.customerId, table.technicianId),
  ]
);

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  addresses: many(customerAddresses),
  technicianProfile: one(technicianProfiles, {
    fields: [profiles.id],
    references: [technicianProfiles.userId],
  }),
  bookings: many(bookings),
  savedTechnicians: many(savedTechnicians),
}));

export const technicianProfilesRelations = relations(technicianProfiles, ({ one, many }) => ({
  user: one(profiles, {
    fields: [technicianProfiles.userId],
    references: [profiles.id],
  }),
  services: many(technicianServices),
  availability: many(technicianAvailability),
  bookings: many(bookings),
}));
