import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import { Eye, EyeOff, Edit2, Save, X } from 'lucide-react';

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', username: '', pin: '' });
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

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
        });
        await deleteDoc(doc(db, 'users', id));
      } else {
        await updateDoc(doc(db, 'users', id), {
          name: editData.name,
          username: normalizedUsername,
          pin: editData.pin
        });
      }
      setEditingId(null);
    } catch (err: any) {
      alert('Failed to update user: ' + err.message);
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
        createdAt: new Date().toISOString()
      });
      
      setShowAdd(false);
      setName(''); setUsername(''); setPin('');
    } catch (err: any) {
      setError(err.message || 'Failed to authorize user.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAdmin) return <div className="p-8 text-red-500">Access Denied.</div>;
  if (loading) return <div className="p-8">Loading users...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Reps & Users</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-[#0F5132] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#198754]"
        >
          {showAdd ? 'Cancel' : 'Add New Sales Rep'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
          <h2 className="font-bold mb-4">Create New Account</h2>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm border border-red-100 rounded-lg">{error}</div>}
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
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
              <button disabled={isCreating} type="submit" className="bg-[#198754] text-white px-6 py-2 rounded font-medium mt-2">
                {isCreating ? 'Creating...' : 'Create Rep'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">Name</th>
              <th className="px-6 py-4 font-bold text-gray-600">Username</th>
              <th className="px-6 py-4 font-bold text-gray-600">Password / PIN</th>
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
                        <button onClick={() => setShowPins({...showPins, [u.id]: !showPins[u.id]})} className="text-gray-400 hover:text-[#198754] transition-colors ml-2">
                          {showPins[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'}`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => startEdit(u)} className="text-[#198754] hover:text-[#0F5132] font-medium flex items-center gap-1 justify-end w-full">
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
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
    </div>
  );
}
