const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

const term = `<div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 italic">Please note: All payments are non-refundable once the order has been confirmed.</div>`;

code = code.replace(
  /\{notes && <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>\{notes\}<\/p>\}\s*<\/>\s*\)\}/g,
  `{notes && <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{notes}</p>}
                  </>
                )}
                ${term}`
);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', code);
console.log("Updated InvoiceGenerator.tsx");
