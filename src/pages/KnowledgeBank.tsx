import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { BookOpen, Upload, Search, FileText, Trash2, Edit2, X, Save, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function KnowledgeBank() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: 0, category: '', description: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort alphabetically
      data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setProducts(data);
      setLoading(false);
    });
    return unsubscribe;
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
            await processData(results.data);
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
          await processData(data);
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

  const processData = async (data: any[]) => {
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
      const priceKey = keys.find(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('amount'));

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
        // Retry logic for batch commit to handle transport errors
        let retries = 3;
        while (retries > 0) {
          try {
            const batch = writeBatch(db);
            chunk.forEach(row => {
              const name = row[nameKey];
              let price = row[priceKey];
              
              if (!name) return; // Skip empty names
              
              if (typeof price === 'string') {
                price = parseFloat(price.replace(/[^0-9.-]+/g, ""));
              }
              if (isNaN(price)) price = 0;

              const docId = name.toString().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
              const docRef = doc(db, 'products', docId);
              const productData: any = {
                name: name.toString(),
                price: price,
                updatedAt: new Date().toISOString()
              };
              
              const category = row['Category'] || row['category'];
              if (category) productData.category = category;
              else productData.category = 'General';

              const desc = row['Description'] || row['description'] || row['Desc'] || row['desc'];
              if (desc) productData.description = desc;
              
              // Only overwrite with new description if it is provided and detailed
              // Actually let's capture all extra fields dynamically
              Object.keys(row).forEach(k => {
                const lowerK = k.toLowerCase();
                if (!lowerK.includes('name') && !lowerK.includes('price') && !lowerK.includes('category') && !lowerK.includes('desc') && row[k]) {
                   productData[k] = row[k];
                }
              });

              batch.set(docRef, productData, { merge: true }); 
            });
            
            await batch.commit();
            break;
          } catch (err: any) {
            retries--;
            if (retries === 0) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setUploadStatus({ type: 'success', message: `Successfully imported ${data.length} products!` });
    } catch (error: any) {
      setUploadStatus({ type: 'error', message: error.message || 'Error saving to database.' });
    } finally {
      setIsUploading(false);
    }
  };


  const handleEditClick = (product: any) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, price: product.price, category: product.category || 'General', description: product.description || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await setDoc(doc(db, 'products', editingId), {
        name: editForm.name,
        price: editForm.price,
        category: editForm.category,
        description: editForm.description,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Error updating product');
    }
  };

  const handleCancelEdit = () => setEditingId(null);

  const handleDelete = async (id: string) => {

    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} products?`)) return;

    try {
      const ids = Array.from(selectedIds);
      const chunks = [];
      for (let i = 0; i < ids.length; i += 400) {
        chunks.push(ids.slice(i, i + 400));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, 'products', id));
        });
        await batch.commit();
      }
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      alert('Error deleting products.');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <div className="flex justify-between items-center max-w-2xl">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] focus:border-transparent sm:text-sm shadow-sm"
              placeholder="Search products by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && selectedIds.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="ml-4 bg-red-50 text-red-600 px-4 py-3 rounded-md font-medium hover:bg-red-100 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading price list...</div>
        ) : (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
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
                        <td className="px-6 py-4 text-right">
                          <input 
                            type="number" 
                            className="w-full border border-gray-300 rounded p-1 text-sm text-right outline-none focus:border-[#0F5132]"
                            value={editForm.price}
                            onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})}
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
                          <div className="font-medium text-[#212529] flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                               <p>{product.name}</p>
                               {product.description && <p className="text-gray-500 text-xs mt-1 max-w-sm font-normal">{product.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2.5 py-1 rounded-md">{product.category || 'General'}</span>
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
                    <td colSpan={isAdmin ? 5 : 3} className="px-6 py-12 text-center">
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
