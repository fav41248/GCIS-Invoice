import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import { Save, Plus, Trash2, Download, Database } from 'lucide-react';
import Papa from 'papaparse';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
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
        } else {
          setName('Green Collar Integrated Services');
          setAddress('12 Industrial Way, Ikeja\nLagos, Nigeria');
          setEmail('finance@gcis.com');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/company');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'company'), {
        name, address, email, phone, logoUrl, paymentAccounts
      });
      alert('Settings saved successfully!');
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
        alert(`No data found in ${collectionName}.`);
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
    } catch (error: any) {
      alert(`Error exporting ${collectionName}: ` + error.message);
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
      
      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">Database Backup & Export</h2>
          <p className="text-sm text-gray-500 mb-4">Export your application data as CSV files for backup or analysis.</p>
          <div className="flex flex-wrap gap-4">
            <button 
              type="button" 
              onClick={() => exportData('invoices')}
              disabled={exporting !== null}
              className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting === 'invoices' ? 'Exporting...' : 'Export Invoices'}
            </button>
            <button 
              type="button" 
              onClick={() => exportData('clients')}
              disabled={exporting !== null}
              className="bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting === 'clients' ? 'Exporting...' : 'Export Clients'}
            </button>
            <button 
              type="button" 
              onClick={() => exportData('users')}
              disabled={exporting !== null}
              className="bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting === 'users' ? 'Exporting...' : 'Export Sales Reps'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
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

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-lg font-bold">Payment Accounts</h2>
            <button type="button" onClick={addAccount} className="text-sm bg-gray-100 px-3 py-1 flex items-center gap-1 rounded hover:bg-gray-200">
              <Plus className="w-4 h-4" /> Add Account
            </button>
          </div>
          
          <div className="space-y-4">
            {paymentAccounts.map((account, index) => (
              <div key={account.id} className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="col-span-4">
                   <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                   <input required type="text" className="w-full border rounded p-2 text-sm" value={account.bankName} onChange={e => updateAccount(account.id, 'bankName', e.target.value)} placeholder="e.g. GTBank" />
                </div>
                <div className="col-span-4">
                   <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Account Name</label>
                   <input required type="text" className="w-full border rounded p-2 text-sm" value={account.accountName} onChange={e => updateAccount(account.id, 'accountName', e.target.value)} placeholder="Company Ltd" />
                </div>
                <div className="col-span-3">
                   <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Account Number</label>
                   <input required type="text" className="w-full border rounded p-2 text-sm font-mono" value={account.accountNumber} onChange={e => updateAccount(account.id, 'accountNumber', e.target.value)} placeholder="0123456789" />
                </div>
                <div className="col-span-1 flex justify-end pb-1">
                  <button type="button" onClick={() => removeAccount(account.id)} className="text-red-500 p-2 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {paymentAccounts.length === 0 && (
              <p className="text-sm text-gray-500 italic">No payment accounts configured. Sales reps won't have predefined options.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="bg-[#0F5132] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#198754] flex items-center gap-2">
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
