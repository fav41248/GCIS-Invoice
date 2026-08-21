const fs = require('fs');
function fix(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(/      <\/PrintModal>\n    <\/div>\n  \);\n\}\n$/, '      </PrintModal>\n  );\n}\n');
  content = content.replace(/      <\/PrintModal>\n  \);\n\}\n$/, '      </PrintModal>\n  );\n}\n'); // if the previous didn't match

  // We actually need to close the wrapping `<div className="flex-1...">` BEFORE `<PrintModal>`.
  // Wait, let's just do it manually in JS.
  const idx = content.lastIndexOf('<PrintModal');
  content = content.substring(0, idx) + '</div>\n' + content.substring(idx);
  
  // And we need to close the main wrapper, which was opened at the very beginning of `return (`
  const endIdx = content.lastIndexOf('</PrintModal>');
  const afterModal = '\n    </div>\n  );\n}\n';
  content = content.substring(0, endIdx + 13) + afterModal;

  fs.writeFileSync(filepath, content);
}

fix('src/pages/InvoiceView.tsx');
fix('src/pages/ReceiptView.tsx');
