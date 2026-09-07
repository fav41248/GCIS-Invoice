import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import { Trash2, Edit2, Search, Download, Tag, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToCSV } from '../lib/utils';

export default function PriceList() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [wholesalePriceBronze, setWholesalePriceBronze] = useState('');
  const [wholesalePriceSilver, setWholesalePriceSilver] = useState('');
  const [wholesalePriceGold, setWholesalePriceGold] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setLoading(false);
    }, (error) => {
      if (!handleFirestoreError(error, OperationType.LIST, 'products')) toast.error('Failed to load price list.');
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editId || `item_${Date.now()}`;
      const itemData: any = {
        name,
        description,
        price: Number(price),
        updatedAt: new Date().toISOString(),
        createdBy: user?.username
      };
      if (wholesalePriceBronze !== '') itemData.wholesalePriceBronze = Number(wholesalePriceBronze);
      else itemData.wholesalePriceBronze = null;
      if (wholesalePriceSilver !== '') itemData.wholesalePriceSilver = Number(wholesalePriceSilver);
      else itemData.wholesalePriceSilver = null;
      if (wholesalePriceGold !== '') itemData.wholesalePriceGold = Number(wholesalePriceGold);
      else itemData.wholesalePriceGold = null;
      await setDoc(doc(db, 'products', id), itemData, { merge: true });
      
      toast.success(editId ? 'Item updated successfully' : 'Item added successfully');
      resetForm();
    } catch (error) {
      if (!handleFirestoreError(error, OperationType.CREATE, 'products')) toast.error('Failed to save item');
    }
  };

  const deleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success('Item deleted successfully');
      } catch (error) {
        if (!handleFirestoreError(error, OperationType.DELETE, `products/${id}`)) toast.error('Failed to delete item');
      }
    }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    setWholesalePriceBronze(item.wholesalePriceBronze?.toString() || item.wholesalePrice?.toString() || '');
    setWholesalePriceSilver(item.wholesalePriceSilver?.toString() || item.wholesalePrice?.toString() || '');
    setWholesalePriceGold(item.wholesalePriceGold?.toString() || item.wholesalePrice?.toString() || '');
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditId('');
    setName('');
    setDescription('');
    setPrice('');
    setWholesalePriceBronze('');
    setWholesalePriceSilver('');
    setWholesalePriceGold('');
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

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name?.toLowerCase().includes(lower) || 
        item.description?.toLowerCase().includes(lower)
      );
    }
    
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'price') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [items, searchTerm, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
  const currentItems = filteredAndSortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const dataToExport = filteredAndSortedItems.map(item => {
      const exportData: any = {
        'Service/Product Name': item.name,
        'Description': item.description,
      };

      if (isAdmin) {
        exportData['Wholesale Price (B)'] = item.wholesalePriceBronze || item.wholesalePrice || '';
        exportData['Wholesale Price (S)'] = item.wholesalePriceSilver || item.wholesalePrice || '';
        exportData['Wholesale Price (G)'] = item.wholesalePriceGold || item.wholesalePrice || '';
        exportData['Unit Price'] = item.price;
        exportData['Added By'] = item.createdBy;
      } else {
        exportData['Wholesale Price'] = user?.pricingTier === 'gold' && (item.wholesalePriceGold || item.wholesalePrice) ? item.wholesalePriceGold || item.wholesalePrice : 
                                        user?.pricingTier === 'silver' && (item.wholesalePriceSilver || item.wholesalePrice) ? item.wholesalePriceSilver || item.wholesalePrice : 
                                        item.wholesalePriceBronze || item.wholesalePrice || '';
        exportData['Unit Price'] = item.price;
      }

      return exportData;
    });
    
    exportToCSV(dataToExport, 'products.csv');
    toast.success('Price list exported');
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Price List</h1>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search products..."
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
        {isAdmin && (<div className="lg:col-span-1">
          <form onSubmit={saveItem} className="bg-white p-6 rounded-md border border-gray-200 shadow-sm sticky top-6">
            <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Item' : 'Add New Item'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Service / Product Name</label>
                <input required type="text" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Description (Optional)</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Wholesale Bronze (₦)</label>
                <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={wholesalePriceBronze} onChange={e => setWholesalePriceBronze(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Wholesale Silver (₦)</label>
                <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={wholesalePriceSilver} onChange={e => setWholesalePriceSilver(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Wholesale Gold (₦)</label>
                <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={wholesalePriceGold} onChange={e => setWholesalePriceGold(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Unit Price (₦)</label>
                <input required type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {isEditing && (
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              )}
              <button type="submit" className="flex-1 bg-[#198754] text-white py-2 rounded-md font-medium hover:bg-[#0F5132] transition-colors">
                {isEditing ? 'Update Item' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>)}
        <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Item Details <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  {isAdmin ? (
                    <th className="px-6 py-4 font-bold text-gray-600">
                      <div className="flex items-center gap-1">Wholesale (B/S/G)</div>
                    </th>
                  ) : (
                    <th className="px-6 py-4 font-bold text-gray-600">
                      <div className="flex items-center gap-1">Wholesale Price</div>
                    </th>
                  )}
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('price')}>
                    <div className="flex items-center gap-1">Unit Price <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
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
                        <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-16 ml-auto animate-pulse"></div></td>
                    </tr>
                  ))
                ) : currentItems.length > 0 ? (
                  currentItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        {item.description && <p className="text-gray-500 text-xs mt-1 max-w-sm">{item.description}</p>}
                      </td>
                      {isAdmin ? (
                        <td className="px-6 py-4 font-mono font-medium text-gray-500 text-xs whitespace-nowrap">
                          {item.wholesalePriceBronze || item.wholesalePrice ? `₦${Number(item.wholesalePriceBronze || item.wholesalePrice).toLocaleString()}` : '-'} / <br/>
                          {item.wholesalePriceSilver || item.wholesalePrice ? `₦${Number(item.wholesalePriceSilver || item.wholesalePrice).toLocaleString()}` : '-'} / <br/>
                          {item.wholesalePriceGold || item.wholesalePrice ? `₦${Number(item.wholesalePriceGold || item.wholesalePrice).toLocaleString()}` : '-'}
                        </td>
                      ) : (
                        <td className="px-6 py-4 font-mono font-medium text-gray-500">
                          {user?.pricingTier === 'gold' && (item.wholesalePriceGold || item.wholesalePrice) ? `₦${Number(item.wholesalePriceGold || item.wholesalePrice).toLocaleString()}` : 
                           user?.pricingTier === 'silver' && (item.wholesalePriceSilver || item.wholesalePrice) ? `₦${Number(item.wholesalePriceSilver || item.wholesalePrice).toLocaleString()}` : 
                           (item.wholesalePriceBronze || item.wholesalePrice) ? `₦${Number(item.wholesalePriceBronze || item.wholesalePrice).toLocaleString()}` : '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 font-mono font-bold text-[#0F5132]">
                        ₦{Number(item.price).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isAdmin && (<button 
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-[#0F5132] hover:bg-green-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>)}
                          {isAdmin && (
                            <button 
                              onClick={() => deleteItem(item.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                         <Tag className="w-12 h-12 text-gray-300 mb-3" />
                         <p className="text-lg font-medium text-gray-900 mb-1">{searchTerm ? "No matching items found" : "No price list items yet"}</p>
                         <p className="text-sm">Use the form to add your services.</p>
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
                Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)}</span> of <span className="font-medium">{filteredAndSortedItems.length}</span> items
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
