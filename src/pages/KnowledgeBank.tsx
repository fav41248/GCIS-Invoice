import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { BookOpen, Upload, Search, FileText, Trash2, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function KnowledgeBank() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
        const batch = writeBatch(db);
        chunk.forEach(row => {
          const name = row[nameKey];
          let price = row[priceKey];
          
          if (!name) return; // Skip empty names
          
          // Clean up price (remove currency symbols, commas, convert to number)
          if (typeof price === 'string') {
            price = parseFloat(price.replace(/[^0-9.-]+/g, ""));
          }
          if (isNaN(price)) price = 0;

          const docId = name.toString().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
          const docRef = doc(db, 'products', docId);
          batch.set(docRef, {
            name: name.toString(),
            price: price,
            category: row['Category'] || row['category'] || 'General',
            updatedAt: new Date().toISOString()
          }, { merge: true }); // Merge true allows updating existing without wiping other fields
        });
        
        // Retry logic for batch commit to handle transport errors
        let retries = 3;
        while (retries > 0) {
          try {
            await batch.commit();
            break;
          } catch (err: any) {
            retries--;
            if (retries === 0) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        // Small delay between chunks to prevent overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setUploadStatus({ type: 'success', message: `Successfully imported ${data.length} products!` });
    } catch (error: any) {
      setUploadStatus({ type: 'error', message: error.message || 'Error saving to database.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      console.error(err);
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
              <BookOpen className="w-8 h-8 text-[#198754]" />
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
                className="bg-[#198754] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#0F5132] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Bulk Import (CSV/Excel)'}
              </button>
            </div>
        </div>

        {uploadStatus && (
          <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 border ${uploadStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {uploadStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{uploadStatus.message}</span>
          </div>
        )}

        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#198754] focus:border-transparent sm:text-sm shadow-sm"
            placeholder="Search products by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading price list...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right">Unit Price</th>
                  {isAdmin && <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right w-20">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#212529] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        {product.name}
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
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center">
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
