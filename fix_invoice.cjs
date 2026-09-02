const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceView.tsx', 'utf8');

const term = `<div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 italic">Please note: All payments are non-refundable once the order has been confirmed.</div>`;

code = code.replace(
  /\{invoice\.paymentNotes && <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>\{invoice\.paymentNotes\}<\/p>\}\s*<\/>\s*\)\}/g,
  `{invoice.paymentNotes && <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{invoice.paymentNotes}</p>}
                </>
              )}
              ${term}`
);

fs.writeFileSync('src/pages/InvoiceView.tsx', code);
console.log("Updated InvoiceView.tsx");
