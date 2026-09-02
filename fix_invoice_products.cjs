const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

// 1. Add state for products
code = code.replace(
  "const [clients, setClients] = useState<any[]>([]);",
  "const [clients, setClients] = useState<any[]>([]);\n  const [products, setProducts] = useState<any[]>([]);"
);

// 2. Fetch products
code = code.replace(
  "const clientSnap = await getDocs(collection(db, 'clients'));",
  "const clientSnap = await getDocs(collection(db, 'clients'));\n        const productSnap = await getDocs(collection(db, 'products'));\n        setProducts(productSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));"
);

// 3. Update the Manual Input section
const oldManualSection = `<h2 className='text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500'>2. Manual Input</h2>
            <div className='grid grid-cols-12 gap-2 mb-3'>
              <div className='col-span-12'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Product Name</label>`;

const newManualSection = `<h2 className='text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500'>2. Add Items</h2>
            <div className='grid grid-cols-12 gap-2 mb-3'>
              <div className='col-span-12'>
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
              </div>
              <div className='col-span-12'>
                <label className='block text-[10px] font-bold text-gray-500 uppercase mb-1'>Item Name / Description</label>`;

code = code.replace(oldManualSection, newManualSection);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', code);
console.log("Invoice generator updated with price list");
