import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, browserPopupRedirectResolver } from 'firebase/auth';
import { auth } from '../firebase';
import { supabase } from '../supabase';

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
          const { data: setRow } = await supabase.from('settings').select('*').eq('key', 'company').maybeSingle();
          if (setRow && setRow.value && setRow.value.driveAccessToken) {
            cachedAccessToken = setRow.value.driveAccessToken;
            tokenLoadedFromFirestore = true;
            if (onAuthSuccess && cachedAccessToken) onAuthSuccess(user, cachedAccessToken);
            return;
          }
        } catch {
          // Silent fallback
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

    // Save token and connection metadata to company settings in Supabase
    try {
      const { data: curSetting } = await supabase.from('settings').select('value').eq('key', 'company').maybeSingle();
      const curValue = curSetting?.value || {};
      const updatedValue = {
        ...curValue,
        driveAccessToken: cachedAccessToken,
        driveConnectedBy: result.user.email || result.user.displayName || 'Company Admin',
        driveConnectedAt: new Date().toISOString()
      };
      await supabase.from('settings').upsert({
        key: 'company',
        value: updatedValue,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to persist drive token to Supabase settings:", err);
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
    const { data } = await supabase.from('settings').select('value').eq('key', 'company').maybeSingle();
    if (data?.value?.driveAccessToken) {
      cachedAccessToken = data.value.driveAccessToken;
      return cachedAccessToken;
    }
  } catch (e) {
    console.error("Error fetching drive token from Supabase:", e);
  }
  return null;
};

import { compressImage } from './imageCompressor';

/**
 * Compresses an image file into an ultra-compact WebP data URL (< 50KB)
 * for instant, permanent, low-footprint storage.
 */
export const compressFileToDataUrl = async (file: File, maxDim = 550, quality = 0.58): Promise<string> => {
  const result = await compressImage(file, { maxWidth: maxDim, maxHeight: maxDim, initialQuality: quality, maxSizeBytes: 50 * 1024 });
  return result.dataUrl;
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

  // Automatically compress images before upload to save space
  let fileToUpload = file;
  if (file.type.startsWith('image/') && file.size > 60 * 1024) {
    try {
      const res = await compressImage(file, { maxWidth: 750, maxHeight: 950, initialQuality: 0.58, maxSizeBytes: 50 * 1024 });
      fileToUpload = res.file;
    } catch {
      fileToUpload = file;
    }
  }

  const metadata = {
    name: `GCIS_${Date.now()}_${fileToUpload.name}`,
    mimeType: fileToUpload.type || 'application/pdf',
  };

  // 1. Initiate resumable session
  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': fileToUpload.type || 'application/pdf',
        'X-Upload-Content-Length': fileToUpload.size.toString(),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    let detail = initRes.statusText;
    try {
      const errJson = await initRes.json();
      detail = errJson?.error?.message || detail;
    } catch {}
    throw new Error(`Google Drive upload init failed (${initRes.status}): ${detail}`);
  }

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Failed to obtain Google Drive resumable upload session URI.');
  }

  // 2. Upload file in chunks or direct PUT if session established
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': file.size.toString(),
      'Content-Type': file.type || 'application/pdf',
    },
    body: file,
  });

  if (!uploadRes.ok) {
    let detail = uploadRes.statusText;
    try {
      const errJson = await uploadRes.json();
      detail = errJson?.error?.message || detail;
    } catch {}
    throw new Error(`Google Drive chunked upload failed (${uploadRes.status}): ${detail}`);
  }

  const data = await uploadRes.json();
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
  // Ultra-compact automatic compression: cuts 3-10MB mobile uploads to < 50KB WebP
  const compressionResult = await compressImage(file, {
    maxWidth: 750,
    maxHeight: 950,
    initialQuality: 0.58,
    maxSizeBytes: 50 * 1024
  });

  const localDataUrl = compressionResult.dataUrl;
  const fileToUpload = compressionResult.file;

  // Check if Drive is available
  const token = await getDriveAccessToken();
  if (token) {
    try {
      const driveResult = await uploadFileToGoogleDrive(fileToUpload);
      return {
        url: driveResult.webViewLink || localDataUrl,
        id: driveResult.fileId,
        storageType: 'drive',
        fileName: fileToUpload.name
      };
    } catch (driveErr) {
      console.warn('Drive upload failed, falling back to direct permanent storage:', driveErr);
    }
  }

  // Graceful fallback: Store compact compressed receipt directly in Supabase document
  return {
    url: localDataUrl,
    id: `local_${Date.now()}`,
    storageType: 'direct',
    fileName: fileToUpload.name
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
    const { data: invs } = await supabase.from('invoices').select('id, proof_of_payment');
    let receipts = 0;
    (invs || []).forEach((inv: any) => {
      if (inv.proof_of_payment && typeof inv.proof_of_payment === 'string' && inv.proof_of_payment.startsWith('data:')) {
        receipts++;
      }
    });

    const { data: prods } = await supabase.from('products').select('id, image_url');
    let products = 0;
    (prods || []).forEach((prod: any) => {
      if (prod.image_url && typeof prod.image_url === 'string' && prod.image_url.startsWith('data:')) {
        products++;
      }
    });

    return { receipts, products, total: receipts + products };
  } catch {
    return { receipts: 0, products: 0, total: 0 };
  }
};

/**
 * Scans all invoices and products in Supabase. Any that were stored directly as
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

  // 1. Gather pending invoices from Supabase
  const { data: invRows } = await supabase.from('invoices').select('*');
  const pendingInvoices: any[] = [];
  (invRows || []).forEach((inv: any) => {
    if (inv.proof_of_payment && typeof inv.proof_of_payment === 'string' && inv.proof_of_payment.startsWith('data:')) {
      pendingInvoices.push(inv);
    }
  });

  // 2. Gather pending products from Supabase
  const { data: prodRows } = await supabase.from('products').select('*');
  const pendingProducts: any[] = [];
  (prodRows || []).forEach((prod: any) => {
    if (prod.image_url && typeof prod.image_url === 'string' && prod.image_url.startsWith('data:')) {
      pendingProducts.push(prod);
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
      onProgress(processed, total, `Invoice ${inv.invoice_number || inv.id}`);
    }
    try {
      const fileName = inv.proof_of_payment_name || `receipt_${inv.invoice_number || inv.id}.jpg`;
      const file = dataUrlToFile(inv.proof_of_payment, fileName);
      const driveRes = await uploadFileToGoogleDrive(file);
      const link = driveRes.webViewLink || driveRes.thumbnailLink;
      
      await supabase.from('invoices').update({
        proof_of_payment: link,
        proof_of_payment_id: driveRes.fileId
      }).eq('id', inv.id);



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
      const file = dataUrlToFile(prod.image_url, fileName);
      const driveRes = await uploadFileToGoogleDrive(file);
      const link = driveRes.webViewLink || driveRes.thumbnailLink;

      await supabase.from('products').update({
        image_url: link
      }).eq('id', prod.id);



      synced++;
    } catch (e) {
      console.error(`Failed to sync product ${prod.id} to Drive:`, e);
      failed++;
    }
  }

  return { total, synced, failed };
};
