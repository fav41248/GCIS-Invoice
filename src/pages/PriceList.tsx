import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, FileText, Tag } from 'lucide-react';

export default function PriceList() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      <div className="p-4 md:p-8 border-b border-gray-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F5132] flex items-center gap-3">
              <Tag className="w-8 h-8 text-[#198754]" />
              Product Price List
            </h1>
            <p className="text-gray-500 mt-1">Search and confirm pricing for products in the central database.</p>
          </div>
        </div>

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
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">No products found</h3>
                      <p className="mt-1 text-gray-500 text-sm">
                        {searchTerm ? `No results for "${searchTerm}"` : 'The price list is currently empty.'}
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
