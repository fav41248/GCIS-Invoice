const fs = require('fs');
for (const file of ['src/pages/InvoiceView.tsx', 'src/pages/ReceiptView.tsx']) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/    <\/div>\n    <\/div>\n  \);\n\}\n*$/, '  );\n}\n');
  fs.writeFileSync(file, content);
}
