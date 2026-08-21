import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'clients'), {
        name, address, email, phone,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setName(''); setAddress(''); setEmail(''); setPhone('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  if (loading) return <div className="p-8">Loading clients...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Client Database</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-[#0F5132] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#198754]"
        >
          {showAdd ? 'Cancel' : 'Add New Client'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
          <h2 className="font-bold mb-4">Add Client</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company Name *</label>
              <input required type="text" className="w-full border rounded p-2 text-sm" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
              <input type="text" className="w-full border rounded p-2 text-sm" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <input type="email" className="w-full border rounded p-2 text-sm" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
              <input type="text" className="w-full border rounded p-2 text-sm" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" className="bg-[#198754] text-white px-6 py-2 rounded font-medium mt-2">Save Client</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">Name</th>
              <th className="px-6 py-4 font-bold text-gray-600">Contact</th>
              <th className="px-6 py-4 font-bold text-gray-600">Address</th>
              <th className="px-6 py-4 font-bold text-gray-600">Added On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map(client => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-[#212529]">{client.name}</td>
                <td className="px-6 py-4 text-gray-500">
                  <div className="text-[#198754]">{client.email}</div>
                  <div>{client.phone}</div>
                </td>
                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{client.address}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(client.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No clients in database.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
