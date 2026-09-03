const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

const targetStr = `<td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.pin} onChange={e => setEditData({...editData, pin: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-right">`;

const replaceStr = `<td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.pin} onChange={e => setEditData({...editData, pin: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
                    </td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-right">`;

code = code.split(targetStr).join(replaceStr);
fs.writeFileSync('src/pages/Users.tsx', code);
console.log('Fixed Edit UI');
