const fs = require('fs');

let content = fs.readFileSync('src/components/PrintModal.tsx', 'utf8');

// Change the container from w-[210mm] to w-fit so it matches the 800px child exactly without squishing
content = content.replace(
  /w-\[210mm\] min-h-\[297mm\] bg-white shadow-2xl overflow-y-auto max-h-\[90vh\]/,
  `w-fit min-h-[297mm] bg-white shadow-2xl overflow-y-auto max-h-[90vh]`
);

content = content.replace(
  /\{isGenerating \? 'Preparing PDF\.\.\.' : 'Export to PDF'\}/,
  `{isGenerating ? 'Generating PDF...' : 'Download exact PDF'}`
);

fs.writeFileSync('src/components/PrintModal.tsx', content);
