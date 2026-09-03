import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import { Trash2, Edit2, Search, Download, Users, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToCSV } from '../lib/utils';

export default function Clients() {
  const { user, isAdmin } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(data);
      setLoading(false);
    }, (error) => {
      if (!handleFirestoreError(error, OperationType.LIST, 'clients')) toast.error('Failed to load clients.');
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const saveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editId || `client_${Date.now()}`;
      await setDoc(doc(db, 'clients', id), {
        name,
        email,
        phone,
        address,
        updatedAt: new Date().toISOString(),
        createdBy: user?.username
      }, { merge: true });
      
      toast.success(editId ? 'Client updated successfully' : 'Client added successfully');
      resetForm();
    } catch (error) {
      if (!handleFirestoreError(error, OperationType.CREATE, 'clients')) toast.error('Failed to save client');
    }
  };

  const deleteClient = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await deleteDoc(doc(db, 'clients', id));
        toast.success('Client deleted successfully');
      } catch (error) {
        if (!handleFirestoreError(error, OperationType.DELETE, `clients/${id}`)) toast.error('Failed to delete client');
      }
    }
  };

  const handleEdit = (client: any) => {
    setEditId(client.id);
    setName(client.name);
    setEmail(client.email);
    setPhone(client.phone);
    setAddress(client.address);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditId('');
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setIsEditing(false);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(lower) || 
        c.email?.toLowerCase().includes(lower) ||
        c.phone?.toLowerCase().includes(lower)
      );
    }
    
    result.sort((a, b) => {
      const aVal = String(a[sortField] || '').toLowerCase();
      const bVal = String(b[sortField] || '').toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [clients, searchTerm, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const currentClients = filteredAndSortedClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const dataToExport = filteredAndSortedClients.map(c => ({
      'Name': c.name,
      'Email': c.email,
      'Phone': c.phone,
      'Address': c.address,
      'Added By': c.createdBy
    }));
    exportToCSV(dataToExport, 'clients.csv');
    toast.success('Clients exported successfully');
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Client Management</h1>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search clients..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#198754] outline-none"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {isAdmin && (
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={saveClient} className="bg-white p-6 rounded-md border border-gray-200 shadow-sm sticky top-6">
            <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Client' : 'Add New Client'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Company / Name</label>
                <input required type="text" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Email</label>
                <input type="email" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Phone</label>
                <input type="text" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Address</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {isEditing && (
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              )}
              <button type="submit" className="flex-1 bg-[#198754] text-white py-2 rounded-md font-medium hover:bg-[#0F5132] transition-colors">
                {isEditing ? 'Update Client' : 'Save Client'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Client Details <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('phone')}>
                    <div className="flex items-center gap-1">Contact <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-6 py-4">
                        <div className="h-5 bg-gray-200 rounded w-40 animate-pulse mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-64 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-32 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-16 ml-auto animate-pulse"></div></td>
                    </tr>
                  ))
                ) : currentClients.length > 0 ? (
                  currentClients.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <p className="text-gray-500 text-xs mt-1 max-w-xs">{c.address}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{c.phone}</p>
                        <p className="text-gray-500">{c.email}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(c)}
                            className="p-1.5 text-gray-500 hover:text-[#0F5132] hover:bg-green-50 rounded transition-colors"
                            title="Edit Client"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={() => deleteClient(c.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Client"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                       <div className="flex flex-col items-center justify-center text-gray-500">
                         <Users className="w-12 h-12 text-gray-300 mb-3" />
                         <p className="text-lg font-medium text-gray-900 mb-1">{searchTerm ? "No matching clients found" : "No clients added yet"}</p>
                         <p className="text-sm">Use the form to add a new client.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedClients.length)}</span> of <span className="font-medium">{filteredAndSortedClients.length}</span> clients
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
