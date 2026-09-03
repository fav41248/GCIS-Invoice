const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

const targetInvoiceData = `        createdByEmail: user?.name || 'Unknown',
        createdAt: new Date().toISOString(),`;
const replaceInvoiceData = `        createdByEmail: user?.name || 'Unknown',
        repPhone: user?.phone || '',
        createdAt: new Date().toISOString(),`;

code = code.replace(targetInvoiceData, replaceInvoiceData);

const targetPhoneDisplay = `{companySettings?.phone && <p className='text-sm text-gray-500 mt-1'>{companySettings.phone}</p>}`;
const replacePhoneDisplay = `{(user?.phone || companySettings?.phone) && <p className='text-sm text-gray-500 mt-1'>{user?.phone || companySettings?.phone}</p>}`;

code = code.split(targetPhoneDisplay).join(replacePhoneDisplay);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', code);
console.log('Fixed InvoiceGenerator.tsx');
