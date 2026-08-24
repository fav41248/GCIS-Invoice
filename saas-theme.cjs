const fs = require('fs');
const path = require('path');

function makeSaaS(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace all the previous themes
  content = content.replace(/bg-emerald-[4-9]00/g, 'bg-slate-900');
  content = content.replace(/hover:bg-emerald-[5-9]00/g, 'hover:bg-slate-800');
  content = content.replace(/text-emerald-[6-9]00/g, 'text-slate-900');
  content = content.replace(/ring-emerald-\w+\/\d+/g, 'ring-slate-900/20');
  content = content.replace(/border-emerald-\w+/g, 'border-slate-200');
  content = content.replace(/bg-emerald-50\/30/g, ''); 
  content = content.replace(/bg-orange-50\/30/g, ''); 
  
  content = content.replace(/bg-zinc-50/g, 'bg-slate-50');
  content = content.replace(/border-zinc-100/g, 'border-slate-200');
  content = content.replace(/border-zinc-200/g, 'border-slate-200');
  content = content.replace(/text-zinc-900/g, 'text-slate-900');
  content = content.replace(/text-zinc-800/g, 'text-slate-900');
  content = content.replace(/text-zinc-600/g, 'text-slate-600');
  content = content.replace(/text-zinc-500/g, 'text-slate-500');
  content = content.replace(/text-zinc-400/g, 'text-slate-400');
  
  // Replace exact hex colors that might linger
  content = content.replace(/#0F5132/gi, '#0f172a');
  content = content.replace(/#198754/gi, '#0f172a');
  content = content.replace(/#064e3b/gi, '#0f172a');
  content = content.replace(/#059669/gi, '#0f172a');
  
  // Focus rings and borders on inputs (Stripe style)
  content = content.replace(/focus:ring-\[\#198754\]/g, 'focus:border-slate-500 focus:ring-1 focus:ring-slate-500');
  content = content.replace(/focus:ring-\[\#0f172a\]/g, 'focus:border-slate-500 focus:ring-1 focus:ring-slate-500');
  // Avoid replacing valid ring-1 if it's already there
  // content = content.replace(/focus:ring-2/g, ''); // Let's keep this manually or leave it as focus:ring-2 since tailwind handles it okay, it's just thicker. Actually, Stripe uses ring-1 or ring-2 lightly. It's fine.

  // Rounded corners
  content = content.replace(/rounded-2xl/g, 'rounded-xl'); 
  
  fs.writeFileSync(filePath, content);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      makeSaaS(fullPath);
    }
  }
}

walkDir('src/pages');
walkDir('src/components');
console.log('SaaS theme applied.');
