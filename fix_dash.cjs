const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/className="p-8 max-w-6xl mx-auto w-full"/g, 'className="p-4 md:p-8 max-w-6xl mx-auto w-full"');
content = content.replace(/className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"/g, 'className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto"');
content = content.replace(/<table className="w-full text-left text-sm">/g, '<table className="w-full text-left text-sm min-w-[800px]">');
fs.writeFileSync(file, content);
