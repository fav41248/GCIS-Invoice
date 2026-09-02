const fs = require('fs');
let code = fs.readFileSync('src/pages/PriceList.tsx', 'utf8');

const oldHeaders = `<th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('price')}>
                    <div className="flex items-center gap-1">Price <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>`;
const newHeaders = `<th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('wholesalePrice')}>
                    <div className="flex items-center gap-1">Wholesale <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>
                  <th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('price')}>
                    <div className="flex items-center gap-1">Unit Price <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>`;
code = code.replace(oldHeaders, newHeaders);

const oldSkeletons = `<td className="px-6 py-4">
                        <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>`;
const newSkeletons = `<td className="px-6 py-4">
                        <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>`;
code = code.replace(oldSkeletons, newSkeletons);

const oldDisplayRows = `<td className="px-6 py-4 font-mono font-medium">
                        ₦{Number(item.price).toLocaleString()}
                      </td>`;
const newDisplayRows = `<td className="px-6 py-4 font-mono font-medium text-gray-500">
                        {item.wholesalePrice ? \`₦\${Number(item.wholesalePrice).toLocaleString()}\` : '-'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-[#0F5132]">
                        ₦{Number(item.price).toLocaleString()}
                      </td>`;
code = code.replace(oldDisplayRows, newDisplayRows);

const oldColSpan = `<td colSpan={3} className="px-6 py-12 text-center text-gray-500">`;
const newColSpan = `<td colSpan={4} className="px-6 py-12 text-center text-gray-500">`;
code = code.replace(oldColSpan, newColSpan);

// Also need to add Wholesale price to the manual form!
const oldStatePrice = `const [price, setPrice] = useState('');`;
const newStatePrice = `const [price, setPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');`;
code = code.replace(oldStatePrice, newStatePrice);

const oldResetForm = `const resetForm = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setPrice('');
  };`;
const newResetForm = `const resetForm = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setPrice('');
    setWholesalePrice('');
  };`;
code = code.replace(oldResetForm, newResetForm);

const oldHandleEdit = `const handleEdit = (item: any) => {
    setEditId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    
    // Scroll to top of page to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };`;
const newHandleEdit = `const handleEdit = (item: any) => {
    setEditId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    setWholesalePrice(item.wholesalePrice?.toString() || '');
    
    // Scroll to top of page to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };`;
code = code.replace(oldHandleEdit, newHandleEdit);

const oldSaveItem = `      await setDoc(doc(db, 'products', id), {
        name,
        description,
        price: Number(price),
        updatedAt: new Date().toISOString(),
        createdBy: user?.username
      }, { merge: true });`;
const newSaveItem = `      const itemData: any = {
        name,
        description,
        price: Number(price),
        updatedAt: new Date().toISOString(),
        createdBy: user?.username
      };
      if (wholesalePrice !== '') {
        itemData.wholesalePrice = Number(wholesalePrice);
      } else {
        itemData.wholesalePrice = null; // Clear it if emptied
      }
      await setDoc(doc(db, 'products', id), itemData, { merge: true });`;
code = code.replace(oldSaveItem, newSaveItem);

const oldFormInputs = `<div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Price (₦)</label>
                <input required type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={price} onChange={e => setPrice(e.target.value)} />
              </div>`;
const newFormInputs = `<div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Wholesale Price (₦) - Optional</label>
                <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Unit Price (₦)</label>
                <input required type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={price} onChange={e => setPrice(e.target.value)} />
              </div>`;
code = code.replace(oldFormInputs, newFormInputs);

const oldExport = `    const dataToExport = filteredAndSortedItems.map(item => ({
      'Service/Product Name': item.name,
      'Description': item.description,
      'Price': item.price,
      'Added By': item.createdBy
    }));`;
const newExport = `    const dataToExport = filteredAndSortedItems.map(item => ({
      'Service/Product Name': item.name,
      'Description': item.description,
      'Wholesale Price': item.wholesalePrice || '',
      'Unit Price': item.price,
      'Added By': item.createdBy
    }));`;
code = code.replace(oldExport, newExport);

fs.writeFileSync('src/pages/PriceList.tsx', code);
console.log("Updated PriceList.tsx");
