const fs = require('fs');
let code = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');

const oldFindKeys = `      // Find the probable column names for Name and Price
      const firstRow = data[0];
      const keys = Object.keys(firstRow);
      
      const nameKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('product') || k.toLowerCase().includes('item'));
      const priceKey = keys.find(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('amount'));

      if (!nameKey || !priceKey) {`;

const newFindKeys = `      // Find the probable column names for Name and Price
      const firstRow = data[0];
      const keys = Object.keys(firstRow);
      
      const nameKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('product') || k.toLowerCase().includes('item'));
      const wholesalePriceKey = keys.find(k => k.toLowerCase().includes('wholesale') && (k.toLowerCase().includes('price') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('amount')));
      const priceKey = keys.find(k => (k.toLowerCase().includes('price') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('amount')) && k !== wholesalePriceKey);

      if (!nameKey || !priceKey) {`;

code = code.replace(oldFindKeys, newFindKeys);

const oldExtract = `              let price = row[priceKey];
              
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
              };`;

const newExtract = `              let price = row[priceKey];
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

              const docId = name.toString().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
              const docRef = doc(db, 'products', docId);
              const productData: any = {
                name: name.toString(),
                price: price,
                updatedAt: new Date().toISOString()
              };
              if (wholesalePrice !== undefined) {
                productData.wholesalePrice = wholesalePrice;
              }`;

code = code.replace(oldExtract, newExtract);

// Update KnowledgeBank headers
const oldHeaders = `<th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right">Unit Price</th>
                  {isAdmin && <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right w-20">Actions</th>}`;

const newHeaders = `<th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right">Wholesale Price</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right">Unit Price</th>
                  {isAdmin && <th className="px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right w-20">Actions</th>}`;

code = code.replace(oldHeaders, newHeaders);

// KnowledgeBank edit state
const oldEditState = `const [editForm, setEditForm] = useState({ name: '', price: 0, category: '', description: '' });`;
const newEditState = `const [editForm, setEditForm] = useState({ name: '', price: 0, wholesalePrice: 0, category: '', description: '' });`;
code = code.replace(oldEditState, newEditState);

const oldHandleEditClick = `setEditForm({ name: product.name, price: product.price, category: product.category || 'General', description: product.description || '' });`;
const newHandleEditClick = `setEditForm({ name: product.name, price: product.price, wholesalePrice: product.wholesalePrice || 0, category: product.category || 'General', description: product.description || '' });`;
code = code.replace(oldHandleEditClick, newHandleEditClick);

const oldHandleSaveEdit = `        name: editForm.name,
        price: editForm.price,
        category: editForm.category,
        description: editForm.description,
        updatedAt: new Date().toISOString()`;
const newHandleSaveEdit = `        name: editForm.name,
        price: editForm.price,
        wholesalePrice: editForm.wholesalePrice,
        category: editForm.category,
        description: editForm.description,
        updatedAt: new Date().toISOString()`;
code = code.replace(oldHandleSaveEdit, newHandleSaveEdit);

const oldColSpan = `<td colSpan={isAdmin ? 5 : 3} className="px-6 py-12 text-center">`;
const newColSpan = `<td colSpan={isAdmin ? 6 : 4} className="px-6 py-12 text-center">`;
code = code.replace(oldColSpan, newColSpan);

const oldEditRow = `<td className="px-6 py-4 text-right">
                          <input 
                            type="number" 
                            className="w-full border border-gray-300 rounded p-1 text-sm text-right outline-none focus:border-[#0F5132]"
                            value={editForm.price}
                            onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})}
                          />
                        </td>`;
const newEditRow = `<td className="px-6 py-4 text-right">
                          <input 
                            type="number" 
                            className="w-full border border-gray-300 rounded p-1 text-sm text-right outline-none focus:border-[#0F5132]"
                            value={editForm.wholesalePrice}
                            onChange={(e) => setEditForm({...editForm, wholesalePrice: parseFloat(e.target.value) || 0})}
                            placeholder="Wholesale"
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <input 
                            type="number" 
                            className="w-full border border-gray-300 rounded p-1 text-sm text-right outline-none focus:border-[#0F5132]"
                            value={editForm.price}
                            onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})}
                            placeholder="Unit"
                          />
                        </td>`;
code = code.replace(oldEditRow, newEditRow);

const oldDisplayRow = `<td className="px-6 py-4 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2.5 py-1 rounded-md">{product.category || 'General'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-[#0F5132] text-lg">
                            ₦{product.price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>`;
const newDisplayRow = `<td className="px-6 py-4 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2.5 py-1 rounded-md">{product.category || 'General'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-gray-600">
                            {product.wholesalePrice ? \`₦\${product.wholesalePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}\` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-[#0F5132] text-lg">
                            ₦{product.price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>`;
code = code.replace(oldDisplayRow, newDisplayRow);

fs.writeFileSync('src/pages/KnowledgeBank.tsx', code);
console.log("Updated KnowledgeBank.tsx");
