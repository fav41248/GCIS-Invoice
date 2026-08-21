const fs = require('fs');

function fix(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(/      <\/PrintModal>\n  \);\n\}\n$/, '      </PrintModal>\n    </div>\n  );\n}\n');
  fs.writeFileSync(filepath, content);
}

fix('src/pages/InvoiceView.tsx');
fix('src/pages/ReceiptView.tsx');
