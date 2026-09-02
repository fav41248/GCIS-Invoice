const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceView.tsx', 'utf8');

const oldPaymentUI = `{invoice.paymentNotes && (
                <>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider'>Payment Terms & Notes</h5>
                  <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{invoice.paymentNotes}</p>
                </>
              )}`;

const newPaymentUI = `{(invoice.paymentNotes || (invoice.paymentAccounts && invoice.paymentAccounts.length > 0)) && (
                <>
                  <h5 className='text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider'>Payment Info & Notes</h5>
                  {invoice.paymentAccounts && invoice.paymentAccounts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {invoice.paymentAccounts.map((acc: any) => (
                        <div key={acc.id} className="bg-gray-50 p-3 rounded border border-gray-100 text-sm">
                          <p className="font-bold text-[#0F5132]">{acc.bankName}</p>
                          <p className="text-gray-600 font-mono mt-0.5">{acc.accountNumber}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{acc.accountName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {invoice.paymentNotes && <p className='text-sm text-gray-600 whitespace-pre-wrap leading-relaxed'>{invoice.paymentNotes}</p>}
                </>
              )}`;

code = code.replace(oldPaymentUI, newPaymentUI);
code = code.replace(oldPaymentUI, newPaymentUI);
fs.writeFileSync('src/pages/InvoiceView.tsx', code);
console.log("Updated InvoiceView");
