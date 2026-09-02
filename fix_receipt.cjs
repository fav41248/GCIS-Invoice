const fs = require('fs');
let code = fs.readFileSync('src/pages/ReceiptView.tsx', 'utf8');

const term = `<div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 italic">Please note: All payments are non-refundable once the order has been confirmed.</div>`;

code = code.replace(
  /<p className="text-sm text-gray-500">Thank you for your business\. This receipt is an acknowledgement of your payment\.<\/p>\s*<\/div>/g,
  `<p className="text-sm text-gray-500">Thank you for your business. This receipt is an acknowledgement of your payment.</p>
               ${term}
            </div>`
);

fs.writeFileSync('src/pages/ReceiptView.tsx', code);
console.log("Updated ReceiptView.tsx");
