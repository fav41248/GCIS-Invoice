const fs = require('fs');

function addCrossOrigin(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/referrerPolicy="no-referrer"/g, 'referrerPolicy="no-referrer" crossOrigin="anonymous"');
  fs.writeFileSync(file, content);
}

addCrossOrigin('src/pages/InvoiceGenerator.tsx');
addCrossOrigin('src/pages/InvoiceView.tsx');
addCrossOrigin('src/pages/ReceiptView.tsx');
console.log('Fixed images');
