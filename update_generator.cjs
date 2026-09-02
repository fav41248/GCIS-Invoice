const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

// 1. Replace states
code = code.replace(
  "const [selectedAccount, setSelectedAccount] = useState('');",
  "const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);"
);

// 2. Remove handleAccountChange and add toggleAccount
const handleAccountChangeRegex = /const handleAccountChange = [\s\S]*?};/;
code = code.replace(handleAccountChangeRegex, `const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };`);

// 3. Update useEffect
const oldEffect = `        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setCompanySettings(data);
          if (data.paymentAccounts && data.paymentAccounts.length > 0) {
            const acc = data.paymentAccounts[0];
            setSelectedAccount(acc.id);
            setNotes(\`Please make payments to:\\nBank: \${acc.bankName}\\nAccount: \${acc.accountNumber}\\nName: \${acc.accountName}\`);
          }
        }`;
const newEffect = `        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setCompanySettings(data);
          if (data.paymentAccounts && data.paymentAccounts.length > 0) {
            setSelectedAccounts([data.paymentAccounts[0].id]);
          }
        }`;
code = code.replace(oldEffect, newEffect);

// 4. Update save data
code = code.replace(
  "currency,",
  "currency,\n          paymentAccounts: companySettings?.paymentAccounts?.filter((a: any) => selectedAccounts.includes(a.id)) || [],"
);

// 5. Update form UI
const oldFormUI = `<label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Payment Account details</label>
                <select className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] mb-2' value="" onChange={handleAccountChange}>
                  <option value="" disabled>-- Add Payment Account --</option>
                  {companySettings?.paymentAccounts?.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                  ))}
                </select>
                <textarea className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] resize-none h-24' value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter payment instructions or additional notes..." />`;

const newFormUI = `<label className='block text-[11px] font-bold text-gray-600 uppercase mb-2'>Payment Accounts</label>
                <div className="space-y-2 mb-4">
                  {companySettings?.paymentAccounts?.map((acc: any) => (
                    <label key={acc.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 border border-gray-100 rounded">
                      <input 
                        type="checkbox" 
                        checked={selectedAccounts.includes(acc.id)}
                        onChange={() => toggleAccount(acc.id)}
                        className="rounded text-[#0F5132] focus:ring-[#0F5132]"
                      />
                      <span className="font-medium">{acc.bankName}</span>
                      <span className="text-gray-500">- {acc.accountNumber}</span>
                    </label>
                  ))}
                  {(!companySettings?.paymentAccounts || companySettings.paymentAccounts.length === 0) && (
                    <p className="text-xs text-gray-500">No payment accounts found in Settings.</p>
                  )}
                </div>

                <label className='block text-[11px] font-bold text-gray-600 uppercase mb-1'>Additional Notes</label>
                <textarea className='w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:border-[#0F5132] focus:ring-1 focus:ring-[#198754] resize-none h-20' value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter any additional notes..." />`;

code = code.replace(oldFormUI, newFormUI);

// 6. Update Preview UIs
const oldPreviewUI = `{notes && (
                  <>
                    <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Payment Terms & Notes</h5>
                    <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{notes}</p>
                  </>
                )}`;

const newPreviewUI = `{(selectedAccounts.length > 0 || notes) && (
                  <>
                    <h5 className='text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider'>Payment Info & Notes</h5>
                    {selectedAccounts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {companySettings?.paymentAccounts?.filter((a: any) => selectedAccounts.includes(a.id)).map((acc: any) => (
                          <div key={acc.id} className="bg-gray-50 p-3 rounded border border-gray-100 text-sm">
                            <p className="font-bold text-[#0F5132]">{acc.bankName}</p>
                            <p className="text-gray-600 font-mono mt-0.5">{acc.accountNumber}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{acc.accountName}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {notes && <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{notes}</p>}
                  </>
                )}`;

// Needs to replace twice
code = code.replace(oldPreviewUI, newPreviewUI);
code = code.replace(oldPreviewUI, newPreviewUI);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', code);
console.log("Updated InvoiceGenerator");
