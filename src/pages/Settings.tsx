import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import { googleDriveSignIn, uploadFileToGoogleDrive, syncAllPendingFilesToDrive, getPendingSyncCounts } from '../lib/drive';
import toast from 'react-hot-toast';
import { Save, Plus, Trash2, Download, Database, HardDrive, CheckCircle2, ShieldCheck, RefreshCw, XCircle, UploadCloud } from 'lucide-react';
import Papa from 'papaparse';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [testingDrive, setTestingDrive] = useState(false);
  const [syncingFiles, setSyncingFiles] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState<{ receipts: number; products: number; total: number }>({ receipts: 0, products: 0, total: 0 });
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveConnectedBy, setDriveConnectedBy] = useState('');
  const [driveConnectedAt, setDriveConnectedAt] = useState('');
  
  const [paymentAccounts, setPaymentAccounts] = useState<{id: string, bankName: string, accountName: string, accountNumber: string}[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'company');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setAddress(data.address || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setLogoUrl(data.logoUrl || '');
          setPaymentAccounts(data.paymentAccounts || []);
          if (data.driveAccessToken) {
            setDriveConnected(true);
            setDriveConnectedBy(data.driveConnectedBy || 'Admin');
            setDriveConnectedAt(data.driveConnectedAt || '');
          }
        } else {
          setName('Green Collar Integrated Services');
          setAddress('12 Industrial Way, Ikeja\nLagos, Nigeria');
          setEmail('finance@gcis.com');
        }
      } catch (error) {
        if (!handleFirestoreError(error, OperationType.GET, 'settings/company')) {
          setName('Green Collar Integrated Services');
          setAddress('12 Industrial Way, Ikeja\nLagos, Nigeria');
          setEmail('finance@gcis.com');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
    loadPendingCounts();
  }, []);

  const loadPendingCounts = async () => {
    try {
      const counts = await getPendingSyncCounts();
      setPendingSync(counts);
      return counts;
    } catch {
      return { receipts: 0, products: 0, total: 0 };
    }
  };

  const handleSyncFiles = async () => {
    setSyncingFiles(true);
    setSyncProgress('Scanning database for files to backup...');
    try {
      const result = await syncAllPendingFilesToDrive((current, total, label) => {
        setSyncProgress(`Backing up ${current} of ${total}: ${label}...`);
      });
      if (result.total === 0) {
        toast.success('All files are already backed up to Google Drive!');
      } else {
        toast.success(`Successfully backed up ${result.synced} file(s) to Google Drive!`);
      }
      await loadPendingCounts();
    } catch (err: any) {
      toast.error('Sync failed: ' + (err.message || 'Error'));
    } finally {
      setSyncingFiles(false);
      setSyncProgress(null);
    }
  };

  const handleConnectDrive = async () => {
    setConnectingDrive(true);
    try {
      const res = await googleDriveSignIn();
      if (res) {
        setDriveConnected(true);
        setDriveConnectedBy(res.user.email || res.user.displayName || 'Company Admin');
        setDriveConnectedAt(new Date().toISOString());
        toast.success('Company Google Drive connected successfully!');
        
        // Check if there are any files stored in the database while offline and automatically backup to Drive
        const counts = await loadPendingCounts();
        if (counts.total > 0) {
          toast('Automatically backing up ' + counts.total + ' pending file(s) to Google Drive...', { icon: '🔄' });
          handleSyncFiles();
        }
      }
    } catch (error: any) {
      const code = error?.code || '';
      let msg = error?.message || String(error);
      if (code === 'auth/popup-closed-by-user') {
        msg = 'Sign-in popup was closed before completing authorization.';
      } else if (code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      }
      toast.error('Failed to connect Google Drive: ' + msg);
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleTestDrive = async () => {
    setTestingDrive(true);
    try {
      const pingBlob = new Blob(['GCIS drive connection verified at ' + new Date().toISOString()], { type: 'text/plain' });
      const pingFile = new File([pingBlob], 'connection_test.txt', { type: 'text/plain' });
      const res = await uploadFileToGoogleDrive(pingFile);
      if (res?.fileId) {
        toast.success('Google Drive connection verified & working smoothly!');
      } else {
        toast.error('Could not verify Drive upload.');
      }
    } catch (e: any) {
      toast.error('Google Drive token expired or unavailable. Click "Reconnect Google Drive" to renew.');
    } finally {
      setTestingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!confirm('Disconnect Company Google Drive? Dual-storage direct storage will continue to safely protect all payment proofs.')) return;
    try {
      await updateDoc(doc(db, 'settings', 'company'), {
        driveAccessToken: '',
        driveConnectedBy: '',
        driveConnectedAt: ''
      });
      setDriveConnected(false);
      setDriveConnectedBy('');
      setDriveConnectedAt('');
      toast.success('Company Google Drive disconnected.');
    } catch (err: any) {
      toast.error('Failed to disconnect: ' + (err.message || 'Error'));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'company'), {
        name, address, email, phone, logoUrl, paymentAccounts
      }, { merge: true });
      toast.success('Settings saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/company');
    } finally {
      setSaving(false);
    }
  };

  const addAccount = () => {
    if (paymentAccounts.length >= 10) return;
    setPaymentAccounts([...paymentAccounts, { id: Date.now().toString(), bankName: '', accountName: '', accountNumber: '' }]);
  };

  const removeAccount = (id: string) => {
    setPaymentAccounts(paymentAccounts.filter(a => a.id !== id));
  };

  const updateAccount = (id: string, field: string, value: string) => {
    setPaymentAccounts(paymentAccounts.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const exportData = async (collectionName: string) => {
    setExporting(collectionName);
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (data.length === 0) {
        toast.error(`No data found in ${collectionName}.`);
        return;
      }

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${collectionName}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${collectionName} successfully.`);
    } catch (error: any) {
      toast.error(`Error exporting ${collectionName}: ` + error.message);
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-500 font-bold">You must be an administrator to view this page.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Company Settings</h1>
      
      <div className="space-y-8">
        {/* Company Google Drive Connection */}
        <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
              <HardDrive className="w-5 h-5 text-blue-600" /> Company Google Drive Storage
            </h2>
            {driveConnected ? (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Connected & Active
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold">
                Not Connected (Direct Storage Active)
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Connect the company Google Drive account once to archive sales reps' payment receipts and product photos to Google Drive.
          </p>

          {/* Dual Storage Guarantee Banner */}
          <div className="mb-5 p-3.5 bg-blue-50/60 border border-blue-200 rounded-md flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-semibold block text-blue-950 mb-0.5">Dual-Storage Protection Active</span>
              Payment proofs are automatically compressed and saved directly to your cloud database so sales reps can <strong>always confirm invoice payments with zero disruption</strong>, even if the Google Drive connection is pending re-authorization.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleConnectDrive}
              disabled={connectingDrive}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <HardDrive className="w-4 h-4" />
              {connectingDrive ? 'Connecting...' : driveConnected ? 'Reconnect / Refresh Google Drive' : 'Connect Company Google Drive'}
            </button>

            {driveConnected && (
              <>
                <button
                  type="button"
                  onClick={handleTestDrive}
                  disabled={testingDrive}
                  className="bg-gray-100 text-gray-700 border border-gray-300 px-3.5 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingDrive ? 'animate-spin' : ''}`} />
                  {testingDrive ? 'Testing...' : 'Test Connection'}
                </button>

                <button
                  type="button"
                  onClick={handleDisconnectDrive}
                  className="text-red-600 hover:text-red-800 text-xs font-semibold px-2 py-1.5 rounded hover:bg-red-50 transition-colors"
                >
                  Disconnect
                </button>
              </>
            )}
          </div>

          {/* Pending Sync Card */}
          {pendingSync.total > 0 && (
            <div className="mt-4 p-3.5 bg-amber-50/80 border border-amber-200 rounded-md flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-amber-900">
                <span className="font-bold text-amber-950 block">{pendingSync.total} file(s) waiting for Google Drive backup</span>
                <span>{pendingSync.receipts} payment receipt(s) &amp; {pendingSync.products} product image(s) saved directly in cloud database.</span>
              </div>
              <button
                type="button"
                onClick={handleSyncFiles}
                disabled={syncingFiles || !driveConnected}
                className="bg-amber-600 text-white text-xs px-3.5 py-2 rounded-md font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <UploadCloud className={`w-4 h-4 ${syncingFiles ? 'animate-bounce' : ''}`} />
                {syncingFiles ? 'Backing up to Drive...' : 'Backup All to Google Drive'}
              </button>
            </div>
          )}

          {syncProgress && (
            <div className="mt-2 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{syncProgress}</span>
            </div>
          )}

          {driveConnected && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 flex flex-wrap gap-4">
              <span>Account: <strong className="text-gray-900">{driveConnectedBy}</strong></span>
              {driveConnectedAt && (
                <span>Connected: <strong className="text-gray-900">{new Date(driveConnectedAt).toLocaleDateString()} at {new Date(driveConnectedAt).toLocaleTimeString()}</strong></span>
              )}
              {pendingSync.total === 0 && (
                <span className="text-emerald-700 font-medium">✓ All files backed up to Google Drive</span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold mb-1 border-b pb-2">Database Backup &amp; Export</h2>
          <p className="text-sm text-gray-500 mb-4">Export individual records as CSV or download a <strong>complete database backup JSON</strong> containing all invoices, clients, products, users, settings, and audit logs.</p>
          
          <div className="mb-4">
            <button
              type="button"
              onClick={async () => {
                setExporting('complete_json');
                try {
                  const [invSnap, clientSnap, prodSnap, userSnap, auditSnap, setSnap] = await Promise.all([
                    getDocs(collection(db, 'invoices')),
                    getDocs(collection(db, 'clients')),
                    getDocs(collection(db, 'products')),
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'weekly_audits')),
                    getDoc(doc(db, 'settings', 'company'))
                  ]);

                  const backupData = {
                    version: '1.0',
                    exportedAt: new Date().toISOString(),
                    databaseId: 'ai-studio-greencollarinvoi-9ce33305-f854-43c2-b869-3c9c944e469d',
                    invoices: invSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    clients: clientSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    products: prodSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    users: userSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    weeklyAudits: auditSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    companySettings: setSnap.exists() ? setSnap.data() : null
                  };

                  const jsonStr = JSON.stringify(backupData, null, 2);
                  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `GCIS_Complete_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast.success('Complete database backup JSON downloaded successfully!');
                } catch (err: any) {
                  toast.error('Export failed: ' + (err.message || 'Error'));
                } finally {
                  setExporting(null);
                }
              }}
              disabled={exporting !== null}
              className="w-full bg-[#0F5132] text-white py-3 px-4 rounded-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#198754] transition-colors shadow-sm disabled:opacity-50"
            >
              <Database className="w-5 h-5" />
              {exporting === 'complete_json' ? 'Generating Complete Backup...' : 'Download Complete Database Backup (JSON)'}
            </button>
          </div>

          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase self-center mr-2">Quick CSV Exports:</span>
            <button 
              type="button" 
              onClick={() => exportData('invoices')}
              disabled={exporting !== null}
              className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting === 'invoices' ? 'Exporting...' : 'Invoices CSV'}
            </button>
            <button 
              type="button" 
              onClick={() => exportData('clients')}
              disabled={exporting !== null}
              className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting === 'clients' ? 'Exporting...' : 'Clients CSV'}
            </button>
            <button 
              type="button" 
              onClick={() => exportData('users')}
              disabled={exporting !== null}
              className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting === 'users' ? 'Exporting...' : 'Sales Team CSV'}
            </button>
            <button 
              type="button" 
              onClick={() => exportData('products')}
              disabled={exporting !== null}
              className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting === 'products' ? 'Exporting...' : 'Products CSV'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">Business Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company Name *</label>
                <input required type="text" className="w-full border rounded p-2 text-sm" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Office Address *</label>
                <textarea required className="w-full border rounded p-2 text-sm h-20 resize-none" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Email</label>
                <input type="email" className="w-full border rounded p-2 text-sm" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input type="text" className="w-full border rounded p-2 text-sm" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Logo URL</label>
                <input type="text" className="w-full border rounded p-2 text-sm" placeholder="https://example.com/logo.png" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Provide a direct URL to your company logo to display on invoices.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-2 border-b pb-2">
              <h2 className="text-lg font-bold">Payment Accounts</h2>
              <button type="button" onClick={addAccount} className="text-sm bg-gray-100 px-3 py-1 flex items-center gap-1 rounded hover:bg-gray-200 font-semibold">
                <Plus className="w-4 h-4" /> Add Account
              </button>
            </div>

            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 leading-relaxed">
              <strong className="block text-emerald-950 mb-0.5">Automated Static Account Policy Active:</strong>
              • <strong>Sales Reps:</strong> Moniepoint account ending with 419 and First Monie are automatically locked to invoices generated by Sales Reps.<br/>
              • <strong>Sales Agents:</strong> Moniepoint account ending with 517 and Stanbic IBTC Bank are automatically locked to invoices generated by Sales Agents.<br/>
              Sales Reps and Sales Agents do not need to manually select bank accounts — they are added statically by default.
            </div>
            
            <div className="space-y-4">
              {paymentAccounts.map((account, index) => {
                const num = String(account.accountNumber || '').trim();
                const bank = String(account.bankName || '').toLowerCase();
                const isRep419 = bank.includes('moniepoint') && num.endsWith('419');
                const isRepFirstMonie = bank.includes('first monie') || bank.includes('firstmonie');
                const isAgent517 = bank.includes('moniepoint') && num.endsWith('517');
                const isAgentStanbic = bank.includes('stanbic') || bank.includes('stabic');

                return (
                  <div key={account.id} className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-md border border-gray-100 relative">
                    <div className="col-span-12 flex items-center justify-between pb-1 mb-1 border-b border-gray-200/60">
                      <span className="text-xs font-bold text-gray-500 uppercase">Account #{index + 1}</span>
                      <div className="flex items-center gap-1.5">
                        {(isRep419 || isRepFirstMonie) && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                            ✓ Sales Rep Default ({isRep419 ? 'Moniepoint ...419' : 'First Monie'})
                          </span>
                        )}
                        {(isAgent517 || isAgentStanbic) && (
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                            ✓ Sales Agent Default ({isAgent517 ? 'Moniepoint ...517' : 'Stanbic IBTC'})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-4">
                       <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                       <input required type="text" className="w-full border rounded p-2 text-sm bg-white" value={account.bankName} onChange={e => updateAccount(account.id, 'bankName', e.target.value)} placeholder="e.g. GTBank" />
                    </div>
                    <div className="col-span-4">
                       <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Account Name</label>
                       <input required type="text" className="w-full border rounded p-2 text-sm bg-white" value={account.accountName} onChange={e => updateAccount(account.id, 'accountName', e.target.value)} placeholder="Company Ltd" />
                    </div>
                    <div className="col-span-3">
                       <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Account Number</label>
                       <input required type="text" className="w-full border rounded p-2 text-sm font-mono bg-white" value={account.accountNumber} onChange={e => updateAccount(account.id, 'accountNumber', e.target.value)} placeholder="0123456789" />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button type="button" onClick={() => removeAccount(account.id)} className="text-red-500 hover:text-red-700 p-2" title="Remove account">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {paymentAccounts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No payment accounts added yet. Click 'Add Account' to add bank transfer details for invoices.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
