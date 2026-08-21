const fs = require('fs');
let content = fs.readFileSync('src/pages/Invoices.tsx', 'utf8');
if (!content.includes('lucide-react')) {
  content = content.replace(
    /import \{ Link \} from 'react-router-dom';/,
    `import { Link } from 'react-router-dom';\nimport { Clock, Trash2 } from 'lucide-react';`
  );
  fs.writeFileSync('src/pages/Invoices.tsx', content);
  console.log('Fixed lucide-react import in Invoices.tsx');
}
