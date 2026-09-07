const fs = require('fs');
let code = fs.readFileSync('src/pages/PriceList.tsx', 'utf8');

// Replace wholesalePrice state with 3 states
code = code.replace(
  "const [wholesalePrice, setWholesalePrice] = useState('');",
  "const [wholesalePriceBronze, setWholesalePriceBronze] = useState('');\n  const [wholesalePriceSilver, setWholesalePriceSilver] = useState('');\n  const [wholesalePriceGold, setWholesalePriceGold] = useState('');"
);

// handleEdit
code = code.replace(
  "setWholesalePrice(item.wholesalePrice?.toString() || '');",
  "setWholesalePriceBronze(item.wholesalePriceBronze?.toString() || item.wholesalePrice?.toString() || '');\n    setWholesalePriceSilver(item.wholesalePriceSilver?.toString() || item.wholesalePrice?.toString() || '');\n    setWholesalePriceGold(item.wholesalePriceGold?.toString() || item.wholesalePrice?.toString() || '');"
);

// resetForm
code = code.replace(
  "setWholesalePrice('');",
  "setWholesalePriceBronze('');\n    setWholesalePriceSilver('');\n    setWholesalePriceGold('');"
);

// handleSubmit add/edit
code = code.replace(
  "wholesalePrice: Number(wholesalePrice) || 0,",
  "wholesalePriceBronze: Number(wholesalePriceBronze) || 0,\n        wholesalePriceSilver: Number(wholesalePriceSilver) || 0,\n        wholesalePriceGold: Number(wholesalePriceGold) || 0,"
);
code = code.replace(
  "wholesalePrice: Number(wholesalePrice) || 0",
  "wholesalePriceBronze: Number(wholesalePriceBronze) || 0,\n          wholesalePriceSilver: Number(wholesalePriceSilver) || 0,\n          wholesalePriceGold: Number(wholesalePriceGold) || 0"
);

// Form UI
const oldWholesaleInput = `<div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Cost (₦) (Optional)</label>
                <input
                  type="number"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
                  placeholder="0.00"
                />
              </div>`;

const newWholesaleInputs = `<div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Bronze (₦)</label>
                <input
                  type="number"
                  value={wholesalePriceBronze}
                  onChange={(e) => setWholesalePriceBronze(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Silver (₦)</label>
                <input
                  type="number"
                  value={wholesalePriceSilver}
                  onChange={(e) => setWholesalePriceSilver(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Gold (₦)</label>
                <input
                  type="number"
                  value={wholesalePriceGold}
                  onChange={(e) => setWholesalePriceGold(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
                  placeholder="0.00"
                />
              </div>`;

code = code.replace(oldWholesaleInput, newWholesaleInputs);

// Table Header
code = code.replace(
  `<th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('price')}>
                    <div className="flex items-center gap-1">
                      Retail Price {sortField === 'price' && <ArrowUpDown className="w-4 h-4" />}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Actions</th>`,
  `<th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('price')}>
                    <div className="flex items-center gap-1">
                      Retail Price {sortField === 'price' && <ArrowUpDown className="w-4 h-4" />}
                    </div>
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">
                      Wholesale (B / S / G)
                    </th>
                  )}
                  <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Actions</th>`
);

// Table Body
const oldTableCells = `<td className="px-6 py-4 font-mono font-medium text-[#0F5132]">
                        ₦{Number(item.price).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">`;

const newTableCells = `<td className="px-6 py-4 font-mono font-medium text-[#0F5132]">
                        ₦{Number(item.price).toLocaleString()}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 font-mono text-gray-500 text-sm">
                          ₦{Number(item.wholesalePriceBronze || item.wholesalePrice || 0).toLocaleString()} / 
                          ₦{Number(item.wholesalePriceSilver || item.wholesalePrice || 0).toLocaleString()} / 
                          ₦{Number(item.wholesalePriceGold || item.wholesalePrice || 0).toLocaleString()}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">`;

code = code.replace(oldTableCells, newTableCells);


fs.writeFileSync('src/pages/PriceList.tsx', code);
console.log('Fixed PriceList.tsx');
