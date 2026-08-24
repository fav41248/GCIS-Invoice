const fs = require('fs');
const path = require('path');

function revert(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Backgrounds
  content = content.replace(/bg-slate-900/g, 'bg-[#0F5132]');
  content = content.replace(/bg-slate-800/g, 'bg-[#0F5132]');
  content = content.replace(/bg-slate-50\/50/g, 'bg-gray-50');
  content = content.replace(/bg-slate-50/g, 'bg-gray-50');
  content = content.replace(/bg-slate-100/g, 'bg-[#D1E7DD]');
  content = content.replace(/bg-\[\#F7F9FC\]/g, 'bg-[#F8F9FA]');
  content = content.replace(/bg-\[\#0f172a\]/g, 'bg-[#0F5132]');
  
  // Texts
  content = content.replace(/text-slate-900/g, 'text-[#212529]');
  content = content.replace(/text-slate-800/g, 'text-[#212529]');
  content = content.replace(/text-slate-700/g, 'text-gray-700');
  content = content.replace(/text-slate-600/g, 'text-gray-600');
  content = content.replace(/text-slate-500/g, 'text-gray-500');
  content = content.replace(/text-slate-400/g, 'text-gray-400');
  content = content.replace(/text-slate-300/g, 'text-gray-300');
  content = content.replace(/text-slate-200/g, 'text-gray-200');
  
  // Borders
  content = content.replace(/border-slate-200\/60/g, 'border-gray-200');
  content = content.replace(/border-slate-200/g, 'border-gray-200');
  content = content.replace(/border-slate-300/g, 'border-gray-300');
  content = content.replace(/border-slate-500/g, 'border-[#0F5132]');
  
  // Rings
  content = content.replace(/ring-slate-900\/20/g, 'ring-[#198754]/50');
  content = content.replace(/focus:ring-slate-500/g, 'focus:ring-[#198754]');
  content = content.replace(/focus:border-slate-500/g, 'focus:border-[#198754]');
  content = content.replace(/focus:ring-slate-900/g, 'focus:ring-[#0F5132]');
  
  // Special reverts for emerald to green
  content = content.replace(/emerald-50/g, 'green-50');
  content = content.replace(/emerald-100/g, 'green-100');
  content = content.replace(/emerald-200/g, 'green-200');
  content = content.replace(/emerald-600/g, 'green-600');
  content = content.replace(/emerald-700/g, 'green-700');
  
  // Hex colors that got replaced in logic (not just classes)
  content = content.replace(/#0f172a/gi, '#0F5132');
  content = content.replace(/#fafafa/gi, '#F8F9FA');
  content = content.replace(/#18181b/gi, '#212529');
  content = content.replace(/#059669/gi, '#198754');
  content = content.replace(/#064e3b/gi, '#0F5132');
  
  // Revert corners
  content = content.replace(/rounded-xl/g, 'rounded-lg');
  
  // Remove font-sans antialiased tracking-tight (SaaS styles)
  content = content.replace(/font-sans/g, '');
  content = content.replace(/antialiased/g, '');
  content = content.replace(/tracking-tight/g, '');

  // App.tsx Specific Layout structural changes
  if (filePath.endsWith('App.tsx')) {
    // Revert sidebar specifically to how it looked initially
    content = content.replace(/w-\[240px\] bg-white flex flex-col print:hidden shrink-0 border-r border-gray-200/, 'w-[240px] bg-[#0F5132] text-white flex flex-col print:hidden shrink-0');
    // Active link styles in sidebar
    content = content.replace(/bg-\[\#D1E7DD\] text-\[\#212529\] font-medium/g, 'bg-[#D1E7DD] text-[#0F5132] font-bold');
    content = content.replace(/text-gray-500 font-medium hover:bg-gray-50 hover:text-\[\#212529\]/g, 'text-gray-300 font-medium hover:bg-[#198754] hover:text-white');
    content = content.replace(/text-\[\#212529\]/g, 'text-[#0F5132]'); // for active icon
    content = content.replace(/text-gray-400/g, 'text-gray-400'); // inactive icon
    // Sidebar Top Brand Name
    content = content.replace(/text-\[\#0F5132\]/g, 'text-white'); 
    
    // Bottom user info in sidebar
    content = content.replace(/bg-\[\#D1E7DD\] border border-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-700 shrink-0/, 'w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-[#0F5132] shrink-0');
    content = content.replace(/border-t border-gray-200/g, 'border-t border-[#198754]');
    
    // Command Logo 
    content = content.replace(/bg-\[\#0F5132\] rounded-lg flex items-center justify-center shadow-sm shrink-0/g, 'bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0');
    content = content.replace(/Command className="w-4 h-4 text-white"/g, 'Command className="w-4 h-4 text-[#0F5132]"');
    content = content.replace(/Command className="w-6 h-6 text-white"/g, 'Command className="w-6 h-6 text-[#0F5132]"');

    // Sidebar Mobile top bar text
    content = content.replace(/text-sm font-semibold  text-white/g, 'text-sm font-semibold text-[#0F5132]');
    
    // Dashboard Login Button
    content = content.replace(/bg-\[\#0F5132\] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-\[\#0F5132\] focus:outline-none focus:ring-2 focus:ring-\[\#0F5132\] focus:ring-offset-2 transition-all mt-2 disabled:opacity-50/g, 'w-full bg-[#0F5132] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#198754] transition-all mt-2 disabled:opacity-50');
  }
  
  if (filePath.endsWith('Dashboard.tsx')) {
     content = content.replace(/<div className="p-4 md:p-8 max-w-6xl mx-auto w-full">/, '<div className="p-4 md:p-8 max-w-6xl mx-auto w-full">');
     content = content.replace(/bg-white p-5 rounded-lg border border-gray-200 shadow-sm/g, 'bg-white p-6 rounded-lg border border-gray-200 shadow-sm');
     content = content.replace(/bg-gray-50\/50 border-b border-gray-200 text-gray-500/g, 'bg-gray-50 border-b border-gray-200');
     content = content.replace(/hover:bg-gray-50\/50/g, 'hover:bg-gray-50');
     content = content.replace(/<p className="text-3xl font-semibold text-\[\#212529\] /g, '<p className="text-3xl font-black text-[#212529] ');
  }

  fs.writeFileSync(filePath, content);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      revert(fullPath);
    }
  }
}

walkDir('src/pages');
walkDir('src/components');
revert('src/App.tsx');
revert('src/main.tsx');

console.log('Reverted to original green style.');
