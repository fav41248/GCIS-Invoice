const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

// Fix startEdit
code = code.replace(
  "setEditData({ name: user.name, username: user.username, pin: user.pin || '' });",
  "setEditData({ name: user.name, username: user.username, pin: user.pin || '', phone: user.phone || '', pricingTier: user.pricingTier || 'bronze' });"
);

// Fix table display
const oldDisplay = `<td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>`;

const newDisplay = `<td className="px-6 py-4 text-gray-500">{u.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.pricingTier === 'gold' ? 'bg-yellow-100 text-yellow-800' : u.pricingTier === 'silver' ? 'bg-gray-200 text-gray-800' : 'bg-orange-100 text-orange-800'}\`}>
                        {u.pricingTier || 'bronze'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={\`px-2 py-1 text-xs font-bold rounded-full uppercase \${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'}\`}>{u.role}</span>
                    </td>`;

// I need to only replace the ONE that is inside the non-editing mode.
// Let's replace the first occurrence or specific occurrence. Since the edit mode one uses bg-purple-700 and the view mode uses bg-purple-800, we can match exactly.
code = code.split(oldDisplay).join(newDisplay);

// Fix colspan
code = code.replace('colSpan={5}', 'colSpan={7}');

fs.writeFileSync('src/pages/Users.tsx', code);
console.log('Fixed Users.tsx phone/tier display and startEdit');
