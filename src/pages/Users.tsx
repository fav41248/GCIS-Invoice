import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, setDoc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Edit2, Save, X, FileText } from 'lucide-react';

export default function Users() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', username: '', pin: '', phone: '' });
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  const [selectedUserForReport, setSelectedUserForReport] = useState<any>(null);
  const [userInvoices, setUserInvoices] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditData({ name: user.name, username: user.username, pin: user.pin || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string, user: any) => {
    try {
      const normalizedUsername = editData.username.toLowerCase().trim();
      
      if (normalizedUsername !== id) {
        await setDoc(doc(db, 'users', normalizedUsername), {
          ...user,
          name: editData.name,
          username: normalizedUsername,
          pin: editData.pin,
          phone: editData.phone,
        });
        await deleteDoc(doc(db, 'users', id));
      } else {
        await updateDoc(doc(db, 'users', id), {
          name: editData.name,
          username: normalizedUsername,
          pin: editData.pin,
          phone: editData.phone
        });
      }
      setEditingId(null);
    } catch (err: any) {
      alert('Failed to update user: ' + err.message);
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
      invoicesData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserInvoices(invoicesData);
    } catch (error) {
      if (!handleFirestoreError(error, OperationType.LIST, 'invoices')) toast.error('Failed to load user invoices');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return unsubscribe;
  }, [isAdmin]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsCreating(true);
    setError('');

    try {
      const normalizedUsername = username.toLowerCase().trim();
      
      await setDoc(doc(db, 'users', normalizedUsername), {
        name, 
        username: normalizedUsername,
        role: 'sales',
        pin: pin,
        phone: phone,
        createdAt: new Date().toISOString()
      });
      
      setShowAdd(false);
      setName(''); setUsername(''); setPin(''); setPhone('');
    } catch (err: any) {
      setError(err.message || 'Failed to authorize user.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAdmin) return <div className="p-8 text-red-500">Access Denied.</div>;
  if (loading) return <div className="p-8">Loading users...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Reps & Users</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-[#0F5132] text-white px-4 py-2 rounded-md font-medium hover:bg-[#198754]"
        >
          {showAdd ? 'Cancel' : 'Add New Sales Rep'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm mb-6">
          <h2 className="font-bold mb-4">Create New Account</h2>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm border border-red-100 rounded-md">{error}</div>}
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
              <input required type="text" className="w-full border rounded p-2 text-sm" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username *</label>
              <input required type="text" placeholder="janedoe" className="w-full border rounded p-2 text-sm" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN / Password *</label>
              <input required type="text" minLength={4} placeholder="1234" className="w-full border rounded p-2 text-sm" value={pin} onChange={e => setPin(e.target.value)} />
            </div>
            <div className="col-span-2 flex justify-end mt-2">
              <button disabled={isCreating} type="submit" className="bg-[#0F5132] text-white px-6 py-2 rounded font-medium mt-2">
                {isCreating ? 'Creating...' : 'Create Rep'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">Name</th>
              <th className="px-6 py-4 font-bold text-gray-600">Username</th>
              <th className="px-6 py-4 font-bold text-gray-600">Password / PIN</th>
              <th className="px-6 py-4 font-bold text-gray-600">Phone</th>
              <th className="px-6 py-4 font-bold text-gray-600">Role</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                {editingId === u.id ? (
                  <>
                    <td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.pin} onChange={e => setEditData({...editData, pin: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => saveEdit(u.id, u)} className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded" title="Save"><Save className="w-4 h-4" /></button>
                        <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-1.5 rounded" title="Cancel"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 font-medium text-[#212529]">{u.name}</td>
                    <td className="px-6 py-4 text-gray-500">{u.username}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        {showPins[u.id] ? <span className="font-mono text-gray-800 font-medium">{u.pin}</span> : <span className="text-gray-400 tracking-widest mt-1">••••••</span>}
                        <button onClick={() => setShowPins({...showPins, [u.id]: !showPins[u.id]})} className="text-gray-400 hover:text-[#0F5132] transition-colors ml-2">
                          {showPins[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'}`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openReportModal(u)} className="text-[#0F5132] hover:bg-green-50 p-1.5 rounded transition-colors flex items-center gap-1 font-medium" title="View Sales Report">
                          <FileText className="w-4 h-4" /> Report
                        </button>
                        <button onClick={() => startEdit(u)} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded transition-colors flex items-center gap-1 font-medium" title="Edit User">
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No sales reps created yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Sales Report: {selectedUserForReport?.name} <span className="text-gray-500 font-normal text-base">(@{selectedUserForReport?.username})</span>
              </h2>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {loadingReport ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F5132]"></div>
                </div>
              ) : userInvoices.length > 0 ? (
                <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[800px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-gray-600">Invoice #</th>
                          <th className="px-4 py-3 font-bold text-gray-600">Date</th>
                          <th className="px-4 py-3 font-bold text-gray-600">Client</th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-right">Wholesale Cost</th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-right">Sale Amount</th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-right">Profit</th>
                          <th className="px-4 py-3 font-bold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {userInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-gray-600">{inv.invoiceNumber}</td>
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
                              <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-right text-gray-600 uppercase tracking-wider text-xs">Total Summaries</td>
                          <td className="px-4 py-4 text-right text-gray-900 font-mono text-base">
                            ₦{userInvoices.reduce((sum, inv) => sum + (inv.wholesaleTotal || 0), 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-900 font-mono text-base">
                            ₦{userInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-[#0F5132] font-mono text-base">
                            ₦{userInvoices.reduce((sum, inv) => sum + (inv.profitTotal || 0), 0).toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 bg-white rounded-md border border-gray-200">
                  <p>No invoices generated by this user yet.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
