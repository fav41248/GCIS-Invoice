const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const targetStr = `  const profitPaidByAdmin = invoices.filter(i => i.profitStatus === 'paid' || i.profitStatus === 'pending' || i.profitStatus === 'confirmed').reduce((sum, inv) => sum + (inv.profitTotal || 0), 0);
  const profitUnpaidByAdmin = invoices.filter(i => !i.profitStatus || i.profitStatus === 'unpaid').reduce((sum, inv) => sum + (inv.profitTotal || 0), 0);`;

const replacementStr = `  const profitPaidByAdmin = invoices.filter(i => 
    isAdmin 
      ? (i.profitStatus === 'paid' || i.profitStatus === 'pending' || i.profitStatus === 'confirmed')
      : (i.profitStatus === 'confirmed')
  ).reduce((sum, inv) => sum + (inv.profitTotal || 0), 0);

  const profitUnpaidByAdmin = invoices.filter(i => 
    isAdmin 
      ? (!i.profitStatus || i.profitStatus === 'unpaid')
      : (i.profitStatus !== 'confirmed')
  ).reduce((sum, inv) => sum + (inv.profitTotal || 0), 0);`;

code = code.split(targetStr).join(replacementStr);
fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('Fixed Dashboard.tsx balances');
