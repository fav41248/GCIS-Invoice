const fs = require('fs');

let content = fs.readFileSync('src/components/PrintModal.tsx', 'utf8');

content = content.replace(
  /\{isGenerating \? 'Generating PDF\.\.\.' : 'Download PDF'\}/,
  `{isGenerating ? 'Preparing PDF...' : 'Export to PDF'}`
);

fs.writeFileSync('src/components/PrintModal.tsx', content);
