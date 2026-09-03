const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

// 1. State
code = code.replace(
  `const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');`,
  `const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');`
);

code = code.replace(
  `const [editData, setEditData] = useState({ name: '', username: '', pin: '' });`,
  `const [editData, setEditData] = useState({ name: '', username: '', pin: '', phone: '' });`
);

// 2. startEdit
code = code.replace(
  `const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditData({ name: user.name, username: user.username, pin: user.pin });
  };`,
  `const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditData({ name: user.name, username: user.username, pin: user.pin, phone: user.phone || '' });
  };`
);

// 3. saveEdit
code = code.replace(
  `pin: editData.pin,
        });`,
  `pin: editData.pin,
          phone: editData.phone,
        });`
);
code = code.replace(
  `pin: editData.pin
        });`,
  `pin: editData.pin,
          phone: editData.phone
        });`
);

// 4. handleAdd
code = code.replace(
  `pin: pin,
        createdAt: new Date().toISOString()`,
  `pin: pin,
        phone: phone,
        createdAt: new Date().toISOString()`
);
code = code.replace(
  `setName(''); setUsername(''); setPin('');`,
  `setName(''); setUsername(''); setPin(''); setPhone('');`
);

// 5. Add Form UI
code = code.replace(
  `<div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Passcode (PIN)</label>`,
  `<div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Passcode (PIN)</label>`
);

// 6. Edit Form UI
code = code.replace(
  `<input
                            type="text"
                            value={editData.pin}
                            onChange={(e) => setEditData({ ...editData, pin: e.target.value })}
                            className="w-full p-1 border border-gray-300 rounded mt-1"
                            placeholder="PIN"
                          />
                        </td>
                        <td className="px-6 py-4">`,
  `<input
                            type="text"
                            value={editData.pin}
                            onChange={(e) => setEditData({ ...editData, pin: e.target.value })}
                            className="w-full p-1 border border-gray-300 rounded mt-1"
                            placeholder="PIN"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            className="w-full p-1 border border-gray-300 rounded"
                            placeholder="Phone Number"
                          />
                        </td>
                        <td className="px-6 py-4">`
);

// 7. Table Header
code = code.replace(
  `<th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider">PIN</th>
                <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Actions</th>`,
  `<th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider">PIN</th>
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Actions</th>`
);

// 8. Table Body (Display mode)
code = code.replace(
  `<td className="px-6 py-4 font-mono text-gray-500 text-sm">
                          {showPins[user.id] ? user.pin : '••••'}
                          <button
                            onClick={() => setShowPins({ ...showPins, [user.id]: !showPins[user.id] })}
                            className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none inline-flex items-center"
                          >
                            {showPins[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">`,
  `<td className="px-6 py-4 font-mono text-gray-500 text-sm">
                          {showPins[user.id] ? user.pin : '••••'}
                          <button
                            onClick={() => setShowPins({ ...showPins, [user.id]: !showPins[user.id] })}
                            className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none inline-flex items-center"
                          >
                            {showPins[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {user.phone || '-'}
                        </td>
                        <td className="px-6 py-4 text-right">`
);


fs.writeFileSync('src/pages/Users.tsx', code);
console.log('Fixed Users.tsx');
