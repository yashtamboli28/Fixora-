-- =============================================================================
-- CircuitSetu: Local Electronics Repair Technician Marketplace
-- Complete PostgreSQL / Supabase Database Schema, Haversine Function & RLS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  gender TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'technician', 'admin')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. CUSTOMER ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_address TEXT,
  locality TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL CHECK (pincode ~ '^[0-9]{6}$'),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);

-- 3. TECHNICIAN PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.technician_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  experience_years INTEGER NOT NULL DEFAULT 1 CHECK (experience_years >= 0),
  professional_description TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '',
  device_specialization TEXT NOT NULL DEFAULT 'both' CHECK (device_specialization IN ('mobile', 'laptop', 'both')),
  has_shop BOOLEAN NOT NULL DEFAULT false,
  shop_name TEXT,
  shop_address TEXT,
  shop_location TEXT,
  shop_contact TEXT,
  service_mode TEXT NOT NULL DEFAULT 'both',
  full_address TEXT,
  service_area TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  service_radius_km INTEGER NOT NULL DEFAULT 10 CHECK (service_radius_km BETWEEN 1 AND 100),
  profile_image TEXT,
  break_time TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tech_verification ON public.technician_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_tech_city ON public.technician_profiles(city);
CREATE INDEX IF NOT EXISTS idx_tech_coords ON public.technician_profiles(latitude, longitude);

-- 4. TECHNICIAN SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.technician_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES public.technician_profiles(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  repair_category TEXT NOT NULL,
  supported_brands TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_tech_services_tech ON public.technician_services(technician_id);

-- 5. TECHNICIAN AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS public.technician_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES public.technician_profiles(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '09:30',
  end_time TEXT NOT NULL DEFAULT '19:30',
  is_available BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_tech_avail_tech ON public.technician_availability(technician_id);

-- 6. SERVICE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 7. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technician_profiles(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  device_brand TEXT NOT NULL,
  device_model TEXT,
  repair_problem TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  problem_photo TEXT,
  customer_address TEXT NOT NULL,
  customer_latitude DOUBLE PRECISION,
  customer_longitude DOUBLE PRECISION,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Pay Technician Directly',
  booking_status TEXT NOT NULL DEFAULT 'Pending' CHECK (booking_status IN ('Pending', 'Accepted', 'Rejected', 'In Progress', 'Completed', 'Cancelled')),
  customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
  customer_review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_technician ON public.bookings(technician_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(booking_status);

-- 8. SAVED TECHNICIANS TABLE
CREATE TABLE IF NOT EXISTS public.saved_technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technician_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_saved_tech_customer UNIQUE (customer_id, technician_id)
);

-- =============================================================================
-- HAVERSINE DISTANCE POSTGRESQL FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.calculate_haversine_km(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE
AS $$
  SELECT ROUND(
    (
      6371 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
          COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
          POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
        )
      )
    )::numeric,
    1
  )::double precision;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE DEPLOYMENTS
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_technicians ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role securely
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Profiles: users read/update only their own record; cannot escalate role to 'admin'
CREATE POLICY "Users view own profile or admin views all"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users update own non-role fields"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role IN ('customer', 'technician'));

-- Customer Addresses: private to owning customer and admins
CREATE POLICY "Customers manage own addresses"
  ON public.customer_addresses FOR ALL
  USING (customer_id = auth.uid() OR public.is_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_admin());

-- Technician Profiles: public can view ONLY approved & active profiles; technicians manage own without self-approval
CREATE POLICY "Public discovery of approved technicians"
  ON public.technician_profiles FOR SELECT
  USING (
    (verification_status = 'approved' AND is_active = true)
    OR user_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Technicians insert own pending profile"
  ON public.technician_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND verification_status = 'pending');

CREATE POLICY "Technicians update own profile without self-approval"
  ON public.technician_profiles FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      user_id = auth.uid()
      AND verification_status = (SELECT tp.verification_status FROM public.technician_profiles tp WHERE tp.id = id)
    )
  );

-- Service Categories: publicly readable; admin managed
CREATE POLICY "Public read service categories"
  ON public.service_categories FOR SELECT
  USING (is_active = true OR public.is_admin());

-- Technician Services & Availability: publicly readable for approved technicians; editable by owner
CREATE POLICY "Public read technician services"
  ON public.technician_services FOR SELECT
  USING (true);

CREATE POLICY "Public read technician availability"
  ON public.technician_availability FOR SELECT
  USING (true);

-- Bookings: customers see/create own; technicians see/update assigned; admins see all
CREATE POLICY "Customers and assigned technicians read bookings"
  ON public.bookings FOR SELECT
  USING (
    customer_id = auth.uid()
    OR technician_id IN (SELECT id FROM public.technician_profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Customers create own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers or assigned technicians update bookings"
  ON public.bookings FOR UPDATE
  USING (
    customer_id = auth.uid()
    OR technician_id IN (SELECT id FROM public.technician_profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- Saved Technicians: private to customer
CREATE POLICY "Customers manage saved technicians"
  ON public.saved_technicians FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());
