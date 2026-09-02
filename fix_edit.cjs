const fs = require('fs');
let code = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');

const oldTd = `<td className="px-6 py-4">
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded p-1 text-sm outline-none focus:border-[#0F5132]"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          />
                        </td>`;

const newTd = `<td className="px-6 py-4">
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded p-1 text-sm outline-none focus:border-[#0F5132]"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          />
                          <input 
                            type="text" 
                            placeholder="Description (Optional)"
                            className="w-full border border-gray-300 rounded p-1 text-xs outline-none focus:border-[#0F5132] mt-2 text-gray-500"
                            value={editForm.description}
                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                          />
                        </td>`;

code = code.replace(oldTd, newTd);
fs.writeFileSync('src/pages/KnowledgeBank.tsx', code);
console.log("Updated edit form in KnowledgeBank.tsx");
