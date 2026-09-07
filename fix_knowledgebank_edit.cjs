const fs = require('fs');
let code = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');

// Update state
code = code.replace(
  "const [editForm, setEditForm] = useState({ name: '', price: 0, wholesalePrice: 0, category: '', description: '' });",
  "const [editForm, setEditForm] = useState({ name: '', price: 0, wholesalePriceBronze: 0, wholesalePriceSilver: 0, wholesalePriceGold: 0, category: '', description: '' });"
);

// handleEditClick
code = code.replace(
  "setEditForm({ name: product.name, price: product.price, wholesalePrice: product.wholesalePrice || 0, category: product.category || 'General', description: product.description || '' });",
  "setEditForm({ name: product.name, price: product.price, wholesalePriceBronze: product.wholesalePriceBronze || product.wholesalePrice || 0, wholesalePriceSilver: product.wholesalePriceSilver || product.wholesalePrice || 0, wholesalePriceGold: product.wholesalePriceGold || product.wholesalePrice || 0, category: product.category || 'General', description: product.description || '' });"
);

// handleSaveEdit
code = code.replace(
  "wholesalePrice: editForm.wholesalePrice,",
  "wholesalePriceBronze: editForm.wholesalePriceBronze,\n        wholesalePriceSilver: editForm.wholesalePriceSilver,\n        wholesalePriceGold: editForm.wholesalePriceGold,"
);

// Update UI
const oldUI = `<input 
                            type="number" 
                            className="w-full border border-gray-300 rounded p-1 text-sm text-right outline-none focus:border-[#0F5132]"
                            value={editForm.wholesalePrice}
                            onChange={(e) => setEditForm({...editForm, wholesalePrice: parseFloat(e.target.value) || 0})}
                            placeholder="Wholesale"
                          />`;

const newUI = `<div className="flex flex-col gap-1">
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
                          </div>`;

code = code.split(oldUI).join(newUI);

fs.writeFileSync('src/pages/KnowledgeBank.tsx', code);
console.log('Fixed KnowledgeBank edit UI');
