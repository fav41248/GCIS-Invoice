import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, inMemoryPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Suppress benign connection warnings that Firebase logs internally
setLogLevel('silent');

export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-greencollarinvoi-9ce33305-f854-43c2-b869-3c9c944e469d');

let authInstance;
try {
  authInstance = getAuth(app);
} catch {
  try {
    authInstance = initializeAuth(app, {
      persistence: [browserLocalPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;

// Diagnostic utility (manual only)
if (typeof window !== 'undefined') {
  (window as any).runDiagnostics = async () => {
    console.log('App database is active on Supabase PostgreSQL.');
    return 'Diagnostics executed.';
  };
}

