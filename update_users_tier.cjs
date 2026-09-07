const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

// State updates
code = code.replace(
  "const [phone, setPhone] = useState('');",
  "const [phone, setPhone] = useState('');\n  const [pricingTier, setPricingTier] = useState('bronze');"
);

code = code.replace(
  "const [editData, setEditData] = useState({ name: '', username: '', pin: '', phone: '' });",
  "const [editData, setEditData] = useState({ name: '', username: '', pin: '', phone: '', pricingTier: 'bronze' });"
);

// startEdit
code = code.replace(
  "setEditData({ name: user.name, username: user.username, pin: user.pin, phone: user.phone || '' });",
  "setEditData({ name: user.name, username: user.username, pin: user.pin, phone: user.phone || '', pricingTier: user.pricingTier || 'bronze' });"
);

// saveEdit
code = code.replace(
  "phone: editData.phone,",
  "phone: editData.phone,\n          pricingTier: editData.pricingTier,"
);
code = code.replace(
  "phone: editData.phone\n        });",
  "phone: editData.phone,\n          pricingTier: editData.pricingTier\n        });"
);

// handleAdd
code = code.replace(
  "phone: phone,\n        createdAt: new Date().toISOString()",
  "phone: phone,\n        pricingTier: pricingTier,\n        createdAt: new Date().toISOString()"
);
code = code.replace(
  "setName(''); setUsername(''); setPin(''); setPhone('');",
  "setName(''); setUsername(''); setPin(''); setPhone(''); setPricingTier('bronze');"
);

// Add Form UI - phone is inside md:col-span-2 -> we need to add the select for pricingTier
code = code.replace(
  `<div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>`,
  `<div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Tier</label>
              <select
                value={pricingTier}
                onChange={(e) => setPricingTier(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
              >
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>`
);

// Edit Table Header
code = code.replace(
  `<th className="px-6 py-4 font-bold text-gray-600">Phone</th>
              <th className="px-6 py-4 font-bold text-gray-600">Role</th>`,
  `<th className="px-6 py-4 font-bold text-gray-600">Phone</th>
              <th className="px-6 py-4 font-bold text-gray-600">Tier</th>
              <th className="px-6 py-4 font-bold text-gray-600">Role</th>`
);

// Edit row
code = code.replace(
  `<td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
                    </td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>`,
  `<td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
                    </td>
                    <td className="px-6 py-4">
                      <select className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.pricingTier} onChange={e => setEditData({...editData, pricingTier: e.target.value})}>
                        <option value="bronze">Bronze</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>`
);

// Display row
code = code.replace(
  `<td className="px-6 py-4 text-gray-500">{u.phone || '-'}</td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>`,
  `<td className="px-6 py-4 text-gray-500">{u.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.pricingTier === 'gold' ? 'bg-yellow-100 text-yellow-800' : u.pricingTier === 'silver' ? 'bg-gray-200 text-gray-800' : 'bg-orange-100 text-orange-800'}\`}>
                        {u.pricingTier || 'bronze'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>`
);

fs.writeFileSync('src/pages/Users.tsx', code);
console.log('Fixed Users.tsx');
