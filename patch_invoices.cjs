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

let content = fs.readFileSync('src/pages/Invoices.tsx', 'utf8');

// Add Clock to lucide imports
content = content.replace(
  /import \{ FileText, Plus, Eye, CheckCircle, Trash2 \} from 'lucide-react';/,
  `import { FileText, Plus, Eye, CheckCircle, Trash2, Clock } from 'lucide-react';`
);

// Add the overdue check function inside the Invoices component, right before the return statement.
content = content.replace(
  /  return \(/,
  isOverdueCheck + '\n  return ('
);

// Add visual indicator to the UI
const originalBadge = /<td className="px-6 py-4">\s*<span className=\{\`px-2 py-1 text-xs font-bold rounded-full \$\{inv\.status === 'paid' \? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'\}\`\}>\s*\{inv\.status\.toUpperCase\(\)\}\s*<\/span>\s*<\/td>/;

const newBadge = `<td className="px-6 py-4">
                  <div className="flex flex-col gap-2 items-start">
                    <span className={\`px-2 py-1 text-xs font-bold rounded-full \${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}\`}>
                      {inv.status.toUpperCase()}
                    </span>
                    {isOverdue(inv) && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                        <Clock className="w-3 h-3" /> OVERDUE
                      </span>
                    )}
                  </div>
                </td>`;

content = content.replace(originalBadge, newBadge);
content = content.replace(/colSpan=\{6\}/, 'colSpan={7}');

fs.writeFileSync('src/pages/Invoices.tsx', content);
console.log('patched Invoices');
