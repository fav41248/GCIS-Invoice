const fs = require('fs');
let lines = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8').split('\n');
lines.splice(312, 0, '              </div>');
fs.writeFileSync('src/pages/InvoiceGenerator.tsx', lines.join('\n'));
