import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Edit2, Save, X, FileText, Calendar, ExternalLink, ShieldCheck } from 'lucide-react';

export default function Users() {
  const { isAdmin, isAuditor } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [pricingTier, setPricingTier] = useState('bronze');
  const [newRole, setNewRole] = useState<'sales_agent' | 'sales_rep' | 'auditor' | 'store_keeper'>('sales_agent');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', username: '', pin: '', phone: '', pricingTier: 'bronze', role: 'sales_agent' });
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  const [selectedUserForReport, setSelectedUserForReport] = useState<any>(null);
  const [userInvoices, setUserInvoices] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [viewingProof, setViewingProof] = useState<any>(null);

  const startEdit = (user: any) => {
    setEditingId(user.id);
    const initialRole = user.role === 'sales_rep' ? 'sales_rep' : user.role === 'sales' ? 'sales_agent' : (user.role || 'sales_agent');
    setEditData({ 
      name: user.name, 
      username: user.username, 
      pin: user.pin || '', 
      phone: user.phone || '', 
      pricingTier: user.pricingTier || 'bronze', 
      role: initialRole 
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string, user: any) => {
    try {
      const normalizedUsername = editData.username.toLowerCase().trim();
      if (!normalizedUsername) {
        toast.error('Username cannot be empty');
        return;
      }
      
      const isRep = editData.role === 'sales_rep';
      const effectiveTier = isRep ? null : (editData.pricingTier || 'bronze');

      if (normalizedUsername !== id) {
        const existingSnap = await getDoc(doc(db, 'users', normalizedUsername));
        if (existingSnap.exists()) {
          toast.error('A user with that username already exists.');
          return;
        }
        const { id: _oldId, ...userDataToKeep } = user;
        await setDoc(doc(db, 'users', normalizedUsername), {
          ...userDataToKeep,
          name: editData.name,
          username: normalizedUsername,
          pin: editData.pin,
          phone: editData.phone,
          pricingTier: effectiveTier,
          role: editData.role,
        });
        await deleteDoc(doc(db, 'users', id));
      } else {
        await updateDoc(doc(db, 'users', id), {
          name: editData.name,
          username: normalizedUsername,
          pin: editData.pin,
          phone: editData.phone,
          pricingTier: effectiveTier,
          role: editData.role
        });
      }
      toast.success(`User updated to ${editData.role === 'sales_rep' ? 'Sales Rep (Salaried Staff)' : editData.role === 'sales_agent' ? 'Sales Agent (' + effectiveTier?.toUpperCase() + ' Package)' : editData.role}`);
      setEditingId(null);
    } catch (err: any) {
      toast.error('Failed to update user: ' + (err.message || 'Error'));
    }
  };

  const openReportModal = async (user: any) => {
    setSelectedUserForReport(user);
    setShowReportModal(true);
    setLoadingReport(true);
    try {
      const q = query(collection(db, 'invoices'), where('createdBy', '==', user.username));
      const querySnapshot = await getDocs(q);
      const invoicesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      invoicesData.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setUserInvoices(invoicesData);
    } catch (error) {
      if (!handleFirestoreError(error, OperationType.LIST, 'invoices')) toast.error('Failed to load user invoices');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && !isAuditor) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter out admins for auditors, showing sales team and other auditors
      if (isAuditor && !isAdmin) {
        data = data.filter(u => u.role !== 'admin');
      }
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return unsubscribe;
  }, [isAdmin, isAuditor]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsCreating(true);
    setError('');

    try {
      const normalizedUsername = username.toLowerCase().trim();
      if (!normalizedUsername) {
        setError('Please provide a valid username.');
        setIsCreating(false);
        return;
      }

      const existingSnap = await getDoc(doc(db, 'users', normalizedUsername));
      if (existingSnap.exists()) {
        setError('A user with this username already exists.');
        setIsCreating(false);
        return;
      }
      
      const isRep = newRole === 'sales_rep';
      const effectiveTier = isRep ? null : (pricingTier || 'bronze');

      await setDoc(doc(db, 'users', normalizedUsername), {
        name, 
        username: normalizedUsername,
        role: newRole,
        pin: pin,
        phone: phone,
        pricingTier: effectiveTier,
        createdAt: new Date().toISOString()
      });
      
      const roleLabel = newRole === 'sales_agent' 
        ? `Sales Agent (${effectiveTier?.toUpperCase()} Package)` 
        : newRole === 'sales_rep' 
        ? 'Sales Rep (Salaried Staff)' 
        : 'Auditor';

      toast.success(`${roleLabel} added successfully! Only Admins can modify user roles.`);
      setShowAdd(false);
      setName(''); setUsername(''); setPin(''); setPhone(''); setPricingTier('bronze'); setNewRole('sales_agent');
    } catch (err: any) {
      setError(err.message || 'Failed to authorize user.');
    } finally {
      setIsCreating(false);
    }
  };

  // Filter user invoices by selected month (YYYY-MM)
  const filteredMonthInvoices = userInvoices.filter(inv => {
    if (!selectedMonth) return true;
    const invDate = inv.issueDate || (inv.createdAt ? inv.createdAt.slice(0, 10) : '');
    return invDate.startsWith(selectedMonth);
  });

  if (!isAdmin && !isAuditor) return <div className="p-8 text-red-500">Access Denied.</div>;
  if (loading) return <div className="p-8">Loading sales team...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0F5132]" />
            {isAuditor && !isAdmin ? 'Auditor Dashboard: Team & Invoices Audit' : 'Sales Team Management'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/audit"
            className="bg-emerald-50 text-[#0F5132] border border-emerald-300 hover:bg-emerald-100 px-4 py-2 rounded-md font-bold text-sm shadow-xs transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4 text-[#0F5132]" />
            Weekly Audit &amp; Payouts
          </Link>
          {isAdmin && (
            <button 
              onClick={() => setShowAdd(!showAdd)}
              className="bg-[#0F5132] text-white px-4 py-2 rounded-md font-medium hover:bg-[#198754] shadow-sm transition-colors whitespace-nowrap"
            >
              {showAdd ? 'Cancel' : '+ Add New Member'}
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-gray-900">Create New User Account</h2>
            <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-bold border border-purple-200">
              Admin Privilege Only
            </span>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm border border-red-100 rounded-md">{error}</div>}
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
              <input required type="text" placeholder="e.g. Adeola Johnson" className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-[#0F5132] outline-none" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username *</label>
              <input required type="text" placeholder="adeola" className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-[#0F5132] outline-none" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN / Password (Min 4 digits) *</label>
              <input required type="text" minLength={4} placeholder="1234" className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-[#0F5132] outline-none" value={pin} onChange={e => setPin(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
              <input type="text" placeholder="08012345678" className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-[#0F5132] outline-none" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">User Category / Role *</label>
              <select 
                className="w-full border rounded p-2 text-sm bg-white font-medium focus:ring-2 focus:ring-[#0F5132] outline-none" 
                value={newRole} 
                onChange={e => setNewRole(e.target.value as any)}
              >
                <option value="sales_agent">Sales Agent (Commission + Bronze/Silver/Gold Packages)</option>
                <option value="sales_rep">Sales Rep (Salaried Staff — Unit Price Only)</option>
                <option value="store_keeper">Store Keeper (Edit Price List, Upload Products &amp; Knowledge Bank)</option>
                <option value="auditor">Auditor (Weekly Audit &amp; Invoice Clearance)</option>
              </select>
            </div>
            
            {newRole === 'sales_agent' ? (
              <div>
                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Package Tier *</label>
                <select 
                  className="w-full border border-blue-300 rounded p-2 text-sm bg-blue-50/50 font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={pricingTier} 
                  onChange={e => setPricingTier(e.target.value)}
                >
                  <option value="bronze">Bronze Package (Standard Wholesale Margin)</option>
                  <option value="silver">Silver Package (Premium Wholesale Margin)</option>
                  <option value="gold">Gold Package (VIP Wholesale Margin)</option>
                </select>
                <p className="text-[11px] text-blue-700 mt-1">
                  ✓ Sales Agents have access to packages (Bronze, Silver, Gold) and earn commission payouts.
                </p>
              </div>
            ) : newRole === 'sales_rep' ? (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-md">
                <span className="text-xs font-bold text-emerald-900 block mb-0.5">Salaried Staff (Unit Price Only)</span>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  Sales Reps are staff paid salaries. They see only retail Unit Prices. Wholesale prices and Bronze/Silver/Gold packages are hidden, and no commission is generated.
                </p>
              </div>
            ) : newRole === 'store_keeper' ? (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                <span className="text-xs font-bold text-amber-900 block mb-0.5">Store Keeper Role</span>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Can edit the Price List, upload new products, and manage the Knowledge Bank. Restricted from creating invoices or accessing financial audits and commission payouts.
                </p>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-md">
                <span className="text-xs font-bold text-indigo-900 block mb-0.5">Auditor Role</span>
                <p className="text-[11px] text-indigo-800 leading-snug">
                  Inspects weekly invoices against proofs of payment and marks weeks as cleared for payout.
                </p>
              </div>
            )}

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button disabled={isCreating} type="submit" className="bg-[#0F5132] text-white px-6 py-2 rounded font-medium shadow-sm hover:bg-[#198754] transition-colors">
                {isCreating ? 'Creating...' : `Create ${newRole === 'sales_agent' ? 'Sales Agent' : newRole === 'sales_rep' ? 'Sales Rep' : newRole === 'store_keeper' ? 'Store Keeper' : 'Auditor'}`}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[750px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">Member Name</th>
              <th className="px-6 py-4 font-bold text-gray-600">Username</th>
              {isAdmin && <th className="px-6 py-4 font-bold text-gray-600">PIN</th>}
              {isAdmin && <th className="px-6 py-4 font-bold text-gray-600">Phone</th>}
              <th className="px-6 py-4 font-bold text-gray-600">Package Tier</th>
              <th className="px-6 py-4 font-bold text-gray-600">User Category</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-right">Audit Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => {
              const isRep = u.role === 'sales_rep';
              const isAgent = u.role === 'sales_agent' || (u.role === 'sales' && !isRep);
              const isAud = u.role === 'auditor';
              const isAdm = u.role === 'admin';

              return (
                <tr key={u.id} className="hover:bg-emerald-50/40 transition-colors cursor-pointer" onClick={() => openReportModal(u)}>
                  {editingId === u.id ? (
                    <>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} />
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.pin} onChange={e => setEditData({...editData, pin: e.target.value})} />
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {editData.role === 'sales_agent' ? (
                          <select className="w-full border border-blue-300 rounded p-1.5 text-sm bg-blue-50 font-bold" value={editData.pricingTier} onChange={e => setEditData({...editData, pricingTier: e.target.value})}>
                            <option value="bronze">Bronze Package</option>
                            <option value="silver">Silver Package</option>
                            <option value="gold">Gold Package</option>
                          </select>
                        ) : editData.role === 'sales_rep' ? (
                          <span className="text-xs text-gray-500 font-medium">Salaried Staff (Unit Price Only)</span>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <select className="w-full border border-gray-300 rounded p-1.5 text-sm font-semibold" value={editData.role} onChange={e => setEditData({...editData, role: e.target.value as any})}>
                          <option value="sales_agent">Sales Agent (Commission + Packages)</option>
                          <option value="sales_rep">Sales Rep (Salaried Staff - Unit Price Only)</option>
                          <option value="auditor">Auditor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => saveEdit(u.id, u)} className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded" title="Save"><Save className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-1.5 rounded" title="Cancel"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${
                          isAgent ? 'bg-blue-100 text-blue-700' : isRep ? 'bg-emerald-100 text-emerald-800' : isAud ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {(u.name?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <div>{u.name}</div>
                          {isRep && <span className="text-[10px] text-emerald-700 font-semibold">Salaried Staff</span>}
                          {isAgent && <span className="text-[10px] text-blue-700 font-semibold">Commission Agent</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">@{u.username}</td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-gray-500" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {showPins[u.id] ? <span className="font-mono text-gray-800 font-medium">{u.pin}</span> : <span className="text-gray-400 tracking-widest mt-1">••••••</span>}
                            <button onClick={() => setShowPins({...showPins, [u.id]: !showPins[u.id]})} className="text-gray-400 hover:text-[#0F5132] transition-colors ml-2">
                              {showPins[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      )}
                      {isAdmin && <td className="px-6 py-4 text-gray-600">{u.phone || '-'}</td>}
                      <td className="px-6 py-4">
                        {isAgent ? (
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase border shadow-2xs ${
                            u.pricingTier === 'gold' 
                              ? 'bg-amber-100 text-amber-900 border-amber-300' 
                              : u.pricingTier === 'silver' 
                              ? 'bg-slate-200 text-slate-800 border-slate-300' 
                              : 'bg-orange-100 text-orange-900 border-orange-300'
                          }`}>
                            ★ {u.pricingTier || 'bronze'} Package
                          </span>
                        ) : isRep ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Unit Price Only (Salaried)
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isAgent ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full uppercase bg-blue-100 text-blue-800 border border-blue-200">
                            Sales Agent
                          </span>
                        ) : isRep ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Sales Rep
                          </span>
                        ) : isAud ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Auditor
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full uppercase bg-purple-100 text-purple-800 border border-purple-200">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openReportModal(u)} className="bg-[#0F5132] text-white px-3 py-1.5 rounded-md hover:bg-[#198754] transition-colors flex items-center gap-1.5 font-medium text-xs shadow-sm" title="View Monthly Invoices & Audit Dashboard">
                            <FileText className="w-3.5 h-3.5" /> Inspect Invoices
                          </button>
                          {isAdmin && (
                            <button onClick={() => startEdit(u)} className="text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-md transition-colors text-xs font-medium" title="Edit User">
                              <Edit2 className="w-3.5 h-3.5" /> Edit Role/Tier
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={isAdmin ? 7 : 5} className="px-6 py-12 text-center text-gray-500">No team members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Auditor Verification & Monthly Invoice History Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-[#0F5132]" />
                  Audit Dashboard: {selectedUserForReport?.name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Username: @{selectedUserForReport?.username} • Role: {selectedUserForReport?.role || 'sales'} • Pricing Tier: {selectedUserForReport?.pricingTier || 'bronze'}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-300 shadow-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-bold text-gray-600">Month:</span>
                  <input 
                    type="month" 
                    className="text-sm font-semibold outline-none bg-transparent cursor-pointer"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-gray-50 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Invoiced ({selectedMonth})</p>
                  <p className="text-xl font-black text-gray-900 mt-1 font-mono">
                    ₦{filteredMonthInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200 bg-green-50/20 shadow-sm">
                  <p className="text-xs font-bold text-green-700 uppercase">Total Paid</p>
                  <p className="text-xl font-black text-green-700 mt-1 font-mono">
                    ₦{filteredMonthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.grandTotal || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-orange-200 bg-orange-50/20 shadow-sm">
                  <p className="text-xs font-bold text-orange-700 uppercase">Total Unpaid</p>
                  <p className="text-xl font-black text-orange-700 mt-1 font-mono">
                    ₦{filteredMonthInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.grandTotal || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-purple-200 bg-purple-50/20 shadow-sm">
                  <p className="text-xs font-bold text-purple-700 uppercase">Total Profit Generated</p>
                  <p className="text-xl font-black text-purple-700 mt-1 font-mono">
                    ₦{filteredMonthInvoices.reduce((s, i) => s + (i.profitTotal || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {loadingReport ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F5132]"></div>
                </div>
              ) : filteredMonthInvoices.length > 0 ? (
                <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-sm">Monthly Invoice History ({filteredMonthInvoices.length} Invoices)</h3>
                    <span className="text-xs text-gray-500">Showing records for {selectedMonth}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[900px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-gray-600">Invoice #</th>
                          <th className="px-4 py-3 font-bold text-gray-600">Date</th>
                          <th className="px-4 py-3 font-bold text-gray-600">Client</th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-right">Wholesale Cost</th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-right">Sale Amount</th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-right">Profit</th>
                          <th className="px-4 py-3 font-bold text-gray-600">Payment Status</th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-center">Proof of Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredMonthInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-gray-700 font-semibold">{inv.invoiceNumber}</td>
                            <td className="px-4 py-3 text-gray-500">{inv.issueDate}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{inv.clientName}</td>
                            <td className="px-4 py-3 text-right text-gray-600 font-mono">
                              ₦{(inv.wholesaleTotal || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">
                              ₦{(inv.grandTotal || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#0F5132] font-mono">
                              ₦{(inv.profitTotal || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {inv.proofOfPayment ? (
                                <button 
                                  onClick={() => setViewingProof(inv)}
                                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> View Proof
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400 italic">No proof uploaded</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-right text-gray-600 uppercase tracking-wider text-xs">Monthly Totals</td>
                          <td className="px-4 py-4 text-right text-gray-900 font-mono text-base">
                            ₦{filteredMonthInvoices.reduce((sum, inv) => sum + (inv.wholesaleTotal || 0), 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-900 font-mono text-base">
                            ₦{filteredMonthInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-[#0F5132] font-mono text-base">
                            ₦{filteredMonthInvoices.reduce((sum, inv) => sum + (inv.profitTotal || 0), 0).toLocaleString()}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500 bg-white rounded-md border border-gray-200 shadow-sm">
                  <p className="text-base font-semibold">No invoices found for {selectedMonth}.</p>
                  <p className="text-xs text-gray-400 mt-1">Try selecting a different month using the month picker above.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-bold text-sm transition-colors"
              >
                Close Audit Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Payment Viewer Modal */}
      {viewingProof && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                Proof of Payment — Invoice #{viewingProof.invoiceNumber}
              </h3>
              <button onClick={() => setViewingProof(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-4">
              {viewingProof.proofOfPayment?.startsWith('data:image') ? (
                <img src={viewingProof.proofOfPayment} alt="Proof of Payment" className="max-w-full max-h-[60vh] object-contain rounded-md border shadow-sm" />
              ) : viewingProof.proofOfPayment?.startsWith('http') ? (
                <div className="text-center space-y-4 py-8">
                  <p className="text-sm text-gray-600 font-medium">Proof stored in Google Drive storage.</p>
                  <a 
                    href={viewingProof.proofOfPayment} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Proof in Google Drive
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Proof file attached.</p>
              )}
            </div>
            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setViewingProof(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-bold text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
