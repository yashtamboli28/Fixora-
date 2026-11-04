# Fixora — Local Electronics Repair Technician Marketplace

Fixora is a full-stack two-sided local electronics repair marketplace connecting Indian households and professionals with nearby mobile phone and laptop repair technicians.

---

## 1. Required Software

- **Node.js** `>= 20.x` (Node 22 LTS recommended)
- **npm** `>= 10.x`
- **PostgreSQL 15+** (Cloud SQL for PostgreSQL or Supabase PostgreSQL)

---

## 2. Installation Commands

```bash
npm install
```

---

## 3. PostgreSQL / Supabase Project Setup

- **Cloud SQL & Auth**: PostgreSQL (`drizzle-orm` + `pg`) and Authentication (`firebase` + `firebase-admin`) are provisioned and pre-wired for full-stack execution.
- **Standalone Supabase Setup**:
  1. Create a new project in the Supabase Dashboard (select **South Asia — Mumbai `ap-south-1`** for lowest Indian latency).
  2. Open **SQL Editor** in the Supabase Dashboard.
  3. Copy and run `supabase/migrations/001_initial_schema.sql` to create all UUID tables, foreign keys, B-Tree indexes, the `calculate_haversine_km` distance function, and Row Level Security (RLS) policies.
  4. In **Storage**, create a public bucket named `repair-media` for technician profile photos and customer device problem photos.

---

## 4. SQL Migration Execution

- **Drizzle Kit (Cloud SQL / PostgreSQL)**:
  Schema definitions live in `src/db/schema.ts` and are pushed via `src/db/drizzle.config.ts`.
- **Supabase SQL Editor**:
  Paste the contents of `supabase/migrations/001_initial_schema.sql` into a new query tab in the Supabase SQL Editor and click **Run**.

---

## 5. Phone OTP Test Configuration

- **Controlled Demo Mode (Built-in)**:
  To support demonstrations with 100+ customers and 10–15 technicians without incurring live SMS costs, the authentication server supports a configured test OTP:
  - **Fixed Demo OTP**: `123456`
  - **OTP Storage Security**: OTP challenges are hashed with HMAC-SHA256 in ephemeral server memory and expire after 5 minutes. Raw OTP codes or passwords are never stored in database tables.
- **Live SMS Provider Configuration (Production)**:
  In Supabase Authentication → **Providers → Phone**, enable Phone Auth and configure Twilio / MessageBird / Vonage credentials, or add test phone numbers under *Phone Numbers for Testing* (`+919000000101=123456`).

---

## 6. Admin Account Setup

Admin privileges can **never** be self-assigned through customer or technician signup forms:
1. **Google Sign-In Bootstrap**: Authorized administrator Google accounts are granted `role = 'admin'` on server-side token verification.
2. **Controlled Demo Admin Login**: Open **Login**, enter test number `+91 9000000001`, and verify with OTP `123456` to open the protected **Admin Console**.

---

## 7. Demo Data Setup

- Sample records are pre-seeded in PostgreSQL with `is_demo = true` and explicitly labeled **`(Demo)`** in the UI:
  - **16 active service categories** (8 Mobile Phone issues + 8 Laptop/Desktop issues).
  - **10 admin-approved fictional `(Demo)` technicians** across Bengaluru, Mumbai, Pune, New Delhi, Hyderabad, Chennai, Noida, Ahmedabad, and Kolkata.
  - **2 pending fictional `(Demo)` technician applications** ready for administrator approval testing.
  - Test technician login: `+91 9000000101` (OTP `123456`).

---

## 8. Local Development Instructions

```bash
npm run dev
```

Starts the Express backend and Vite frontend together on `http://localhost:3000`.

---

## 9. Build & Deployment Instructions

```bash
npm run build
npm start
```

- **Cloud Run / Node Full-Stack Hosting**: Build static client assets into `dist/` with `npm run build` and run `node server.ts` on port `3000`.
- **Vercel + External PostgreSQL/Supabase**: Deploy the frontend build (`vite build`) and mount `/api/*` serverless routes connected to your PostgreSQL or Supabase project.
