const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

const oldFormEnd = `<div className="col-span-2 flex justify-end mt-2">`;
const newFormFields = `<div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
              <input type="text" placeholder="08012345678" className="w-full border rounded p-2 text-sm" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pricing Tier</label>
              <select className="w-full border rounded p-2 text-sm bg-white" value={pricingTier} onChange={e => setPricingTier(e.target.value)}>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
              </select>
            </div>
            <div className="col-span-2 flex justify-end mt-2">`;

code = code.replace(oldFormEnd, newFormFields);

fs.writeFileSync('src/pages/Users.tsx', code);
console.log('Fixed Add User Form');
