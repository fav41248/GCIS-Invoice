const fs = require('fs');

function patchFile(filepath, previewId) {
  let content = fs.readFileSync(filepath, 'utf8');

  // Replace handlePrint
  content = content.replace(
    /const handlePrint = \(\) => \{[\s\S]*?\};\n/,
    `const [showPrintModal, setShowPrintModal] = useState(false);\n  const handlePrint = () => setShowPrintModal(true);\n`
  );
  
  // Need to import PrintModal and useState if missing
  if (!content.includes('import { PrintModal }')) {
    content = content.replace(
      /import \{ (.*?) \} from 'lucide-react';/,
      `import { $1 } from 'lucide-react';\nimport { PrintModal } from '../components/PrintModal';`
    );
  }
  if (!content.includes('useState')) {
    content = content.replace(
      /import React from 'react';/,
      `import React, { useState } from 'react';`
    );
  }

  const startIdx = content.indexOf(`<div id="${previewId}"`);
  if (startIdx === -1) {
    console.log(`Could not find <div id="${previewId}" in ${filepath}`);
    return;
  }
  let balance = 0;
  let endIdx = -1;
  for (let i = startIdx; i < content.length; i++) {
    if (content.substr(i, 4) === '<div') balance++;
    if (content.substr(i, 5) === '</div') {
      balance--;
      if (balance === 0) {
        endIdx = i + 6;
        break;
      }
    }
  }

  const previewDiv = content.substring(startIdx, endIdx);
  
  const replacement = `{showPrintModal ? null : (\n${previewDiv.replace(/\$/g, '$$$$')}\n)}`;

  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);

  const modalJSX = `
      <PrintModal 
        isOpen={showPrintModal} 
        onClose={() => setShowPrintModal(false)}
        onConfirmPrint={() => window.print()}
      >
        ${previewDiv.replace(/\$/g, '$$$$')}
      </PrintModal>
`;

  content = content.replace(/<\/div>\n    <\/div>\n  \);\n\}\n*$/, `${modalJSX}    </div>\n    </div>\n  );\n}\n`);
  
  fs.writeFileSync(filepath, content);
  console.log(`patched ${filepath}`);
}

patchFile('src/pages/InvoiceView.tsx', 'invoice-preview');
patchFile('src/pages/ReceiptView.tsx', 'receipt-preview');
