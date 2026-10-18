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

// Diagnostic utility function requested by user
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

if (typeof window !== 'undefined') {
  (window as any).runFirestoreDiagnostics = async () => {
    console.log('--- STARTING FIRESTORE DIAGNOSTICS ---');
    const collectionsToCheck = ['invoices', 'clients', 'products', 'users'];
    for (const colName of collectionsToCheck) {
      try {
        const querySnapshot = await getDocs(collection(db, colName));
        const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log(`Collection [${colName}] (${docs.length} documents):`, docs);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.toLowerCase().includes('offline') || msg.toLowerCase().includes('unavailable')) {
          console.warn(`Collection [${colName}] fetch note (offline/transient):`, msg);
        } else {
          console.error(`Error fetching collection [${colName}]:`, err);
        }
      }
    }
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'company'));
      console.log('Document [settings/company]:', settingsSnap.exists() ? settingsSnap.data() : 'Does not exist');
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('offline') || msg.toLowerCase().includes('unavailable')) {
        console.warn('Document [settings/company] fetch note (offline/transient):', msg);
      } else {
        console.error('Error fetching [settings/company]:', err);
      }
    }
    console.log('--- FIRESTORE DIAGNOSTICS COMPLETE ---');
    return 'Diagnostics executed. Check console output above.';
  };

  // Automatically run diagnostics once on load for easy debugging
  setTimeout(() => {
    (window as any).runFirestoreDiagnostics().catch((e: any) => console.warn('Diagnostic auto-run note:', e));
  }, 1000);
}

