const fs = require('fs');
let content = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

const oldUnitText = `<div className="text-xs text-gray-500">Unit: ₦{Number(p.price).toLocaleString()} {p.wholesalePrice ? \`| Wholesale: ₦\${Number(p.wholesalePrice).toLocaleString()}\` : ''}</div>`;
const newUnitText = `<div className="text-xs text-gray-500">Unit: {currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : ''}{Number(p.price).toLocaleString()} {p.wholesalePrice ? \`| Wholesale: \${currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : ''}\${Number(p.wholesalePrice).toLocaleString()}\` : ''}</div>`;

content = content.replace(oldUnitText, newUnitText);
fs.writeFileSync('src/pages/InvoiceGenerator.tsx', content);
