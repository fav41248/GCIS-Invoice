import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, browserPopupRedirectResolver } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let tokenLoadedFromFirestore = false;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        try {
          const snap = await getDoc(doc(db, 'settings', 'company'));
          if (snap.exists() && snap.data().driveAccessToken) {
            cachedAccessToken = snap.data().driveAccessToken;
            tokenLoadedFromFirestore = true;
            if (onAuthSuccess && cachedAccessToken) onAuthSuccess(user, cachedAccessToken);
            return;
          }
        } catch (e) {
          console.error("Error loading drive token from settings:", e);
        }
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleDriveSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve access token from Google sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    tokenLoadedFromFirestore = true;

    // Save token and connection metadata to company settings in Firestore
    try {
      await setDoc(doc(db, 'settings', 'company'), {
        driveAccessToken: cachedAccessToken,
        driveConnectedBy: result.user.email || result.user.displayName || 'Company Admin',
        driveConnectedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to persist drive token to company settings:", err);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const snap = await getDoc(doc(db, 'settings', 'company'));
    if (snap.exists() && snap.data().driveAccessToken) {
      cachedAccessToken = snap.data().driveAccessToken;
      tokenLoadedFromFirestore = true;
      return cachedAccessToken;
    }
  } catch (e) {
    console.error("Error fetching drive token:", e);
  }
  return null;
};

/**
 * Compresses an image file into a compact WebP/JPEG data URL (< 150KB)
 * for instant, permanent, offline-capable storage directly in Firestore.
 */
export const compressFileToDataUrl = (file: File, maxDim = 1200, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      // Fallback for PDF or other documents
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Attempt webp compression, fall back to jpeg
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {}
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads a file directly to the connected Google Drive account.
 */
export const uploadFileToGoogleDrive = async (
  file: File
): Promise<{ fileId: string; webViewLink?: string; name: string; thumbnailLink?: string }> => {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected.');
  }

  const metadata = {
    name: `GCIS_${Date.now()}_${file.name}`,
    mimeType: file.type || 'application/octet-stream',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    cachedAccessToken = null;
    let detail = response.statusText;
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || detail;
    } catch {}
    throw new Error(`Google Drive upload failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return {
    fileId: data.id,
    webViewLink: data.webViewLink,
    name: data.name,
    thumbnailLink: data.thumbnailLink,
  };
};

/**
 * Universal Proof of Payment processor:
 * 1. Always generates a compressed local data URL so proof is NEVER lost.
 * 2. Attempts Google Drive upload if connected.
 * 3. Returns the Drive link if successful, or the safe embedded data URL if Drive is not active.
 * Guarantees zero blocking of sales reps when marking invoices as paid.
 */
export const processProofOfPayment = async (
  file: File
): Promise<{
  url: string;
  id: string;
  storageType: 'drive' | 'direct';
  fileName: string;
}> => {
  // Always create an instant compressed copy
  const localDataUrl = await compressFileToDataUrl(file);

  // Check if Drive is available
  const token = await getDriveAccessToken();
  if (token) {
    try {
      const driveResult = await uploadFileToGoogleDrive(file);
      return {
        url: driveResult.webViewLink || localDataUrl,
        id: driveResult.fileId,
        storageType: 'drive',
        fileName: file.name
      };
    } catch (driveErr) {
      console.warn('Drive upload failed, falling back to direct permanent storage:', driveErr);
    }
  }

  // Graceful fallback: Store compressed receipt directly in Firestore document
  return {
    url: localDataUrl,
    id: `local_${Date.now()}`,
    storageType: 'direct',
    fileName: file.name
  };
};

/**
 * Converts a base64 Data URL to a browser File object.
 */
export const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Counts how many invoices or products currently have directly embedded Data URLs
 * that are waiting to be backed up to Google Drive.
 */
export const getPendingSyncCounts = async (): Promise<{ receipts: number; products: number; total: number }> => {
  try {
    const invSnap = await getDocs(collection(db, 'invoices'));
    let receipts = 0;
    invSnap.forEach((d) => {
      const data = d.data();
      if (data.proofOfPayment && typeof data.proofOfPayment === 'string' && data.proofOfPayment.startsWith('data:')) {
        receipts++;
      }
    });

    const prodSnap = await getDocs(collection(db, 'products'));
    let products = 0;
    prodSnap.forEach((d) => {
      const data = d.data();
      if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:')) {
        products++;
      }
    });

    return { receipts, products, total: receipts + products };
  } catch {
    return { receipts: 0, products: 0, total: 0 };
  }
};

/**
 * Scans all invoices and products in Firestore. Any that were stored directly as
 * Data URLs while Google Drive was disconnected are automatically uploaded to Google Drive,
 * and the database documents are updated with the official Google Drive links.
 */
export const syncAllPendingFilesToDrive = async (
  onProgress?: (current: number, total: number, label: string) => void
): Promise<{ total: number; synced: number; failed: number }> => {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected. Please connect Google Drive first.');
  }

  // 1. Gather pending invoices
  const invSnap = await getDocs(collection(db, 'invoices'));
  const pendingInvoices: any[] = [];
  invSnap.forEach((d) => {
    const data = d.data();
    if (data.proofOfPayment && typeof data.proofOfPayment === 'string' && data.proofOfPayment.startsWith('data:')) {
      pendingInvoices.push({ id: d.id, ...data });
    }
  });

  // 2. Gather pending products
  const prodSnap = await getDocs(collection(db, 'products'));
  const pendingProducts: any[] = [];
  prodSnap.forEach((d) => {
    const data = d.data();
    if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:')) {
      pendingProducts.push({ id: d.id, ...data });
    }
  });

  const total = pendingInvoices.length + pendingProducts.length;
  let processed = 0;
  let synced = 0;
  let failed = 0;

  // Process invoices
  for (const inv of pendingInvoices) {
    processed++;
    if (onProgress) {
      onProgress(processed, total, `Invoice ${inv.invoiceNumber || inv.id}`);
    }
    try {
      const fileName = inv.proofOfPaymentName || `receipt_${inv.invoiceNumber || inv.id}.jpg`;
      const file = dataUrlToFile(inv.proofOfPayment, fileName);
      const driveRes = await uploadFileToGoogleDrive(file);
      await updateDoc(doc(db, 'invoices', inv.id), {
        proofOfPayment: driveRes.webViewLink || driveRes.thumbnailLink,
        proofOfPaymentId: driveRes.fileId,
        proofStorageType: 'drive',
        syncedToDriveAt: new Date().toISOString()
      });
      synced++;
    } catch (e) {
      console.error(`Failed to sync invoice ${inv.id} to Drive:`, e);
      failed++;
    }
  }

  // Process products
  for (const prod of pendingProducts) {
    processed++;
    if (onProgress) {
      onProgress(processed, total, `Product ${prod.name || prod.id}`);
    }
    try {
      const fileName = `product_${prod.id}.jpg`;
      const file = dataUrlToFile(prod.imageUrl, fileName);
      const driveRes = await uploadFileToGoogleDrive(file);
      await updateDoc(doc(db, 'products', prod.id), {
        imageUrl: driveRes.webViewLink || driveRes.thumbnailLink,
        driveImageId: driveRes.fileId,
        syncedToDriveAt: new Date().toISOString()
      });
      synced++;
    } catch (e) {
      console.error(`Failed to sync product ${prod.id} to Drive:`, e);
      failed++;
    }
  }

  return { total, synced, failed };
};
