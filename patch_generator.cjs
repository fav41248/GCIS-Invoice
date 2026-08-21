const fs = require('fs');
const content = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

// Replace handlePrint
let newContent = content.replace(
  /const handlePrint = async \(\) => \{[\s\S]*?\}, 150\);\n  \};/,
  `const handlePrint = async () => {\n    await saveInvoiceToDb();\n    setShowPrintModal(true);\n  };`
);

// Add state for showPrintModal
newContent = newContent.replace(
  /const \[isPrinting, setIsPrinting\] = useState\(false\);/,
  `const [showPrintModal, setShowPrintModal] = useState(false);\n  const isPrinting = showPrintModal;`
);

// Add import for PrintModal
newContent = newContent.replace(
  /import { useNavigate } from 'react-router-dom';/,
  `import { useNavigate } from 'react-router-dom';\nimport { PrintModal } from '../components/PrintModal';`
);

// Extract invoicePreviewContent
// We find `<div id="invoice-preview"` and its matching closing tag.
const startIdx = newContent.indexOf('<div id="invoice-preview"');
let balance = 0;
let endIdx = -1;
for (let i = startIdx; i < newContent.length; i++) {
  if (newContent.substr(i, 4) === '<div') balance++;
  if (newContent.substr(i, 5) === '</div') {
    balance--;
    if (balance === 0) {
      endIdx = i + 6;
      break;
    }
  }
}

const previewDiv = newContent.substring(startIdx, endIdx);

const replacement = `{showPrintModal ? null : (\n${previewDiv}\n)}`;

newContent = newContent.substring(0, startIdx) + replacement + newContent.substring(endIdx);

// Append PrintModal to the end before the last closing div
const modalJSX = `
      <PrintModal 
        isOpen={showPrintModal} 
        onClose={() => setShowPrintModal(false)}
        onConfirmPrint={() => window.print()}
      >
        ${previewDiv}
      </PrintModal>
`;

newContent = newContent.replace(/<\/div>\n  \);\n\}\n*$/, `${modalJSX}    </div>\n  );\n}\n`);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', newContent);
console.log('patched');
