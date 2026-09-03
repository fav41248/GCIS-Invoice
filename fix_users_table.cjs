const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

const oldTableHeaders = `            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">Name</th>
              <th className="px-6 py-4 font-bold text-gray-600">Username</th>
              <th className="px-6 py-4 font-bold text-gray-600">Password / PIN</th>
              <th className="px-6 py-4 font-bold text-gray-600">Role</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-right">Actions</th>
            </tr>`;

const newTableHeaders = `            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">Name</th>
              <th className="px-6 py-4 font-bold text-gray-600">Username</th>
              <th className="px-6 py-4 font-bold text-gray-600">Password / PIN</th>
              <th className="px-6 py-4 font-bold text-gray-600">Phone</th>
              <th className="px-6 py-4 font-bold text-gray-600">Role</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-right">Actions</th>
            </tr>`;

code = code.replace(oldTableHeaders, newTableHeaders);

const oldEditRow = `                  <>
                    <td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.pin} onChange={e => setEditData({...editData, pin: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
                    </td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => saveEdit(u.id, u)} className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded" title="Save"><Save className="w-4 h-4" /></button>
                        <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-1.5 rounded" title="Cancel"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>`;

const oldDisplayRow = `                  <>
                    <td className="px-6 py-4 font-medium text-[#212529]">{u.name}</td>
                    <td className="px-6 py-4 text-gray-500">{u.username}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        {showPins[u.id] ? <span className="font-mono text-gray-800 font-medium">{u.pin}</span> : <span className="text-gray-400 tracking-widest mt-1">••••••</span>}
                        <button onClick={() => setShowPins({...showPins, [u.id]: !showPins[u.id]})} className="text-gray-400 hover:text-[#0F5132] transition-colors ml-2">
                          {showPins[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openReportModal(u)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition-colors" title="View Report"><FileText className="w-4 h-4" /></button>
                        <button onClick={() => startEdit(u)} className="text-gray-400 hover:text-[#0F5132] hover:bg-green-50 p-1.5 rounded transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>`;

const newDisplayRow = `                  <>
                    <td className="px-6 py-4 font-medium text-[#212529]">{u.name}</td>
                    <td className="px-6 py-4 text-gray-500">{u.username}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        {showPins[u.id] ? <span className="font-mono text-gray-800 font-medium">{u.pin}</span> : <span className="text-gray-400 tracking-widest mt-1">••••••</span>}
                        <button onClick={() => setShowPins({...showPins, [u.id]: !showPins[u.id]})} className="text-gray-400 hover:text-[#0F5132] transition-colors ml-2">
                          {showPins[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{u.phone || '-'}</td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openReportModal(u)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition-colors" title="View Report"><FileText className="w-4 h-4" /></button>
                        <button onClick={() => startEdit(u)} className="text-gray-400 hover:text-[#0F5132] hover:bg-green-50 p-1.5 rounded transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>`;

code = code.replace(oldDisplayRow, newDisplayRow);

fs.writeFileSync('src/pages/Users.tsx', code);
console.log('Fixed Users.tsx table UI');
