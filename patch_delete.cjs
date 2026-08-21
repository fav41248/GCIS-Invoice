const fs = require('fs');
let content = fs.readFileSync('src/pages/Invoices.tsx', 'utf8');

// Import deleteDoc
content = content.replace(
  /import \{ collection, query, onSnapshot, orderBy, doc, updateDoc, where \} from 'firebase\/firestore';/,
  `import { collection, query, onSnapshot, orderBy, doc, updateDoc, where, deleteDoc } from 'firebase/firestore';`
);

// Add deleteInvoice function
const deleteFunc = `
  const deleteInvoice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, \`invoices/\${id}\`);
      }
    }
  };
`;

content = content.replace(
  /  const markAsPaid = /,
  deleteFunc + '\n  const markAsPaid = '
);

// Add Delete button for admins in the Actions column
const originalActions = /                   <\/Link>\n                  \) : null\}/;
const newActions = `                   </Link>\n                  ) : null}\n                  {isAdmin && (\n                    <button \n                      onClick={() => deleteInvoice(inv.id)}\n                      className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 transition-colors font-semibold flex items-center justify-center"\n                      title="Delete Invoice"\n                    >\n                      <Trash2 className="w-4 h-4" />\n                    </button>\n                  )}`;

content = content.replace(originalActions, newActions);

fs.writeFileSync('src/pages/Invoices.tsx', content);
