const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

const oldHandleAccount = `  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAccount(id);
    if (companySettings?.paymentAccounts) {
       const acc = companySettings.paymentAccounts.find((a: any) => a.id === id);
       if (acc) {
          setNotes(\`Please make payments to:\\nBank: \${acc.bankName}\\nAccount: \${acc.accountNumber}\\nName: \${acc.accountName}\`);
       }
    }
  };`;

const newHandleAccount = `  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    // We don't set selectedAccount because we want the select to return to default
    if (companySettings?.paymentAccounts) {
       const acc = companySettings.paymentAccounts.find((a: any) => a.id === id);
       if (acc) {
          const accString = \`Bank: \${acc.bankName}\\nAccount: \${acc.accountNumber}\\nName: \${acc.accountName}\`;
          if (notes) {
            if (!notes.includes(acc.accountNumber)) {
              setNotes(notes + (notes.endsWith('\\n') ? '' : '\\n\\n') + accString);
            }
          } else {
            setNotes(\`Please make payments to:\\n\\n\${accString}\`);
          }
       }
    }
  };`;

code = code.replace(oldHandleAccount, newHandleAccount);

const oldSelect = `<select className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] mb-2' value={selectedAccount} onChange={handleAccountChange}>
                  <option value="" disabled>-- Select Payment Account --</option>
                  {companySettings?.paymentAccounts?.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                  ))}
                </select>`;

const newSelect = `<select className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] mb-2' value="" onChange={handleAccountChange}>
                  <option value="" disabled>-- Add Payment Account --</option>
                  {companySettings?.paymentAccounts?.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                  ))}
                </select>`;

code = code.replace(oldSelect, newSelect);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', code);
console.log("Updated InvoiceGenerator");
