const fs = require('fs');
let code = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');

// 1. Add state variables
code = code.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  `const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: 0, category: '' });`
);

// 2. Add Edit/Save functions
const handleFunctions = `
  const handleEditClick = (product: any) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, price: product.price, category: product.category || 'General' });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await setDoc(doc(db, 'products', editingId), {
        name: editForm.name,
        price: editForm.price,
        category: editForm.category,
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
`;
code = code.replace("  const handleDelete = async (id: string) => {", handleFunctions);

// 3. Add Edit2, X, Save icons to lucide-react imports if not present
if (!code.includes('Edit2')) {
  code = code.replace(/Trash2, /g, "Trash2, Edit2, X, Save, ");
}

// 4. Modify the table row mapping
const oldTr = `                {filteredProducts.map(product => (
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
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}`;

const newTr = `                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    {editingId === product.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded p-1 text-sm outline-none focus:border-[#0F5132]"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
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
                ))}`;

code = code.replace(oldTr, newTr);
fs.writeFileSync('src/pages/KnowledgeBank.tsx', code);
console.log("KnowledgeBank modified successfully");
