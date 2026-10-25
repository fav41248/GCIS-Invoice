import React, { useEffect, useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Trash2, Edit2, Search, Download, Users, ChevronLeft, ChevronRight, ArrowUpDown, FilePlus, Filter, UserCheck, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToCSV } from '../lib/utils';

export default function Clients() {
  const { user, isAdmin, isAuditor } = useAuth();
  if (isAuditor) {
    return <Navigate to="/audit" replace />;
  }

  const [clients, setClients] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { name: string; role: string; username: string }>>({});
  const [clientCreatorsMap, setClientCreatorsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Filtering & Sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCreatorFilter, setSelectedCreatorFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [assignedCreator, setAssignedCreator] = useState(user?.username || 'admin');

  // 1. Load users directory
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await supabase.from('users').select('id, username, name, role');
        if (data) {
          const map: Record<string, { name: string; role: string; username: string }> = {};
          data.forEach(d => {
            const key = (d.username || d.id || '').toLowerCase().trim();
            map[key] = {
              username: key,
              name: d.name || key,
              role: d.role || 'sales_agent'
            };
          });
          setUsersList(data);
          setUserMap(map);
        }
      } catch (err) {
        console.warn('Error fetching users in Clients:', err);
      }
    };
    fetchUsers();
  }, []);

  // 2. Fetch clients merged with invoice history and client_creators mapping
  const fetchAllClients = async () => {
    setLoading(true);
    try {
      const [clientsRes, invoicesRes, settingsRes] = await Promise.all([
        supabase.from('clients').select('*').order('name', { ascending: true }),
        supabase.from('invoices').select('client_name, client_address, client_email, client_phone, created_by, created_by_email, created_at').order('created_at', { ascending: true }),
        supabase.from('settings').select('value').eq('key', 'client_creators').maybeSingle()
      ]);

      const registeredClients = clientsRes.data || [];
      const invoiceRecords = invoicesRes.data || [];
      const storedCreators: Record<string, string> = settingsRes.data?.value || {};
      setClientCreatorsMap(storedCreators);

      // Map to merge registered clients and invoices by normalized client name
      const mergedMap = new Map<string, any>();

      // A. Populate from registered clients table
      registeredClients.forEach((c: any) => {
        const key = (c.name || '').trim().toLowerCase();
        if (!key) return;
        const creatorKey = (storedCreators[c.id] || '').toLowerCase().trim();
        mergedMap.set(key, {
          id: c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          createdAt: c.created_at,
          createdBy: creatorKey,
          invoiceCount: 0
        });
      });

      // B. Populate / enhance from invoices (links every client to their actual creator)
      invoiceRecords.forEach((inv: any) => {
        const key = (inv.client_name || '').trim().toLowerCase();
        if (!key) return;

        const invoiceCreator = (inv.created_by || inv.created_by_email || '').toLowerCase().trim();
        const existing = mergedMap.get(key);

        if (existing) {
          if (!existing.createdBy && invoiceCreator) {
            existing.createdBy = invoiceCreator;
          }
          if (!existing.email && inv.client_email) existing.email = inv.client_email;
          if (!existing.phone && inv.client_phone) existing.phone = inv.client_phone;
          if (!existing.address && inv.client_address) existing.address = inv.client_address;
          existing.invoiceCount = (existing.invoiceCount || 0) + 1;
        } else {
          mergedMap.set(key, {
            id: `client_inv_${key.replace(/[^a-z0-9]/g, '_')}`,
            name: inv.client_name,
            email: inv.client_email || '',
            phone: inv.client_phone || '',
            address: inv.client_address || '',
            createdAt: inv.created_at,
            createdBy: invoiceCreator,
            invoiceCount: 1
          });
        }
      });

      const allMerged = Array.from(mergedMap.values());
      setClients(allMerged);
    } catch (err) {
      console.warn('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchAllClients();
  }, [user]);

  // Unique creators list for Admin filter dropdown
  const creatorsSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      const creatorKey = (c.createdBy || 'unassigned').toLowerCase();
      counts[creatorKey] = (counts[creatorKey] || 0) + 1;
    });
    return counts;
  }, [clients]);

  // Save or edit a client
  const saveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editId || `client_${Date.now()}`;
      const effectiveCreator = (isAdmin ? assignedCreator : user?.username || 'admin').toLowerCase().trim();
      
      const payload: any = {
        id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim()
      };

      // 1. Save client row in clients table
      const { error: cliErr } = await supabase.from('clients').upsert(payload);
      if (cliErr) throw cliErr;

      // 2. Persist creator relationship in settings client_creators
      const updatedCreators = {
        ...clientCreatorsMap,
        [id]: effectiveCreator
      };
      setClientCreatorsMap(updatedCreators);

      try {
        await supabase.from('settings').upsert({
          key: 'client_creators',
          value: updatedCreators,
          updated_at: new Date().toISOString()
        });
      } catch (setErr) {
        console.warn('Failed to persist client creator in settings:', setErr);
      }

      // Update state locally
      setClients(prev => {
        const idx = prev.findIndex(c => c.id === id || c.name.toLowerCase() === payload.name.toLowerCase());
        const newItem = {
          ...payload,
          createdBy: effectiveCreator,
          invoiceCount: idx >= 0 ? prev[idx].invoiceCount : 0,
          createdAt: idx >= 0 ? prev[idx].createdAt : new Date().toISOString()
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newItem;
          return next;
        }
        return [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name));
      });

      toast.success(editId ? 'Client updated successfully' : 'Client registered successfully');
      resetForm();
    } catch (error: any) {
      toast.error('Failed to save client: ' + (error.message || error));
    }
  };

  const deleteClient = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;

        // Clean up from settings map if present
        const nextCreators = { ...clientCreatorsMap };
        delete nextCreators[id];
        setClientCreatorsMap(nextCreators);
        try {
          await supabase.from('settings').upsert({
            key: 'client_creators',
            value: nextCreators,
            updated_at: new Date().toISOString()
          });
        } catch {}

        setClients(prev => prev.filter(c => c.id !== id));
        toast.success('Client deleted successfully');
      } catch (error: any) {
        toast.error('Failed to delete client: ' + (error.message || error));
      }
    }
  };

  const handleEdit = (client: any) => {
    setEditId(client.id);
    setName(client.name);
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setAssignedCreator(client.createdBy || user?.username || 'admin');
    setIsEditing(true);
  };

  const resetForm = () => {
    setEditId('');
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setAssignedCreator(user?.username || 'admin');
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

  // Filter clients based on Role & Search
  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];

    // Non-Admin: Only see clients created by themselves
    if (!isAdmin && user?.username) {
      const myUsername = user.username.toLowerCase().trim();
      result = result.filter(c => (c.createdBy || '').toLowerCase().trim() === myUsername);
    }

    // Admin: Filter by specific creator if selected
    if (isAdmin && selectedCreatorFilter !== 'all') {
      result = result.filter(c => (c.createdBy || 'unassigned').toLowerCase().trim() === selectedCreatorFilter.toLowerCase());
    }

    // Search filter: matches client details AND creator name/username
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c => {
        const matchName = c.name?.toLowerCase().includes(lower);
        const matchEmail = c.email?.toLowerCase().includes(lower);
        const matchPhone = c.phone?.toLowerCase().includes(lower);
        const matchAddress = c.address?.toLowerCase().includes(lower);
        
        let matchCreator = false;
        if (isAdmin && c.createdBy) {
          const creatorInfo = userMap[c.createdBy.toLowerCase()];
          matchCreator = 
            c.createdBy.toLowerCase().includes(lower) || 
            (creatorInfo?.name && creatorInfo.name.toLowerCase().includes(lower));
        }

        return matchName || matchEmail || matchPhone || matchAddress || matchCreator;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'invoiceCount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }

      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, isAdmin, user, selectedCreatorFilter, searchTerm, sortField, sortOrder, userMap]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const currentClients = filteredAndSortedClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const dataToExport = filteredAndSortedClients.map(c => {
      const creatorInfo = c.createdBy ? userMap[c.createdBy.toLowerCase()] : null;
      const creatorName = creatorInfo?.name || c.createdBy || 'Unassigned';
      const creatorRole = creatorInfo?.role || '';
      
      const exportData: any = {
        'Client Name': c.name,
        'Phone': c.phone,
        'Email': c.email,
        'Address': c.address,
        'Invoices Billed': c.invoiceCount || 0
      };

      if (isAdmin) {
        exportData['Created By (Rep/User)'] = creatorName;
        exportData['Rep Username'] = c.createdBy ? `@${c.createdBy}` : '';
        exportData['Rep Role'] = creatorRole;
      }

      return exportData;
    });

    exportToCSV(dataToExport, `clients_${selectedCreatorFilter !== 'all' ? selectedCreatorFilter : 'all'}.csv`);
    toast.success('Clients exported successfully');
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin 
              ? `Master Directory • Viewing all ${clients.length} clients across all users & sales reps`
              : `My Client Directory • Viewing your registered clients`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder={isAdmin ? "Search by client or creator..." : "Search clients..."}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#198754] outline-none"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Admin Creator Filter */}
          {isAdmin && Object.keys(creatorsSummary).length > 0 && (
            <div className="relative">
              <select
                value={selectedCreatorFilter}
                onChange={(e) => { setSelectedCreatorFilter(e.target.value); setCurrentPage(1); }}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-[#198754] outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">All Users &amp; Reps ({clients.length})</option>
                {Object.entries(creatorsSummary).map(([creatorKey, count]) => {
                  const creatorInfo = userMap[creatorKey];
                  const label = creatorInfo ? `${creatorInfo.name} (@${creatorKey})` : `@${creatorKey}`;
                  return (
                    <option key={creatorKey} value={creatorKey}>
                      {label} ({count} clients)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* CSV Export */}
          {isAdmin && (
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap shadow-2xs">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-1">
          <form onSubmit={saveClient} className="bg-white p-6 rounded-md border border-gray-200 shadow-sm sticky top-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">{isEditing ? 'Edit Client' : 'Add New Client'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Company / Client Name *</label>
                <input 
                  required 
                  type="text" 
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Mr Ajenikoko"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Phone Number</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="e.g. 09075825508"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Email Address</label>
                <input 
                  type="email" 
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Address / Location</label>
                <textarea 
                  rows={3} 
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="e.g. Ibadan, Oyo State"
                />
              </div>

              {/* Admin option to assign creator / sales rep */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Assign to Sales Rep / User
                  </label>
                  <select
                    value={assignedCreator}
                    onChange={e => setAssignedCreator(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none bg-white font-medium"
                  >
                    <option value="admin">Administrator (Direct Client)</option>
                    {usersList.filter(u => u.username !== 'admin' && u.username !== 'auditor').map(u => (
                      <option key={u.username} value={u.username}>
                        {u.name} (@{u.username}) - {u.role === 'sales_rep' ? 'Sales Rep' : 'Sales Agent'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    This user will see this client in their client directory.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {isEditing && (
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              )}
              <button type="submit" className="flex-1 bg-[#198754] text-white py-2 rounded-md font-medium hover:bg-[#0F5132] transition-colors shadow-xs">
                {isEditing ? 'Update Client' : 'Save Client'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Table */}
        <div className="lg:col-span-2">
          {/* Active filter chip */}
          {selectedCreatorFilter !== 'all' && (
            <div className="mb-3 flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2 rounded-lg text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Showing clients created by: <strong>{userMap[selectedCreatorFilter]?.name || selectedCreatorFilter} (@{selectedCreatorFilter})</strong>
                </span>
              </div>
              <button
                onClick={() => { setSelectedCreatorFilter('all'); setCurrentPage(1); }}
                className="text-emerald-700 hover:text-emerald-900 underline font-semibold"
              >
                Clear filter
              </button>
            </div>
          )}

          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[650px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Client Details <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('phone')}>
                    <div className="flex items-center gap-1">Contact <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdBy')}>
                      <div className="flex items-center gap-1">Created By (Sales Rep) <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                    </th>
                  )}
                  <th className="px-6 py-4 font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-6 py-4">
                        <div className="h-5 bg-gray-200 rounded w-40 animate-pulse mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-64 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded w-32 animate-pulse"></div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-28 animate-pulse mb-1"></div>
                          <div className="h-3 bg-gray-100 rounded w-16 animate-pulse"></div>
                        </td>
                      )}
                      <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-16 ml-auto animate-pulse"></div></td>
                    </tr>
                  ))
                ) : currentClients.length > 0 ? (
                  currentClients.map(c => {
                    const creatorKey = (c.createdBy || '').toLowerCase();
                    const creatorInfo = creatorKey ? userMap[creatorKey] : null;
                    const creatorName = creatorInfo?.name || (c.createdBy ? `@${c.createdBy}` : 'Direct Client');
                    const creatorRole = creatorInfo?.role || '';
                    const roleLabel = creatorRole === 'sales_rep' ? 'Sales Rep' : creatorRole === 'sales_agent' || creatorRole === 'sales' ? 'Sales Agent' : creatorRole === 'admin' ? 'Admin' : creatorRole;

                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            {c.invoiceCount > 0 && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                {c.invoiceCount} {c.invoiceCount === 1 ? 'Invoice' : 'Invoices'}
                              </span>
                            )}
                          </div>
                          {c.address && (
                            <p className="text-gray-500 text-xs mt-1 max-w-xs truncate">{c.address}</p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {c.phone ? (
                            <p className="text-gray-900 font-mono text-xs">{c.phone}</p>
                          ) : (
                            <span className="text-gray-400 text-xs italic">No phone</span>
                          )}
                          {c.email && (
                            <p className="text-gray-500 text-xs mt-0.5">{c.email}</p>
                          )}
                        </td>

                        {/* Admin View: Show the specific user who created the client */}
                        {isAdmin && (
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-semibold text-gray-900 text-xs">
                                {creatorName}
                              </span>
                              {c.createdBy && (
                                <span className="text-[11px] text-gray-500 font-mono">
                                  @{c.createdBy}
                                </span>
                              )}
                              {roleLabel && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  creatorRole === 'sales_rep' ? 'bg-emerald-100 text-emerald-800' :
                                  creatorRole === 'sales_agent' || creatorRole === 'sales' ? 'bg-blue-100 text-blue-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {roleLabel}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {!isAuditor && (
                              <Link
                                to={`/generator?clientId=${encodeURIComponent(c.id)}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0F5132] hover:bg-[#198754] text-white text-xs font-bold rounded shadow-xs transition-colors whitespace-nowrap"
                                title="Create Invoice for this Client"
                              >
                                <FilePlus className="w-3.5 h-3.5" />
                                <span>Invoice</span>
                              </Link>
                            )}
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center">
                       <div className="flex flex-col items-center justify-center text-gray-500">
                         <Users className="w-12 h-12 text-gray-300 mb-3" />
                         <p className="text-lg font-medium text-gray-900 mb-1">
                           {searchTerm 
                             ? "No matching clients found" 
                             : selectedCreatorFilter !== 'all' 
                               ? `No clients registered by @${selectedCreatorFilter}` 
                               : "No clients registered yet"}
                         </p>
                         <p className="text-sm">
                           {selectedCreatorFilter !== 'all'
                             ? "Try selecting another sales rep or clearing the filter."
                             : "Use the form on the left to add a new client."}
                         </p>
                         {selectedCreatorFilter !== 'all' && (
                           <button
                             onClick={() => { setSelectedCreatorFilter('all'); setCurrentPage(1); }}
                             className="mt-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-3 py-1.5 rounded transition-colors"
                           >
                             View All Clients
                           </button>
                         )}
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
