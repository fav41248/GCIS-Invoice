const fs = require('fs');
const path = require('path');

function replaceColors(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace colors
  content = content.replace(/#0F5132/gi, '#064e3b'); // emerald-900
  content = content.replace(/#198754/gi, '#059669'); // emerald-600
  content = content.replace(/#F8F9FA/gi, '#fafafa'); // zinc-50
  content = content.replace(/#212529/gi, '#18181b'); // zinc-900
  content = content.replace(/#D1E7DD/gi, '#d1fae5'); // emerald-100
  
  // Replace rounded-md and rounded-lg to rounded-xl / rounded-2xl to make it look softer
  // content = content.replace(/rounded-md/g, 'rounded-xl');
  // content = content.replace(/rounded-lg/g, 'rounded-2xl');

  fs.writeFileSync(filePath, content);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      replaceColors(fullPath);
    }
  }
}

walkDir('src/pages');
walkDir('src/components');
console.log('Colors replaced!');
