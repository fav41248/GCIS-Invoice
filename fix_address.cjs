const fs = require('fs');
let content = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');
content = content.replace(
  /setBillToAddress\(client\.address \|\| ''\);/,
  `const addr = client.address || '';
        const phone = client.phone || '';
        if (addr && phone) setBillToAddress(addr + ' - ' + phone);
        else if (addr) setBillToAddress(addr);
        else if (phone) setBillToAddress(phone);
        else setBillToAddress('');`
);
// Also hide it in the UI if billToAddress is empty
content = content.replace(
  /<p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>\{billToAddress \|\| 'Client Address'\}<\/p>/g,
  `{billToAddress && <p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>{billToAddress}</p>}`
);
fs.writeFileSync('src/pages/InvoiceGenerator.tsx', content);

let invView = fs.readFileSync('src/pages/InvoiceView.tsx', 'utf8');
invView = invView.replace(
  /<p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>\{invoice\.clientAddress \|\| 'Client Address'\}<\/p>/g,
  `{invoice.clientAddress && <p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>{invoice.clientAddress}</p>}`
);
fs.writeFileSync('src/pages/InvoiceView.tsx', invView);

let recView = fs.readFileSync('src/pages/ReceiptView.tsx', 'utf8');
recView = recView.replace(
  /<p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>\{invoice\.clientAddress\}<\/p>/g,
  `{invoice.clientAddress && <p className='text-sm text-gray-600 whitespace-pre-wrap mt-1'>{invoice.clientAddress}</p>}`
);
fs.writeFileSync('src/pages/ReceiptView.tsx', recView);
