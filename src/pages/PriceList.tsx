import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/db';
import { useAuth } from '../AuthContext';
import { uploadFileToGoogleDrive, compressFileToDataUrl } from '../lib/drive';
import { Trash2, Edit2, Search, Download, Tag, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Image as ImageIcon, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToCSV } from '../lib/utils';

export default function PriceList() {
  const { user, isAdmin, isAuditor, isSalesRep, isSalesAgent, isStoreKeeper, canViewWholesale, hasPackages } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [available, setAvailable] = useState<boolean>(true);
  const [price, setPrice] = useState('');
  const [wholesalePriceBronze, setWholesalePriceBronze] = useState('');
  const [wholesalePriceSilver, setWholesalePriceSilver] = useState('');
  const [wholesalePriceGold, setWholesalePriceGold] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const categories = useMemo(() => {
    const cats = items
      .map(item => (typeof item.category === 'string' ? item.category.trim() : ''))
      .filter(Boolean);
    const unique = [...new Set(cats)].sort((a, b) => a.localeCompare(b));
    if (unique.length > 0) return unique;
    return ['Batteries', 'Charge Controllers', 'Inverters', 'Mounting & Accessories', 'Solar Panels', 'General'];
  }, [items]);

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

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      try {
        const result = await uploadFileToGoogleDrive(file);
        setImageUrl(result.webViewLink || result.thumbnailLink || '');
        toast.success('Product image uploaded to Company Google Drive successfully!');
      } catch (driveErr) {
        // Fallback to high-quality compressed image stored directly
        const dataUrl = await compressFileToDataUrl(file);
        setImageUrl(dataUrl);
        toast.success('Product image processed and saved securely!');
      }
    } catch (error: any) {
      toast.error('Failed to upload image: ' + (error.message || error));
    } finally {
      setUploadingImage(false);
    }
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = category.trim();
    if (!finalCategory) {
      toast.error('Please select or enter a category');
      return;
    }
    try {
      const id = editId || `item_${Date.now()}`;
      const itemData: any = {
        name,
        description,
        category: finalCategory,
        price: Number(price),
        available: available,
        imageUrl: imageUrl.trim() || null,
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

  const handleToggleAvailability = async (id: string, newAvailable: boolean) => {
    try {
      await setDoc(doc(db, 'products', id), {
        available: newAvailable,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success(newAvailable ? 'Marked as Available' : 'Marked as Out of Stock');
    } catch (error) {
      if (!handleFirestoreError(error, OperationType.UPDATE, `products/${id}`)) toast.error('Failed to update availability');
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
    const itemCat = (item.category || '').trim();
    setCategory(itemCat);
    setAvailable(item.available !== false);
    setPrice(item.price.toString());
    setWholesalePriceBronze(item.wholesalePriceBronze?.toString() || item.wholesalePrice?.toString() || '');
    setWholesalePriceSilver(item.wholesalePriceSilver?.toString() || item.wholesalePrice?.toString() || '');
    setWholesalePriceGold(item.wholesalePriceGold?.toString() || item.wholesalePrice?.toString() || '');
    setImageUrl(item.imageUrl || '');
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditId('');
    setName('');
    setDescription('');
    setCategory('');
    setAvailable(true);
    setPrice('');
    setWholesalePriceBronze('');
    setWholesalePriceSilver('');
    setWholesalePriceGold('');
    setImageUrl('');
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
    if (selectedCategory) {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (statusFilter === 'available') {
      result = result.filter(item => item.available !== false);
    } else if (statusFilter === 'unavailable') {
      result = result.filter(item => item.available === false);
    }
    
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
      } else if (sortField === 'available') {
        aVal = a.available !== false ? 1 : 0;
        bVal = b.available !== false ? 1 : 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [items, searchTerm, selectedCategory, statusFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
  const currentItems = filteredAndSortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const dataToExport = filteredAndSortedItems.map(item => {
      const row: any = {
        'Service/Product Name': item.name,
        'Category': item.category || '',
        'Description': item.description || '',
        'Availability': item.available !== false ? 'Available' : 'Unavailable',
        'Unit Price (₦)': item.price || 0,
        'Image URL': item.imageUrl || ''
      };
      if (canViewWholesale) {
        row['Wholesale Bronze (₦)'] = item.wholesalePriceBronze || item.wholesalePrice || 0;
        row['Wholesale Silver (₦)'] = item.wholesalePriceSilver || item.wholesalePrice || 0;
        row['Wholesale Gold (₦)'] = item.wholesalePriceGold || item.wholesalePrice || 0;
      }
      return row;
    });
    exportToCSV(dataToExport, `pricelist_export_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Price list exported successfully');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-[#198754]" /> Price List & Product Catalog
          </h1>
          <p className="text-sm text-gray-500">Browse products, wholesale tiers, stock status, and product images.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#198754] outline-none"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#198754] outline-none"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
          >
            <option value="all">All Stock Status</option>
            <option value="available">In Stock</option>
            <option value="unavailable">Out of Stock</option>
          </select>
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
          {(isAdmin || isStoreKeeper) && (
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap shadow-sm">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(isAdmin || isStoreKeeper) && (<div className="lg:col-span-1">
          <form onSubmit={saveItem} className="bg-white p-6 rounded-md border border-gray-200 shadow-sm sticky top-6 space-y-4">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">{isEditing ? 'Edit Item' : 'Add New Item'}</h2>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Service / Product Name *</label>
              <input required type="text" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category *</label>
              <select
                required
                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none bg-white cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">-- Select Category --</option>
                {category && !categories.includes(category) && (
                  <option value={category}>{category}</option>
                )}
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Stock Availability</label>
              <select
                className={`w-full border rounded p-2 text-sm font-medium outline-none cursor-pointer ${
                  available 
                    ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800 focus:ring-2 focus:ring-[#198754]' 
                    : 'border-red-300 bg-red-50/50 text-red-800 focus:ring-2 focus:ring-red-400'
                }`}
                value={available ? 'available' : 'unavailable'}
                onChange={(e) => setAvailable(e.target.value === 'available')}
              >
                <option value="available">● Available (In Stock)</option>
                <option value="unavailable">● Unavailable (Out of Stock)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Product Image (Saved to Company Drive)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleProductImageUpload} 
                  disabled={uploadingImage}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" 
                />
              </div>
              {uploadingImage && <p className="text-xs text-blue-600 mt-1">Uploading image to Google Drive...</p>}
              {imageUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={imageUrl} alt="Preview" className="w-12 h-12 object-cover rounded border" />
                  <span className="text-xs text-emerald-600 font-medium">Image linked successfully</span>
                </div>
              )}
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
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Unit Price (₦) *</label>
              <input required type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={price} onChange={e => setPrice(e.target.value)} />
            </div>

            <div className="pt-2 flex gap-3">
              {isEditing && (
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors text-sm">
                  Cancel
                </button>
              )}
              <button type="submit" className="flex-1 bg-[#198754] text-white py-2 rounded-md font-medium hover:bg-[#0F5132] transition-colors text-sm shadow-sm">
                {isEditing ? 'Update Item' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>)}

        <div className={(isAdmin || isStoreKeeper) ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Item Details <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1">Category <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('available')}>
                    <div className="flex items-center gap-1">Availability <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  {canViewWholesale && (
                    isAdmin ? (
                      <th className="px-6 py-4 font-bold text-gray-600">
                        <div className="flex items-center gap-1">Wholesale (B / S / G)</div>
                      </th>
                    ) : isSalesAgent ? (
                      <th className="px-6 py-4 font-bold text-gray-600">
                        <div className="flex items-center gap-1">Wholesale Price</div>
                      </th>
                    ) : (
                      <th className="px-6 py-4 font-bold text-gray-600">
                        <div className="flex items-center gap-1">Wholesale Price</div>
                      </th>
                    )
                  )}
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors text-right" onClick={() => handleSort('price')}>
                    <div className="flex items-center justify-end gap-1">Unit Price <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-4 font-bold text-gray-600 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                   [...Array(4)].map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td colSpan={canViewWholesale ? (isAdmin ? 6 : 5) : 4} className="px-6 py-4 text-center text-gray-400">Loading...</td>
                    </tr>
                  ))
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={canViewWholesale ? (isAdmin ? 6 : 5) : 4} className="px-6 py-12 text-center text-gray-500">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-md border border-gray-200 shadow-sm shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                              {item.name?.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-gray-900 block">{item.name}</span>
                            {item.description && <span className="text-xs text-gray-500 line-clamp-1">{item.description}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-medium">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(isAdmin || isStoreKeeper) ? (
                          <button
                            onClick={() => handleToggleAvailability(item.id, item.available === false)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                              item.available !== false 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                            }`}
                            title="Click to toggle availability"
                          >
                            {item.available !== false ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {item.available !== false ? 'Available' : 'Out of Stock'}
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.available !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {item.available !== false ? 'Available' : 'Out of Stock'}
                          </span>
                        )}
                      </td>
                      {canViewWholesale && (
                        <td className="px-6 py-4 text-gray-700 text-sm font-mono">
                          {isAdmin ? (
                            <div className="text-xs space-y-0.5">
                              <div><span className="font-semibold text-orange-800">B:</span> ₦{Number(item.wholesalePriceBronze || item.wholesalePrice || 0).toLocaleString()}</div>
                              <div><span className="font-semibold text-slate-700">S:</span> ₦{Number(item.wholesalePriceSilver || item.wholesalePrice || 0).toLocaleString()}</div>
                              <div><span className="font-semibold text-amber-800">G:</span> ₦{Number(item.wholesalePriceGold || item.wholesalePrice || 0).toLocaleString()}</div>
                            </div>
                          ) : isSalesAgent ? (
                            <span>
                              ₦{Number(
                                (user?.pricingTier === 'gold' 
                                  ? item.wholesalePriceGold 
                                  : user?.pricingTier === 'silver' 
                                  ? item.wholesalePriceSilver 
                                  : item.wholesalePriceBronze) || item.wholesalePrice || 0
                              ).toLocaleString()}
                            </span>
                          ) : (
                            <span>₦{Number(item.wholesalePriceBronze || item.wholesalePrice || 0).toLocaleString()}</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-gray-900 font-bold text-right font-mono">
                        ₦{Number(item.price || 0).toLocaleString()}
                      </td>
                      {(isAdmin || isStoreKeeper) && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(item)} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors" title="Edit Item">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteItem(item.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors" title="Delete Item">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages} ({filteredAndSortedItems.length} items total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
