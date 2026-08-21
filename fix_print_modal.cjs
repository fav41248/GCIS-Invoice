const fs = require('fs');
let content = fs.readFileSync('src/components/PrintModal.tsx', 'utf8');

content = content.replace(
  /import \{ X, Printer \} from 'lucide-react';/,
  "import { X, Download } from 'lucide-react';"
);
content = content.replace(
  /<Printer className="h-4 w-4" \/>/g,
  '<Download className="h-4 w-4" />'
);
content = content.replace(
  /isGenerating \? 'Preparing\.\.\.' : 'Print \/ Save as PDF'/g,
  "isGenerating ? 'Generating PDF...' : 'Download PDF'"
);

fs.writeFileSync('src/components/PrintModal.tsx', content);
