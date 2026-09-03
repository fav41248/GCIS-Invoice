const fs = require('fs');

function updateFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  const targetBtn = `<button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
            <Download className="w-4 h-4" />
            Export CSV
          </button>`;
  
  if (code.includes(targetBtn)) {
    const newBtn = `{isAdmin && (
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}`;
    code = code.replace(targetBtn, newBtn);
    fs.writeFileSync(file, code);
    console.log('Fixed exports in ' + file);
  } else {
    console.log('Target not found in ' + file);
  }
}

updateFile('src/pages/Clients.tsx');
updateFile('src/pages/Invoices.tsx');
