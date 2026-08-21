const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/    html2pdf\(\)\.set\(opt\)\.from\(element\)\.save\(\);\n  \};\n/, '');
  fs.writeFileSync(file, content);
}

fixFile('src/pages/InvoiceView.tsx');
fixFile('src/pages/ReceiptView.tsx');
