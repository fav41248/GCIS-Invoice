const fs = require('fs');
const path = require('path');

function fix(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/hover:bg-\[\#0F5132\]/g, 'hover:bg-[#198754]');
  fs.writeFileSync(filePath, content);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      fix(fullPath);
    }
  }
}

walkDir('src/pages');
walkDir('src/components');
