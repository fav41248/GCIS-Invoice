import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { BookOpen, Upload, Search, FileText, Trash2, Edit2, X, Save, CheckCircle2, AlertTriangle, AlertCircle, Plus } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function KnowledgeBank() {
  const { isAdmin, user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [activeTab, setActiveTab] = useState<'bronze' | 'silver' | 'gold'>('bronze');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: 0, wholesalePriceBronze: 0, wholesalePriceSilver: 0, wholesalePriceGold: 0, category: '', description: '', available: true });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
      if (error) throw error;
      const formatted = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        wholesalePriceBronze: Number(p.wholesale_price_bronze || 0),
        wholesalePriceSilver: Number(p.wholesale_price_silver || 0),
        wholesalePriceGold: Number(p.wholesale_price_gold || 0),
        category: p.category || 'General',
        description: p.description || '',
        available: p.available !== false,
        imageUrl: p.image_url || '',
        updatedAt: p.updated_at
      }));
      setProducts(formatted);
    } catch (err) {
      console.warn("KnowledgeBank fetch error from Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    try {
      if (fileExt === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            await processData(results.data, activeTab);
          }
        });
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          await processData(data, activeTab);
        };
        reader.readAsBinaryString(file);
      } else {
        throw new Error("Unsupported file format. Please upload CSV or Excel files.");
      }
    } catch (error: any) {
      setUploadStatus({ type: 'error', message: error.message || 'Error parsing file.' });
      setIsUploading(false);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processData = async (data: any[], currentTab: string) => {
    if (!data || data.length === 0) {
      setUploadStatus({ type: 'error', message: 'The file is empty.' });
      setIsUploading(false);
      return;
    }

    try {
      // Find the probable column names for Name and Price
      const firstRow = data[0];
      const keys = Object.keys(firstRow);
      
      const nameKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('product') || k.toLowerCase().includes('item'));
      const wholesalePriceKey = keys.find(k => k.toLowerCase().includes('wholesale') && (k.toLowerCase().includes('price') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('amount')));
      const priceKey = keys.find(k => (k.toLowerCase().includes('price') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('amount')) && k !== wholesalePriceKey);

      if (!nameKey || !priceKey) {
        throw new Error(`Could not automatically detect 'Name' and 'Price' columns. Found columns: ${keys.join(', ')}`);
      }

      // Firestore batches can hold up to 500 operations
      // For larger files we should chunk it, but we'll do sequential batches here
      const chunks = [];
      for (let i = 0; i < data.length; i += 400) {
        chunks.push(data.slice(i, i + 400));
      }

      for (const chunk of chunks) {
        const supaRows: any[] = [];
        chunk.forEach(row => {
          const name = row[nameKey];
          let price = row[priceKey];
          let wholesalePrice = wholesalePriceKey ? row[wholesalePriceKey] : undefined;
          
          if (!name) return; // Skip empty names
          
          if (typeof price === 'string') {
            price = parseFloat(price.replace(/[^0-9.-]+/g, ""));
          }
          if (isNaN(price)) price = 0;
          
          if (typeof wholesalePrice === 'string') {
            wholesalePrice = parseFloat(wholesalePrice.replace(/[^0-9.-]+/g, ""));
          }
          if (wholesalePrice !== undefined && isNaN(wholesalePrice)) wholesalePrice = 0;

          let docId = name.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          if (!docId) {
            docId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          }

          const category = row['Category'] || row['category'] || 'General';
          const desc = row['Description'] || row['description'] || row['Desc'] || row['desc'] || '';

          const availKey = keys.find(k => k.toLowerCase().includes('avail') || k.toLowerCase().includes('stock') || k.toLowerCase().includes('status'));
          let isAvail = true;
          if (availKey && row[availKey] !== undefined && row[availKey] !== null) {
            const val = String(row[availKey]).toLowerCase().trim();
            if (val === 'false' || val === 'no' || val === 'unavailable' || val === 'out of stock' || val === '0') {
              isAvail = false;
            }
          }

          supaRows.push({
            id: docId,
            name: name.toString(),
            price: price,
            wholesale_price_bronze: currentTab === 'bronze' && wholesalePrice !== undefined ? wholesalePrice : 0,
            wholesale_price_silver: currentTab === 'silver' && wholesalePrice !== undefined ? wholesalePrice : 0,
            wholesale_price_gold: currentTab === 'gold' && wholesalePrice !== undefined ? wholesalePrice : 0,
            category: category,
            description: desc,
            available: isAvail,
            updated_at: new Date().toISOString()
          });
        });

        if (supaRows.length > 0) {
          const { error: supaErr } = await supabase.from('products').upsert(supaRows);
          if (supaErr) console.warn("Supabase import error:", supaErr);
        }

      }

      await loadProducts();
      setUploadStatus({ type: 'success', message: `Successfully imported ${data.length} products!` });
    } catch (error: any) {
      setUploadStatus({ type: 'error', message: error.message || 'Error saving to database.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleAvailability = async (id: string, newAvailable: boolean) => {
    try {
      await supabase.from('products').update({
        available: newAvailable,
        updated_at: new Date().toISOString()
      }).eq('id', id);

      toast.success(newAvailable ? 'Marked as Available' : 'Marked as Out of Stock');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update availability');
    }
  };

  const handleBulkSetAvailability = async (newAvailable: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      await supabase.from('products').update({
        available: newAvailable,
        updated_at: new Date().toISOString()
      }).in('id', ids);



      setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, available: newAvailable } : p));
      toast.success(`Marked ${ids.length} products as ${newAvailable ? 'Available' : 'Out of Stock'}`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error('Failed to update products');
    }
  };

  const handleEditClick = (product: any) => {
    setEditingId(product.id);
    setEditForm({ 
      name: product.name, 
      price: product.price, 
      wholesalePriceBronze: product.wholesalePriceBronze || product.wholesalePrice || 0, 
      wholesalePriceSilver: product.wholesalePriceSilver || product.wholesalePrice || 0, 
      wholesalePriceGold: product.wholesalePriceGold || product.wholesalePrice || 0, 
      category: product.category || 'General', 
      description: product.description || '',
      available: product.available !== false
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await supabase.from('products').update({
        name: editForm.name,
        price: editForm.price,
        wholesale_price_bronze: editForm.wholesalePriceBronze,
        wholesale_price_silver: editForm.wholesalePriceSilver,
        wholesale_price_gold: editForm.wholesalePriceGold,
        category: editForm.category,
        description: editForm.description,
        available: editForm.available,
        updated_at: new Date().toISOString()
      }).eq('id', editingId);



      setProducts(prev => prev.map(p => p.id === editingId ? {
        ...p,
        name: editForm.name,
        price: editForm.price,
        wholesalePriceBronze: editForm.wholesalePriceBronze,
        wholesalePriceSilver: editForm.wholesalePriceSilver,
        wholesalePriceGold: editForm.wholesalePriceGold,
        category: editForm.category,
        description: editForm.description,
        available: editForm.available
      } : p));

      toast.success('Product updated successfully');
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error('Error updating product');
    }
  };

  const handleCancelEdit = () => setEditingId(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await supabase.from('products').delete().eq('id', id);



      setProducts(prev => prev.filter(p => p.id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast.success('Product deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete product');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} products?`)) return;

    try {
      const ids = Array.from(selectedIds);
      await supabase.from('products').delete().in('id', ids);



      const idSet = new Set(ids);
      setProducts(prev => prev.filter(p => !idSet.has(p.id)));
      setSelectedIds(new Set());
      toast.success(`Deleted ${ids.length} products`);
    } catch (err) {
      console.error(err);
      toast.error('Error deleting products.');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'available') return p.available !== false;
    if (statusFilter === 'unavailable') return p.available === false;
    return true;
  });

  if (!isAdmin) return <div className="p-8 text-red-500">Access Denied.</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      <div className="p-4 md:p-8 border-b border-gray-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F5132] flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[#0F5132]" />
              Knowledge Bank (Admin)
            </h1>
            <p className="text-gray-500 mt-1">Upload and manage product pricing database.</p>
          </div>
          
          <div className="flex gap-3">
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-[#0F5132] text-white px-4 py-2 rounded-md font-medium hover:bg-[#198754] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Bulk Import (CSV/Excel)'}
              </button>
            </div>
        </div>

        {uploadStatus && (
          <div className={`p-4 rounded-md mb-6 flex items-center gap-3 border ${uploadStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {uploadStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{uploadStatus.message}</span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('bronze')} 
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'bronze' ? 'border-b-2 border-[#0F5132] text-[#0F5132]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Bronze Plan
          </button>
          <button 
            onClick={() => setActiveTab('silver')} 
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'silver' ? 'border-b-2 border-gray-400 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Silver Plan
          </button>
          <button 
            onClick={() => setActiveTab('gold')} 
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'gold' ? 'border-b-2 border-yellow-500 text-yellow-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Gold Plan
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-4xl">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:border-transparent sm:text-sm shadow-sm"
                placeholder="Search products by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#198754] shadow-sm text-gray-700"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value="available">In Stock</option>
              <option value="unavailable">Out of Stock</option>
            </select>
          </div>
          {isAdmin && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={() => handleBulkSetAvailability(true)}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-md font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                title="Mark selected as Available"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Make Available ({selectedIds.size})
              </button>
              <button 
                onClick={() => handleBulkSetAvailability(false)}
                className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-md font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                title="Mark selected as Out of Stock"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Make Out of Stock ({selectedIds.size})
              </button>
              <button 
                onClick={handleBulkDelete}
                className="bg-red-50 text-red-600 px-3 py-2 rounded-md font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm border border-red-200 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIds.size})
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading price list...</div>
        ) : (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {isAdmin && (
                    <th className="px-6 py-4 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-[#0F5132] focus:ring-[#0F5132] cursor-pointer"
                        checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Availability</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right">Wholesale Price</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right">Unit Price</th>
                  {isAdmin && <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right w-20">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-[#0F5132] focus:ring-[#0F5132] cursor-pointer"
                          checked={selectedIds.has(product.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) newSet.add(product.id);
                            else newSet.delete(product.id);
                            setSelectedIds(newSet);
                          }}
                        />
                      </td>
                    )}
                    {editingId === product.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded p-1 text-sm outline-none focus:border-[#0F5132]"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          />
                          <input 
                            type="text" 
                            placeholder="Description (Optional)"
                            className="w-full border border-gray-300 rounded p-1 text-xs outline-none focus:border-[#0F5132] mt-2 text-gray-500"
                            value={editForm.description}
                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded p-1 text-sm outline-none focus:border-[#0F5132]"
                            value={editForm.category}
                            onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            className={`w-full border rounded p-1.5 text-xs font-semibold outline-none cursor-pointer ${
                              editForm.available ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : 'border-red-300 text-red-800 bg-red-50'
                            }`}
                            value={editForm.available ? 'available' : 'unavailable'}
                            onChange={(e) => setEditForm({...editForm, available: e.target.value === 'available'})}
                          >
                            <option value="available">● Available</option>
                            <option value="unavailable">● Out of Stock</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col gap-1">
                            <input 
                              type="number" 
                              className="w-full border border-gray-300 rounded p-1 text-xs text-right outline-none focus:border-[#0F5132]"
                              value={editForm.wholesalePriceBronze}
                              onChange={(e) => setEditForm({...editForm, wholesalePriceBronze: parseFloat(e.target.value) || 0})}
                              placeholder="Bronze"
                            />
                            <input 
                              type="number" 
                              className="w-full border border-gray-300 rounded p-1 text-xs text-right outline-none focus:border-[#0F5132]"
                              value={editForm.wholesalePriceSilver}
                              onChange={(e) => setEditForm({...editForm, wholesalePriceSilver: parseFloat(e.target.value) || 0})}
                              placeholder="Silver"
                            />
                            <input 
                              type="number" 
                              className="w-full border border-gray-300 rounded p-1 text-xs text-right outline-none focus:border-[#0F5132]"
                              value={editForm.wholesalePriceGold}
                              onChange={(e) => setEditForm({...editForm, wholesalePriceGold: parseFloat(e.target.value) || 0})}
                              placeholder="Gold"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <input 
                            type="number" 
                            className="w-full border border-gray-300 rounded p-1 text-sm text-right outline-none focus:border-[#0F5132]"
                            value={editForm.price}
                            onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})}
                            placeholder="Unit"
                          />
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <button onClick={handleSaveEdit} className="text-green-600 hover:bg-green-50 p-2 rounded-md"><Save className="w-4 h-4" /></button>
                            <button onClick={handleCancelEdit} className="text-gray-500 hover:bg-gray-100 p-2 rounded-md"><X className="w-4 h-4" /></button>
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4">
                          <div className="font-medium text-[#212529] flex items-center gap-3">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded-md border border-gray-200 shadow-sm shrink-0" />
                            ) : (
                              <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                                {product.name?.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                               <p className="font-semibold text-gray-900">{product.name}</p>
                               {product.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{product.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2.5 py-1 rounded-md">{product.category || 'General'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {isAdmin ? (
                            <select
                              value={product.available !== false ? 'available' : 'unavailable'}
                              onChange={(e) => handleToggleAvailability(product.id, e.target.value === 'available')}
                              className={`text-xs font-semibold rounded-full px-2.5 py-1 border transition-colors cursor-pointer outline-none ${
                                product.available !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              }`}
                            >
                              <option value="available" className="bg-white text-gray-800">● Available</option>
                              <option value="unavailable" className="bg-white text-gray-800">● Out of Stock</option>
                            </select>
                          ) : (
                            product.available !== false ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                <AlertCircle className="w-3 h-3" /> Out of Stock
                              </span>
                            )
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-gray-600">
                            {
  (() => {
    const wp = activeTab === 'gold' ? (product.wholesalePriceGold || product.wholesalePrice || 0) :
               activeTab === 'silver' ? (product.wholesalePriceSilver || product.wholesalePrice || 0) :
               (product.wholesalePriceBronze || product.wholesalePrice || 0);
    return wp ? `₦${wp.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';
  })()
}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-[#0F5132] text-lg">
                            ₦{product.price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleEditClick(product)} className="text-gray-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-md transition-colors" title="Edit Product">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(product.id)}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 5} className="px-6 py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">No products found</h3>
                      <p className="mt-1 text-gray-500 text-sm">
                        {searchTerm ? `No results for "${searchTerm}"` : (isAdmin ? 'Upload a CSV or Excel file to populate the price list.' : 'The price list is currently empty.')}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
