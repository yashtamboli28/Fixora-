import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import * as dotenv from 'dotenv';
import {
  createPhoneOtpChallenge,
  requireAuth,
  signPhoneSessionToken,
  verifyPhoneOtpChallenge,
  type AuthRequest,
} from './src/middleware/auth.ts';
import { normalizeIndianPhone } from './src/lib/geo.ts';
import {
  addCustomerBookingReview,
  adminToggleTechnicianActive,
  adminUpdateTechnicianVerification,
  cancelCustomerBooking,
  createRepairBooking,
  discoverApprovedTechnicians,
  findProfileByIdentity,
  getActiveServiceCategories,
  getAdminDashboardData,
  getCustomerBookingsList,
  getFullAccountBundle,
  getPublicCompletedReviews,
  getPublicTechnicianById,
  getTechnicianAssignedBookings,
  saveCustomerLocation,
  submitTechnicianOnboarding,
  toggleSavedTechnician,
  updateBookingStatusByTechnician,
  updateTechnicianDashboardSettings,
  upsertUserProfile,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // --- Public Marketplace Routes ---
  app.get('/api/service-categories', async (_req, res) => {
    try {
      const categories = await getActiveServiceCategories();
      res.json({ categories });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load categories' });
    }
  });

  app.get('/api/reviews/public', async (_req, res) => {
    try {
      const reviews = await getPublicCompletedReviews();
      res.json({ reviews });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load reviews' });
    }
  });

  app.get('/api/technicians', async (req, res) => {
    try {
      const lat = req.query.lat ? Number(req.query.lat) : undefined;
      const lng = req.query.lng ? Number(req.query.lng) : undefined;
      const technicians = await discoverApprovedTechnicians({
        lat,
        lng,
        deviceType: typeof req.query.deviceType === 'string' ? req.query.deviceType : undefined,
        problem: typeof req.query.problem === 'string' ? req.query.problem : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        availableOnly: req.query.availableOnly === 'true',
        withinRadiusOnly: req.query.withinRadiusOnly === 'true',
        sortBy: req.query.sortBy === 'experience' ? 'experience' : 'nearest',
      });
      res.json({ technicians });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to search technicians' });
    }
  });

  app.get('/api/technicians/:id', async (req, res) => {
    try {
      const lat = req.query.lat ? Number(req.query.lat) : undefined;
      const lng = req.query.lng ? Number(req.query.lng) : undefined;
      const technician = await getPublicTechnicianById(req.params.id, lat, lng);
      if (!technician) {
        res.status(404).json({ error: 'Technician profile not found or not yet verified.' });
        return;
      }
      res.json({ technician });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load technician profile' });
    }
  });

  // --- Mobile Phone OTP Authentication Routes ---
  app.post('/api/auth/send-otp', (req, res) => {
    try {
      const rawPhone = String(req.body?.phone || '').trim();
      const phone = normalizeIndianPhone(rawPhone);
      if (!/^\+91\d{10}$/.test(phone)) {
        res.status(400).json({
          error: 'Please enter a valid 10-digit Indian mobile number (+91 XXXXX XXXXX).',
        });
        return;
      }
      const challenge = createPhoneOtpChallenge(phone);
      res.json({
        phone,
        expiresInSeconds: challenge.expiresInSeconds,
        demoNotice: challenge.demoHint,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to initiate OTP verification' });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const rawPhone = String(req.body?.phone || '').trim();
      const otp = String(req.body?.otp || '').trim();
      const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const requestedRole =
        req.body?.requestedRole === 'technician' ? 'technician' : 'customer';

      const phone = normalizeIndianPhone(rawPhone);
      if (!/^\+91\d{10}$/.test(phone)) {
        res.status(400).json({ error: 'Invalid mobile number format.' });
        return;
      }
      if (!/^\d{6}$/.test(otp)) {
        res.status(400).json({ error: 'Please enter a valid 6-digit OTP code.' });
        return;
      }

      const isValid = verifyPhoneOtpChallenge(phone, otp);
      if (!isValid) {
        res.status(401).json({
          error: 'Invalid or expired OTP code. In Controlled Demo Mode, use 123456.',
        });
        return;
      }

      const sessionToken = signPhoneSessionToken(phone);
      const identity = {
        uid: `phone:${phone}`,
        phone,
        authMethod: 'phone_otp' as const,
      };

      let profile = await findProfileByIdentity(identity);

      if (!profile) {
        if (!fullName && requestedRole === 'customer') {
          res.status(404).json({
            needsRegistration: true,
            sessionToken,
            phone,
            error: 'No existing account found for this mobile number. Please enter your full name to complete signup.',
          });
          return;
        }
        profile = await upsertUserProfile(identity, {
          fullName: fullName || 'New Technician',
          phone,
          email: email || undefined,
          requestedRole,
        });
      }

      const bundle = await getFullAccountBundle(profile.id);
      res.json({
        sessionToken,
        ...bundle,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'OTP verification failed' });
    }
  });

  // --- Authenticated Account & Sync Routes ---
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.json({ profile: null, addresses: [], technicianProfile: null, savedTechnicianIds: [] });
        return;
      }
      const bundle = await getFullAccountBundle(profile.id);
      res.json(bundle);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch user session' });
    }
  });

  app.post('/api/me/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const fullName = String(req.body?.fullName || req.authIdentity?.name || '').trim();
      if (!fullName) {
        res.status(400).json({ error: 'Full name is required.' });
        return;
      }
      const rawPhone = req.body?.phone ? normalizeIndianPhone(String(req.body.phone)) : undefined;
      if (rawPhone && !/^\+91\d{10}$/.test(rawPhone)) {
        res.status(400).json({ error: 'Please provide a valid 10-digit Indian mobile number.' });
        return;
      }
      const requestedRole =
        req.body?.requestedRole === 'technician' ? 'technician' : 'customer';

      const profile = await upsertUserProfile(req.authIdentity!, {
        fullName,
        phone: rawPhone,
        email: req.body?.email ? String(req.body.email).trim() : undefined,
        gender: req.body?.gender ? String(req.body.gender).trim() : undefined,
        requestedRole,
      });

      const bundle = await getFullAccountBundle(profile.id);
      res.json(bundle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to synchronize account' });
    }
  });

  // --- Customer Routes ---
  app.post('/api/customer/addresses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.status(404).json({ error: 'Account profile not found.' });
        return;
      }
      const locality = String(req.body?.locality || '').trim();
      const city = String(req.body?.city || '').trim();
      const pincode = String(req.body?.pincode || '').trim();

      if (!locality || !city || !/^\d{6}$/.test(pincode)) {
        res.status(400).json({
          error: 'Please enter a valid area/locality, city, and 6-digit pincode.',
        });
        return;
      }

      const address = await saveCustomerLocation(profile.id, {
        fullAddress: req.body?.fullAddress ? String(req.body.fullAddress) : undefined,
        locality,
        city,
        state: req.body?.state ? String(req.body.state) : '',
        pincode,
        latitude: req.body?.latitude !== undefined ? Number(req.body.latitude) : null,
        longitude: req.body?.longitude !== undefined ? Number(req.body.longitude) : null,
      });

      const bundle = await getFullAccountBundle(profile.id);
      res.json({ address, addresses: bundle.addresses });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save location' });
    }
  });

  app.post('/api/customer/saved-technicians/:techId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.status(404).json({ error: 'Account profile not found.' });
        return;
      }
      const result = await toggleSavedTechnician(profile.id, req.params.techId);
      const bundle = await getFullAccountBundle(profile.id);
      res.json({ ...result, savedTechnicianIds: bundle.savedTechnicianIds });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update saved technicians' });
    }
  });

  app.get('/api/customer/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.status(404).json({ error: 'Account profile not found.' });
        return;
      }
      const list = await getCustomerBookingsList(profile.id);
      res.json({ bookings: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load bookings' });
    }
  });

  app.post('/api/customer/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.status(404).json({ error: 'Please complete registration before booking.' });
        return;
      }

      const {
        technicianId,
        deviceType,
        deviceBrand,
        deviceModel,
        repairProblem,
        problemDescription,
        problemPhoto,
        customerAddress,
        customerLatitude,
        customerLongitude,
        preferredDate,
        preferredTime,
      } = req.body || {};

      if (
        !technicianId ||
        !deviceType ||
        !deviceBrand ||
        !repairProblem ||
        !problemDescription ||
        !customerAddress ||
        !preferredDate ||
        !preferredTime
      ) {
        res.status(400).json({ error: 'Please fill in all required booking fields.' });
        return;
      }

      const booking = await createRepairBooking(profile.id, {
        technicianId: String(technicianId),
        deviceType: String(deviceType),
        deviceBrand: String(deviceBrand),
        deviceModel: deviceModel ? String(deviceModel) : undefined,
        repairProblem: String(repairProblem),
        problemDescription: String(problemDescription),
        problemPhoto: problemPhoto ? String(problemPhoto) : undefined,
        customerAddress: String(customerAddress),
        customerLatitude: customerLatitude !== undefined ? Number(customerLatitude) : null,
        customerLongitude: customerLongitude !== undefined ? Number(customerLongitude) : null,
        preferredDate: String(preferredDate),
        preferredTime: String(preferredTime),
      });

      res.status(201).json({ booking });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create booking' });
    }
  });

  app.patch('/api/customer/bookings/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found.' });
        return;
      }
      const updated = await cancelCustomerBooking(profile.id, req.params.id);
      res.json({ booking: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to cancel booking' });
    }
  });

  app.post('/api/customer/bookings/:id/review', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found.' });
        return;
      }
      const rating = Number(req.body?.rating || 5);
      const review = String(req.body?.review || '').trim();
      if (!review) {
        res.status(400).json({ error: 'Please write a brief comment about your repair experience.' });
        return;
      }
      const updated = await addCustomerBookingReview(profile.id, req.params.id, rating, review);
      res.json({ booking: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to submit review' });
    }
  });

  // --- Technician Routes ---
  app.post('/api/technician/onboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      let profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        const fullName = String(req.body?.fullName || req.authIdentity?.name || '').trim();
        if (!fullName) {
          res.status(400).json({ error: 'Full name is required for technician onboarding.' });
          return;
        }
        profile = await upsertUserProfile(req.authIdentity!, {
          fullName,
          phone: req.body?.phone ? normalizeIndianPhone(String(req.body.phone)) : undefined,
          email: req.body?.email ? String(req.body.email) : undefined,
          gender: req.body?.gender ? String(req.body.gender) : undefined,
          requestedRole: 'technician',
        });
      }

      const body = req.body || {};
      if (!body.serviceArea || !body.city || !body.state || !/^\d{6}$/.test(String(body.pincode || ''))) {
        res.status(400).json({
          error: 'Complete service area, city, state, and a valid 6-digit pincode are required.',
        });
        return;
      }

      await submitTechnicianOnboarding(profile.id, profile.role, {
        fullName: body.fullName,
        email: body.email,
        gender: body.gender,
        profileImage: body.profileImage,
        fullAddress: String(body.fullAddress || `${body.serviceArea}, ${body.city}`),
        serviceArea: String(body.serviceArea),
        city: String(body.city),
        state: String(body.state),
        pincode: String(body.pincode),
        latitude: body.latitude !== undefined && body.latitude !== null ? Number(body.latitude) : null,
        longitude: body.longitude !== undefined && body.longitude !== null ? Number(body.longitude) : null,
        serviceRadiusKm: Number(body.serviceRadiusKm) || 10,
        hasShop: Boolean(body.hasShop),
        shopName: body.shopName,
        shopAddress: body.shopAddress,
        shopLocation: body.shopLocation,
        shopContact: body.shopContact,
        serviceMode: String(body.serviceMode || (body.hasShop ? 'both' : 'home_service')),
        experienceYears: Number(body.experienceYears) || 1,
        professionalDescription: String(body.professionalDescription || ''),
        deviceSpecialization:
          body.deviceSpecialization === 'mobile' || body.deviceSpecialization === 'laptop'
            ? body.deviceSpecialization
            : 'both',
        skills: String(body.skills || ''),
        supportedBrands: String(body.supportedBrands || ''),
        mobileProblems: Array.isArray(body.mobileProblems) ? body.mobileProblems : [],
        laptopProblems: Array.isArray(body.laptopProblems) ? body.laptopProblems : [],
        workingDays: Array.isArray(body.workingDays)
          ? body.workingDays
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        startTime: String(body.startTime || '09:30'),
        endTime: String(body.endTime || '19:30'),
        breakTime: body.breakTime ? String(body.breakTime) : undefined,
        isAvailable: body.isAvailable !== false,
      });

      const bundle = await getFullAccountBundle(profile.id);
      res.status(201).json({
        message:
          'Your technician profile has been submitted successfully. Your account is awaiting administrator approval.',
        ...bundle,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Technician onboarding failed' });
    }
  });

  app.put('/api/technician/settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found.' });
        return;
      }
      await updateTechnicianDashboardSettings(profile.id, req.body || {});
      const bundle = await getFullAccountBundle(profile.id);
      res.json(bundle);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update settings' });
    }
  });

  app.get('/api/technician/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found.' });
        return;
      }
      const list = await getTechnicianAssignedBookings(profile.id);
      res.json({ bookings: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load assigned bookings' });
    }
  });

  app.patch('/api/technician/bookings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found.' });
        return;
      }
      const nextStatus = req.body?.status;
      if (!['Accepted', 'Rejected', 'In Progress', 'Completed'].includes(nextStatus)) {
        res.status(400).json({ error: 'Invalid booking status transition.' });
        return;
      }
      const updated = await updateBookingStatusByTechnician(profile.id, req.params.id, nextStatus);
      res.json({ booking: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update booking status' });
    }
  });

  // --- Protected Administrator Routes ---
  app.get('/api/admin/overview', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile || profile.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Administrator access required.' });
        return;
      }
      const data = await getAdminDashboardData();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load admin dashboard' });
    }
  });

  app.patch('/api/admin/technicians/:id/verification', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile || profile.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Administrator access required.' });
        return;
      }
      const status = req.body?.status;
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        res.status(400).json({ error: 'Invalid verification status.' });
        return;
      }
      const updated = await adminUpdateTechnicianVerification(req.params.id, status);
      res.json({ technician: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update verification status' });
    }
  });

  app.patch('/api/admin/technicians/:id/active', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = await findProfileByIdentity(req.authIdentity!);
      if (!profile || profile.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Administrator access required.' });
        return;
      }
      const isActive = Boolean(req.body?.isActive);
      const updated = await adminToggleTechnicianActive(req.params.id, isActive);
      res.json({ technician: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to toggle technician active status' });
    }
  });

  // --- Vite Dev Middleware / Production Static Assets ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fixora server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
