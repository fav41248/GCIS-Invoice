import { createClient } from '@supabase/supabase-js';

const PRIMARY_SUPABASE_URL = 'https://oztkjwtocktrnkfdfrhk.supabase.co';
const PRIMARY_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dGtqd3RvY2t0cm5rZmRmcmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjUyODAsImV4cCI6MjEwODUwMTI4MH0.LJK89RWpzrc4B1gykEftp2gdJ0ztAvH8me3bBFYjz6s';

// Safely extract the project ref from a Supabase JWT (role=anon token)
function extractJwtRef(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) {
        b64 += '=';
      }
      const decodedStr = atob(b64);
      const payload = JSON.parse(decodedStr);
      return payload.ref || null;
    }
  } catch {
    // Non-fatal parsing error
  }
  return null;
}

// Safely extract the project ref from a Supabase URL (e.g. 'oztkjwtocktrnkfdfrhk')
function extractUrlRef(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    const match = hostname.match(/^([a-z0-9_-]+)\.supabase\./i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// 1. Resolve the target Supabase URL
let supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || PRIMARY_SUPABASE_URL;
if (!supabaseUrl || typeof supabaseUrl !== 'string' || !supabaseUrl.startsWith('http') || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
  supabaseUrl = PRIMARY_SUPABASE_URL;
}

// 2. Resolve the target Supabase Anon Key
let supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || PRIMARY_ANON_KEY;
if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
  supabaseAnonKey = PRIMARY_ANON_KEY;
}

// 3. Check for Project Ref Mismatch:
// If an environment variable injected an anon key from an old or different project (e.g. infbltkzxzcyhwhjdupk)
// while the app is pointing to oztkjwtocktrnkfdfrhk, the Supabase API Gateway rejects all calls with "Invalid API key".
const urlRef = extractUrlRef(supabaseUrl);
const keyRef = extractJwtRef(supabaseAnonKey);

if (urlRef && keyRef && urlRef !== keyRef) {
  // If the active URL is the primary project, use the verified primary anon key
  if (urlRef === 'oztkjwtocktrnkfdfrhk') {
    console.info('[Supabase] Detected mismatched anon key ref ("' + keyRef + '" vs "' + urlRef + '"). Using verified matching primary anon key.');
    supabaseAnonKey = PRIMARY_ANON_KEY;
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
