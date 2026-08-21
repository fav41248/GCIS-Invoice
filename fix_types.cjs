const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /data\.sort\(\(a, b\) => \(a\.name \|\| ''\)\.localeCompare\(b\.name \|\| ''\)\);/,
    `data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));`
  );
  fs.writeFileSync(file, content);
}

fixFile('src/pages/KnowledgeBank.tsx');
fixFile('src/pages/PriceList.tsx');
