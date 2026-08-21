const fs = require('fs');

function fixUsers() {
  const file = 'src/pages/Users.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/className="p-8 max-w-5xl mx-auto w-full"/g, 'className="p-4 md:p-8 max-w-5xl mx-auto w-full"');
  content = content.replace(/className="grid grid-cols-2 gap-4"/g, 'className="grid grid-cols-1 md:grid-cols-2 gap-4"');
  content = content.replace(/className="col-span-2"/g, 'className="col-span-1 md:col-span-2"');
  content = content.replace(/className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"/g, 'className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto"');
  content = content.replace(/<table className="w-full text-left text-sm">/g, '<table className="w-full text-left text-sm min-w-[600px]">');
  fs.writeFileSync(file, content);
}

function fixSettings() {
  const file = 'src/pages/Settings.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/className="p-8 max-w-3xl mx-auto w-full"/g, 'className="p-4 md:p-8 max-w-3xl mx-auto w-full"');
  content = content.replace(/className="grid grid-cols-2 gap-6"/g, 'className="grid grid-cols-1 md:grid-cols-2 gap-6"');
  content = content.replace(/className="col-span-2"/g, 'className="col-span-1 md:col-span-2"');
  fs.writeFileSync(file, content);
}

fixUsers();
if (fs.existsSync('src/pages/Settings.tsx')) {
    fixSettings();
}
