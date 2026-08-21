const fs = require('fs');

function fixPriceList() {
  const file = 'src/pages/PriceList.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/className="p-8 border-b border-gray-200/g, 'className="p-4 md:p-8 border-b border-gray-200');
  content = content.replace(/className="flex justify-between items-start mb-6"/g, 'className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"');
  content = content.replace(/className="flex-1 overflow-auto p-8"/g, 'className="flex-1 overflow-auto p-4 md:p-8"');
  content = content.replace(/className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"/g, 'className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto"');
  content = content.replace(/<table className="w-full text-left border-collapse">/g, '<table className="w-full text-left border-collapse min-w-[600px]">');
  fs.writeFileSync(file, content);
}

function fixKnowledgeBank() {
  const file = 'src/pages/KnowledgeBank.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/className="p-8 border-b border-gray-200/g, 'className="p-4 md:p-8 border-b border-gray-200');
  content = content.replace(/className="flex justify-between items-start mb-6"/g, 'className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"');
  content = content.replace(/className="flex-1 overflow-auto p-8"/g, 'className="flex-1 overflow-auto p-4 md:p-8"');
  content = content.replace(/className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"/g, 'className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto"');
  content = content.replace(/<table className="w-full text-left border-collapse">/g, '<table className="w-full text-left border-collapse min-w-[600px]">');
  fs.writeFileSync(file, content);
}

function fixClients() {
  const file = 'src/pages/Clients.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/className="p-8 max-w-5xl mx-auto w-full"/g, 'className="p-4 md:p-8 max-w-5xl mx-auto w-full"');
  content = content.replace(/className="grid grid-cols-2 gap-4"/g, 'className="grid grid-cols-1 md:grid-cols-2 gap-4"');
  content = content.replace(/className="col-span-2"/g, 'className="col-span-1 md:col-span-2"');
  content = content.replace(/className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"/g, 'className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto"');
  content = content.replace(/<table className="w-full text-left text-sm">/g, '<table className="w-full text-left text-sm min-w-[800px]">');
  fs.writeFileSync(file, content);
}

function fixInvoices() {
  const file = 'src/pages/Invoices.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/className="p-8 max-w-6xl mx-auto w-full"/g, 'className="p-4 md:p-8 max-w-6xl mx-auto w-full"');
  fs.writeFileSync(file, content);
}

fixPriceList();
fixKnowledgeBank();
fixClients();
fixInvoices();
