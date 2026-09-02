const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

const badCode = `const [currency,
          paymentAccounts: companySettings?.paymentAccounts?.filter((a: any) => selectedAccounts.includes(a.id)) || [], setCurrency] = useState('NGN');`;
const goodCode = `const [currency, setCurrency] = useState('NGN');`;
code = code.replace(badCode, goodCode);

const goodSaveCode = `        status: 'unpaid',
        paymentNotes: notes,
        paymentAccounts: companySettings?.paymentAccounts?.filter((a: any) => selectedAccounts.includes(a.id)) || [],
        createdBy: user?.username || 'Unknown',`;
code = code.replace(
  `        status: 'unpaid',\n        paymentNotes: notes,\n        createdBy: user?.username || 'Unknown',`,
  goodSaveCode
);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', code);
console.log("Typo fixed");
