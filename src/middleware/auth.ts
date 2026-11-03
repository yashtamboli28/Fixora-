import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface VerifiedIdentity {
  uid: string;
  email?: string;
  phone?: string;
  name?: string;
  authMethod: 'firebase' | 'phone_otp';
}

export interface AuthRequest extends Request {
  authIdentity?: VerifiedIdentity;
}

// Ephemeral in-memory secret and OTP store (never persisted to database tables per security rules)
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

interface OtpChallenge {
  otpHash: string;
  expiresAt: number;
  attempts: number;
}

const otpChallenges = new Map<string, OtpChallenge>();

// Configured controlled demo fixed OTP (supports test phone numbers & demo mode without sending live SMS)
const DEMO_FIXED_OTP = '123456';

function hashValue(val: string): string {
  return crypto.createHash('sha256').update(`${val}:${SESSION_SECRET}`).digest('hex');
}

export function createPhoneOtpChallenge(phone: string): { expiresInSeconds: number; demoHint: string } {
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpChallenges.set(phone, {
    otpHash: hashValue(DEMO_FIXED_OTP),
    expiresAt,
    attempts: 0,
  });
  return {
    expiresInSeconds: 300,
    demoHint: 'Controlled Demo Mode active: use configured test OTP 123456',
  };
}

export function verifyPhoneOtpChallenge(phone: string, otpCode: string): boolean {
  const challenge = otpChallenges.get(phone);
  if (!challenge) {
    return false;
  }
  if (Date.now() > challenge.expiresAt) {
    otpChallenges.delete(phone);
    return false;
  }
  challenge.attempts += 1;
  if (challenge.attempts > 5) {
    otpChallenges.delete(phone);
    return false;
  }
  const incomingHash = hashValue(otpCode.trim());
  if (incomingHash === challenge.otpHash) {
    otpChallenges.delete(phone);
    return true;
  }
  return false;
}

export function signPhoneSessionToken(phone: string): string {
  const payload = JSON.stringify({
    phone,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  });
  const base64Payload = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `otp.${base64Payload}.${signature}`;
}

function verifyPhoneSessionToken(token: string): { phone: string } | null {
  if (!token.startsWith('otp.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, base64Payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const decoded = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (!decoded.phone || Date.now() > decoded.exp) {
      return null;
    }
    return { phone: decoded.phone };
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  // Check if Phone OTP session token
  if (token.startsWith('otp.')) {
    const phoneData = verifyPhoneSessionToken(token);
    if (!phoneData) {
      res.status(401).json({ error: 'Unauthorized: Session expired or invalid OTP token' });
      return;
    }
    req.authIdentity = {
      uid: `phone:${phoneData.phone}`,
      phone: phoneData.phone,
      authMethod: 'phone_otp',
    };
    next();
    return;
  }

  // Otherwise verify Firebase ID token via firebase-admin
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.authIdentity = {
      uid: decoded.uid,
      email: decoded.email,
      phone: decoded.phone_number,
      name: decoded.name,
      authMethod: 'firebase',
    };
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
  }
};
