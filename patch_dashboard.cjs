const fs = require('fs');

const isOverdueCheck = `
  const isOverdue = (invoice) => {
    if (invoice.status === 'paid' || !invoice.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };
`;

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Add Clock to lucide imports or add the import if missing
if (!content.includes('import { Clock }')) {
  content = content.replace(
    /import \{ useAuth \} from '\.\.\/AuthContext';/,
    `import { useAuth } from '../AuthContext';\nimport { Clock } from 'lucide-react';`
  );
}

// Add the overdue check function inside the Dashboard component, right before the return statement.
content = content.replace(
  /  return \(/,
  isOverdueCheck + '\n  return ('
);

// Add visual indicator to the UI. Find the badge rendering logic.
// <span className={`px-2 py-1 text-xs font-bold rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
//   {inv.status.toUpperCase()}
// </span>
const originalBadge = /<td className="px-6 py-4">\s*<span className=\{\`px-2 py-1 text-xs font-bold rounded-full \$\{inv\.status === 'paid' \? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'\}\`\}>\s*\{inv\.status\.toUpperCase\(\)\}\s*<\/span>\s*<\/td>/;

const newBadge = `<td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={\`px-2 py-1 text-xs font-bold rounded-full \${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}\`}>
                      {inv.status.toUpperCase()}
                    </span>
                    {isOverdue(inv) && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                        <Clock className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                </td>`;

content = content.replace(originalBadge, newBadge);

// Make sure colSpan=5 is now colSpan=6 since there are 6 columns (Invoice #, Client, Issued By, Date, Amount, Status). Wait, how many columns were there?
// Invoice # (1), Client (2), Issued By (3), Date (4), Amount (5), Status (6)
content = content.replace(/colSpan=\{5\}/, 'colSpan={6}');

fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log('patched Dashboard');
