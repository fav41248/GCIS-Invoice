const fs = require('fs');

const files = ['src/pages/InvoiceView.tsx', 'src/pages/ReceiptView.tsx'];

const targetPhone = `{settings?.phone && <p className='text-sm text-gray-500 mt-1'>{settings.phone}</p>}`;
const replacePhone = `{(invoice.repPhone || settings?.phone) && <p className='text-sm text-gray-500 mt-1'>{invoice.repPhone || settings?.phone}</p>}`;

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.split(targetPhone).join(replacePhone);
  fs.writeFileSync(file, code);
  console.log(`Fixed ${file}`);
});
