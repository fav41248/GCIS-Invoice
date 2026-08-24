const fs = require('fs');

let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/bg-white p-6 rounded-xl border border-gray-200 shadow-sm/g, 'bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm');
code = code.replace(/bg-white p-6 rounded-xl border border-green-200 shadow-sm bg-green-50\/30/g, 'bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/30');
code = code.replace(/bg-white p-6 rounded-xl border border-orange-200 shadow-sm bg-orange-50\/30/g, 'bg-white p-6 rounded-2xl border border-orange-200 shadow-sm bg-orange-50/30');
code = code.replace(/text-gray-500 uppercase/g, 'text-zinc-500 uppercase');
code = code.replace(/text-green-700/g, 'text-emerald-700');
code = code.replace(/bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto/g, 'bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto');
code = code.replace(/bg-gray-50 border-b border-gray-200/g, 'bg-zinc-50 border-b border-zinc-200');

fs.writeFileSync('src/pages/Dashboard.tsx', code);
