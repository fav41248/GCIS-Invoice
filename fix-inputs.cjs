const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(/text-white placeholder-slate-400/g, 'text-[#212529] placeholder-gray-400');
app = app.replace(/divide-slate-100/g, 'divide-gray-100');
fs.writeFileSync('src/App.tsx', app);

let dash = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
dash = dash.replace(/divide-slate-100/g, 'divide-gray-100');
dash = dash.replace(/text-slate-900/g, 'text-[#212529]');
dash = dash.replace(/text-slate-600/g, 'text-gray-600');
dash = dash.replace(/text-slate-500/g, 'text-gray-500');
fs.writeFileSync('src/pages/Dashboard.tsx', dash);
