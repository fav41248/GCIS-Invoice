const fs = require('fs');

function fixHooks(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find the early returns
  const returnLoading = /if \(loading\) return <div[^>]*>.*?<\/div>;/;
  const returnNotFound = /if \(!invoice\) return <div[^>]*>.*?<\/div>;/;
  
  // Find the state hooks
  const stateHooks = /const \[showPrintModal, setShowPrintModal\] = useState\(false\);\s*const \[isGeneratingPdf, setIsGeneratingPdf\] = useState\(false\);/;
  
  if (content.match(stateHooks)) {
    // Remove them from current position
    content = content.replace(stateHooks, '');
    
    // Find useEffect to insert after it
    content = content.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[id\]\);/, match => {
      return match + "\n\n  const [showPrintModal, setShowPrintModal] = useState(false);\n  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);\n";
    });
    
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}

fixHooks('src/pages/ReceiptView.tsx');
fixHooks('src/pages/InvoiceView.tsx');
