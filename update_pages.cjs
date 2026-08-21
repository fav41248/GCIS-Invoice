const fs = require('fs');

function updateFile(file, previewId, filenamePrefix) {
  let content = fs.readFileSync(file, 'utf8');

  // Add import for downloadAsPDF
  if (!content.includes("import { downloadAsPDF }")) {
    content = content.replace(
      /import \{ PrintModal \} from '\.\.\/components\/PrintModal';/,
      `import { PrintModal } from '../components/PrintModal';\nimport { downloadAsPDF } from '../lib/pdfGenerator';`
    );
  }

  // Add state for isGeneratingPdf if not present
  if (!content.includes('const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);')) {
    content = content.replace(
      /const \[showPrintModal, setShowPrintModal\] = useState\(false\);/,
      `const [showPrintModal, setShowPrintModal] = useState(false);\n  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);`
    );
  }

  // Handle the modal props
  const oldModal = /<PrintModal\s+isOpen=\{showPrintModal\}\s+onClose=\{\(\) => setShowPrintModal\(false\)\}\s+onConfirmPrint=\{\(\) => window\.print\(\)\}\s+>/;
  const newModal = `<PrintModal 
        isOpen={showPrintModal} 
        onClose={() => setShowPrintModal(false)}
        isGenerating={isGeneratingPdf}
        onDownloadPdf={async () => {
          setIsGeneratingPdf(true);
          await downloadAsPDF('${previewId}', \`${filenamePrefix}\`);
          setIsGeneratingPdf(false);
        }}
      >`;

  content = content.replace(oldModal, newModal);
  fs.writeFileSync(file, content);
}

// Prefix extraction:
// InvoiceGenerator: `Invoice_${invoiceNumber}.pdf`
// InvoiceView: `Invoice_${invoice?.invoiceNumber || id}.pdf`
// ReceiptView: `Receipt_${invoice?.invoiceNumber || id}.pdf`

updateFile('src/pages/InvoiceGenerator.tsx', 'invoice-preview', 'Invoice_${invoiceNumber}.pdf');
updateFile('src/pages/InvoiceView.tsx', 'invoice-preview', 'Invoice_${invoice?.invoiceNumber || id}.pdf');
updateFile('src/pages/ReceiptView.tsx', 'receipt-preview', 'Receipt_${invoice?.invoiceNumber || id}.pdf');

console.log('updated pages');
