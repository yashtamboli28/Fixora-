import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiRequest, getOtpSessionToken, setOtpSessionToken } from '../lib/api';
import type {
  CustomerAddress,
  OwnTechnicianProfile,
  UserProfile,
} from '../types/marketplace';

interface AccountBundleResponse {
  profile: UserProfile | null;
  addresses: CustomerAddress[];
  technicianProfile: OwnTechnicianProfile | null;
  savedTechnicianIds: string[];
}

interface AuthContextValue {
  loading: boolean;
  isAuthenticated: boolean;
  firebaseEmail: string | null;
  firebaseDisplayName: string | null;
  profile: UserProfile | null;
  addresses: CustomerAddress[];
  defaultAddress: CustomerAddress | null;
  technicianProfile: OwnTechnicianProfile | null;
  savedTechnicianIds: string[];
  guestLocation: {
    locality: string;
    city: string;
    pincode: string;
    latitude: number;
    longitude: number;
  } | null;
  setGuestLocation: (loc: {
    locality: string;
    city: string;
    pincode: string;
    latitude: number;
    longitude: number;
  } | null) => void;
  signInWithGoogle: () => Promise<AccountBundleResponse>;
  applyOtpLoginBundle: (
    sessionToken: string,
    bundle: AccountBundleResponse
  ) => void;
  refreshAccount: () => Promise<AccountBundleResponse | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasFirebaseUser, setHasFirebaseUser] = useState(false);
  const [firebaseEmail, setFirebaseEmail] = useState<string | null>(null);
  const [firebaseDisplayName, setFirebaseDisplayName] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [technicianProfile, setTechnicianProfile] =
    useState<OwnTechnicianProfile | null>(null);
  const [savedTechnicianIds, setSavedTechnicianIds] = useState<string[]>([]);
  const [guestLocation, setGuestLocation] = useState<{
    locality: string;
    city: string;
    pincode: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  const applyBundle = useCallback((bundle: AccountBundleResponse) => {
    setProfile(bundle.profile);
    setAddresses(bundle.addresses || []);
    setTechnicianProfile(bundle.technicianProfile || null);
    setSavedTechnicianIds(bundle.savedTechnicianIds || []);
  }, []);

  const refreshAccount = useCallback(async () => {
    try {
      const bundle = await apiRequest<AccountBundleResponse>('/api/me');
      applyBundle(bundle);
      return bundle;
    } catch {
      return null;
    }
  }, [applyBundle]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setHasFirebaseUser(true);
        setFirebaseEmail(user.email);
        setFirebaseDisplayName(user.displayName);
        try {
          const bundle = await apiRequest<AccountBundleResponse>('/api/me');
          applyBundle(bundle);
        } catch {
          // User authenticated with Firebase, awaiting profile registration sync
        }
      } else if (!getOtpSessionToken()) {
        setHasFirebaseUser(false);
        setFirebaseEmail(null);
        setFirebaseDisplayName(null);
        setProfile(null);
        setAddresses([]);
        setTechnicianProfile(null);
        setSavedTechnicianIds([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [applyBundle]);

  const signInWithGoogle = async (): Promise<AccountBundleResponse> => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    setHasFirebaseUser(true);
    setFirebaseEmail(cred.user.email);
    setFirebaseDisplayName(cred.user.displayName);
    const bundle = await apiRequest<AccountBundleResponse>('/api/me');
    applyBundle(bundle);
    return bundle;
  };

  const applyOtpLoginBundle = (
    sessionToken: string,
    bundle: AccountBundleResponse
  ) => {
    setOtpSessionToken(sessionToken);
    applyBundle(bundle);
  };

  const logout = async () => {
    setOtpSessionToken(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
    setHasFirebaseUser(false);
    setFirebaseEmail(null);
    setFirebaseDisplayName(null);
    setProfile(null);
    setAddresses([]);
    setTechnicianProfile(null);
    setSavedTechnicianIds([]);
  };

  const defaultAddress =
    addresses.find((a) => a.isDefault) || addresses[0] || null;

  const isAuthenticated = Boolean(profile || hasFirebaseUser || getOtpSessionToken());

  return (
    <AuthContext.Provider
      value={{
        loading,
        isAuthenticated,
        firebaseEmail,
        firebaseDisplayName,
        profile,
        addresses,
        defaultAddress,
        technicianProfile,
        savedTechnicianIds,
        guestLocation,
        setGuestLocation,
        signInWithGoogle,
        applyOtpLoginBundle,
        refreshAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
