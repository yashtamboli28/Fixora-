# Fixora — Local Electronics Repair Technician Marketplace

Fixora is a full-stack two-sided local electronics repair marketplace connecting Indian households and professionals with nearby mobile phone and laptop repair technicians.

---

## 1. Required Software

- **Node.js** `>= 20.x` (Node 22 LTS recommended)
- **npm** `>= 10.x`
- **PostgreSQL 15+** (Cloud SQL for PostgreSQL in Google AI Studio, or Supabase PostgreSQL for external deployments)

---

## 2. Installation Commands

```bash
npm install
```

---

## 3. PostgreSQL / Supabase Project Setup

- **In Google AI Studio**: Cloud SQL for PostgreSQL (`drizzle-orm` + `pg`) and Firebase Authentication (`firebase` + `firebase-admin`) are provisioned and pre-wired automatically.
- **For Standalone Supabase Deployment**:
  1. Create a new project in the Supabase Dashboard (select **South Asia — Mumbai `ap-south-1`** for lowest Indian latency).
  2. Open **SQL Editor** in the Supabase Dashboard.
  3. Copy and run `supabase/migrations/001_initial_schema.sql` to create all UUID tables, foreign keys, B-Tree indexes, the `calculate_haversine_km` distance function, and Row Level Security (RLS) policies.
  4. In **Storage**, create a public bucket named `repair-media` for technician profile photos and customer device problem photos.
  5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` or Vercel environment settings so `@supabase/supabase-js` (`src/lib/supabase.ts`) connects directly to Supabase Auth, PostgREST, and Storage.

---

## 4. Environment Variables

Configure variables based on `.env.example`:

```env
APP_URL="http://localhost:3000"

# Supabase Client SDK (Set when connecting to an external Supabase project)
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-public-anon-key"

# PostgreSQL Runtime Connection Pool (App User — pre-configured in AI Studio)
SQL_HOST="/cloudsql/your-instance"
SQL_DB_NAME="postgres"
SQL_USER="app_user"
SQL_PASSWORD="your_password"

# Drizzle Kit Schema Migrations (Admin User)
SQL_ADMIN_USER="postgres"
SQL_ADMIN_PASSWORD="your_admin_password"

# Comma-separated authorized administrator emails
ADMIN_EMAILS="ytamboli943@gmail.com"
```

Never expose secret or service-role keys in frontend code (`VITE_*`). All database operations and role checks run server-side through Express (`/api/*`).

---

## 5. SQL Migration Execution

- **Drizzle Kit (Cloud SQL / PostgreSQL)**:
  Schema definitions live in `src/db/schema.ts` and are pushed via `src/db/drizzle.config.ts`.
- **Supabase SQL Editor**:
  Paste the contents of `supabase/migrations/001_initial_schema.sql` into a new query tab in the Supabase SQL Editor and click **Run**.

---

## 6. Phone OTP Test Configuration

- **Controlled Demo Mode (Built-in)**:
  To support demonstrations with 100+ customers and 10–15 technicians without incurring live SMS costs, the authentication server supports a configured test OTP:
  - **Fixed Demo OTP**: `123456`
  - **OTP Storage Security**: OTP challenges are hashed with HMAC-SHA256 in ephemeral server memory and expire after 5 minutes. Raw OTP codes or passwords are never stored in database tables.
- **Live SMS Provider Configuration (Production)**:
  In Supabase Authentication → **Providers → Phone**, enable Phone Auth and configure Twilio / MessageBird / Vonage credentials, or add test phone numbers under *Phone Numbers for Testing* (`+919000000101=123456`).

---

## 7. Admin Account Setup

Admin privileges can **never** be self-assigned through customer or technician signup forms:
1. **Google Sign-In Bootstrap**: Any email listed in `ADMIN_EMAILS` is automatically granted `role = 'admin'` on server-side token verification.
2. **Controlled Demo Admin Login**: Open **Login**, enter test number `+91 9000000001`, and verify with OTP `123456` to open the protected **Admin Console**.

---

## 8. Demo Data Setup

- Sample records are pre-seeded in PostgreSQL with `is_demo = true` and explicitly labeled **`(Demo)`** in the UI:
  - **16 active service categories** (8 Mobile Phone issues + 8 Laptop/Desktop issues).
  - **10 admin-approved fictional `(Demo)` technicians** across Bengaluru, Mumbai, Pune, New Delhi, Hyderabad, Chennai, Noida, Ahmedabad, and Kolkata.
  - **2 pending fictional `(Demo)` technician applications** ready for administrator approval testing.
  - Test technician login: `+91 9000000101` (OTP `123456`).

---

## 9. Local Development Instructions

```bash
npm run dev
```

Starts the Express backend and Vite frontend together on `http://localhost:3000`.

---

## 10. Build & Deployment Instructions

```bash
npm run build
npm start
```

- **Cloud Run / Node Full-Stack Hosting**: Build static client assets into `dist/` with `npm run build` and run `node server.ts` on port `3000`.
- **Vercel + External PostgreSQL/Supabase**: Deploy the frontend build (`vite build`) and mount `/api/*` serverless routes with PostgreSQL environment variables configured in Project Settings.
