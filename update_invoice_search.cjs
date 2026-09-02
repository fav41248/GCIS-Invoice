const fs = require('fs');
let content = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

// 1. Add state variables
const stateHookPos = content.indexOf("const [manualItems");
const newStateHooks = `const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  `;
content = content.slice(0, stateHookPos) + newStateHooks + content.slice(stateHookPos);

// 2. Replace the select dropdown with the custom searchable dropdown
const oldSelectBlock = `<div className='col-span-12'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Select from Price List (Optional)</label>
                <select 
                  className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] mb-2'
                  onChange={(e) => {
                    const p = products.find(prod => prod.id === e.target.value);
                    if (p) {
                      setManualDesc(p.name);
                      setManualPrice(p.price.toString());
                    }
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Select a Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} - {p.price}</option>)}
                </select>
              </div>`;

const newSelectBlock = `<div className='col-span-12 relative'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Select from Price List (Optional)</label>
                <input
                  type="text"
                  placeholder="Search and select a product..."
                  className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] mb-2'
                  value={productSearch}
                  onFocus={() => setShowProductDropdown(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                />
                {showProductDropdown && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto mt-[-8px]">
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
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
                        <div className="text-xs text-gray-500">Unit: ₦{Number(p.price).toLocaleString()} {p.wholesalePrice ? \`| Wholesale: ₦\${Number(p.wholesalePrice).toLocaleString()}\` : ''}</div>
                      </div>
                    ))}
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                      <div className="p-2 text-sm text-gray-500 text-center">No products found</div>
                    )}
                  </div>
                )}
              </div>`;

content = content.replace(oldSelectBlock, newSelectBlock);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', content);
console.log('Successfully updated InvoiceGenerator.tsx');
