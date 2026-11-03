import { auth } from './firebase';
import {
  fetchApprovedTechniciansFromSupabase,
  fetchCategoriesFromSupabase,
  isSupabaseClientConfigured,
  supabase,
  uploadImageToSupabaseStorage,
} from './supabase';

// In-memory session token storage (never stored in localStorage per security guidelines)
let inMemoryOtpSessionToken: string | null = null;

export function setOtpSessionToken(token: string | null) {
  inMemoryOtpSessionToken = token;
}

export function getOtpSessionToken(): string | null {
  return inMemoryOtpSessionToken;
}

export async function getBearerToken(): Promise<string | null> {
  if (inMemoryOtpSessionToken) {
    return inMemoryOtpSessionToken;
  }
  if (isSupabaseClientConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return data.session.access_token;
    }
  }
  const currentUser = auth.currentUser;
  if (currentUser) {
    return await currentUser.getIdToken();
  }
  return null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Automatic Supabase direct query delegation when VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY are configured
  if (isSupabaseClientConfigured && (!options.method || options.method === 'GET')) {
    if (path === '/api/service-categories') {
      const supaCategories = await fetchCategoriesFromSupabase();
      if (supaCategories) {
        return { categories: supaCategories } as unknown as T;
      }
    }
    if (path.startsWith('/api/technicians') && !path.startsWith('/api/technicians/')) {
      const queryPart = path.split('?')[1] || '';
      const sp = new URLSearchParams(queryPart);
      const supaTechs = await fetchApprovedTechniciansFromSupabase({
        lat: sp.get('lat') ? Number(sp.get('lat')) : undefined,
        lng: sp.get('lng') ? Number(sp.get('lng')) : undefined,
        deviceType: sp.get('deviceType') || undefined,
        search: sp.get('search') || undefined,
        availableOnly: sp.get('availableOnly') === 'true',
        withinRadiusOnly: sp.get('withinRadiusOnly') === 'true',
        sortBy: sp.get('sortBy') === 'experience' ? 'experience' : 'nearest',
      });
      if (supaTechs) {
        return { technicians: supaTechs } as unknown as T;
      }
    }
  }

  const token = await getBearerToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & {
      status?: number;
      data?: any;
    };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

/**
 * Uploads to Supabase Storage (`repair-media`) if configured, otherwise compresses into a lightweight Data URL (~30KB) for PostgreSQL storage.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 420,
  folder: 'profiles' | 'bookings' = 'profiles'
): Promise<string> {
  if (isSupabaseClientConfigured) {
    const publicUrl = await uploadImageToSupabaseStorage(file, folder);
    if (publicUrl) return publicUrl;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height >= width && height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not initialize image compressor.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.76));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
