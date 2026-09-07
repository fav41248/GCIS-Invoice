const fs = require('fs');

// Fix KnowledgeBank.tsx
let kb = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');
kb = kb.replace('const { isAdmin } = useAuth();', 'const { isAdmin, user } = useAuth();');
fs.writeFileSync('src/pages/KnowledgeBank.tsx', kb);

// Fix PriceList.tsx
let pl = fs.readFileSync('src/pages/PriceList.tsx', 'utf8');

// The save data part
const oldSaveData = `      if (wholesalePrice !== '') {
        itemData.wholesalePrice = Number(wholesalePrice);
      } else {
        itemData.wholesalePrice = null; // Clear it if emptied
      }`;

const newSaveData = `      if (wholesalePriceBronze !== '') itemData.wholesalePriceBronze = Number(wholesalePriceBronze);
      else itemData.wholesalePriceBronze = null;
      if (wholesalePriceSilver !== '') itemData.wholesalePriceSilver = Number(wholesalePriceSilver);
      else itemData.wholesalePriceSilver = null;
      if (wholesalePriceGold !== '') itemData.wholesalePriceGold = Number(wholesalePriceGold);
      else itemData.wholesalePriceGold = null;`;

pl = pl.replace(oldSaveData, newSaveData);

// The export part
const oldExport = `'Wholesale Price': item.wholesalePrice || '',`;
const newExport = `'Wholesale Price (B)': item.wholesalePriceBronze || item.wholesalePrice || '',\n      'Wholesale Price (S)': item.wholesalePriceSilver || item.wholesalePrice || '',\n      'Wholesale Price (G)': item.wholesalePriceGold || item.wholesalePrice || '',`;

pl = pl.replace(oldExport, newExport);

// The actual input UI (I missed it because I searched for a different label)
const oldInput = `<div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Wholesale Price (₦) - Optional</label>
                <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)} />
              </div>`;

const newInput = `<div>
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
              </div>`;

pl = pl.replace(oldInput, newInput);

// Table header
const oldTh = `<th className="px-6 py-4 font-bold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('wholesalePrice')}>
                    <div className="flex items-center gap-1">Wholesale <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                  </th>`;

const newTh = `{isAdmin && <th className="px-6 py-4 font-bold text-gray-600">
                    <div className="flex items-center gap-1">Wholesale (B/S/G)</div>
                  </th>}`;

pl = pl.replace(oldTh, newTh);

// Table row display
const oldTd = `<td className="px-6 py-4 font-mono font-medium text-gray-500">
                        {item.wholesalePrice ? \`₦\${Number(item.wholesalePrice).toLocaleString()}\` : '-'}
                      </td>`;

const newTd = `{isAdmin && <td className="px-6 py-4 font-mono font-medium text-gray-500 text-xs whitespace-nowrap">
                        {item.wholesalePriceBronze || item.wholesalePrice ? \`₦\${Number(item.wholesalePriceBronze || item.wholesalePrice).toLocaleString()}\` : '-'} / <br/>
                        {item.wholesalePriceSilver || item.wholesalePrice ? \`₦\${Number(item.wholesalePriceSilver || item.wholesalePrice).toLocaleString()}\` : '-'} / <br/>
                        {item.wholesalePriceGold || item.wholesalePrice ? \`₦\${Number(item.wholesalePriceGold || item.wholesalePrice).toLocaleString()}\` : '-'}
                      </td>}`;

pl = pl.replace(oldTd, newTd);

fs.writeFileSync('src/pages/PriceList.tsx', pl);
console.log('Fixed PriceList again');

