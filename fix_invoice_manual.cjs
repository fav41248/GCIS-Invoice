const fs = require('fs');
const lines = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('                {showProductDropdown && ('));
let endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('                <label className=\'block text-[10px] font-bold text-gray-500 uppercase mb-1\'>Item Name / Description</label>'));

// The div enclosing the dropdown ends right before the next label. Let's step back 2 lines.
endIndex = endIndex - 2;

const newDropdown = `                {showProductDropdown && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto mt-[-8px]">
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => {
                      const sym = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
                      return (
                      <div 
                        key={p.id} 
                        className="p-2 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                        onClick={() => {
                          setManualDesc(p.name);
                          setManualPrice(p.price.toString());
                          setProductSearch('');
                          setShowProductDropdown(false);
                        }}
                      >
                        <div className="font-medium text-gray-800">{p.name}</div>
                        <div className="text-xs text-gray-500">Unit: {sym}{Number(p.price).toLocaleString()} {p.wholesalePrice ? \`| Wholesale: \${sym}\${Number(p.wholesalePrice).toLocaleString()}\` : ''}</div>
                      </div>
                    )})}
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                      <div className="p-2 text-sm text-gray-500 text-center">No products found</div>
                    )}
                  </div>
                )}`;

const newContent = [...lines.slice(0, startIndex), newDropdown, ...lines.slice(endIndex + 1)].join('\n');
fs.writeFileSync('src/pages/InvoiceGenerator.tsx', newContent);
console.log("Fixed truncation!");
