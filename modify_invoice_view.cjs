const fs = require('fs');

let code1 = fs.readFileSync('src/pages/InvoiceView.tsx', 'utf8');
const oldHeader1 = "                <p className='text-gray-500 text-sm font-mono uppercase mt-1'>Invoice Number: {invoice.invoiceNumber}</p>";
const newHeader1 = `                <p className='text-gray-500 text-[13px] font-mono uppercase mt-1'>Invoice #: {invoice.invoiceNumber}</p>
                <p className='text-gray-500 text-[13px] font-mono uppercase mt-0.5'>Issued By: {invoice.createdByEmail}</p>`;
code1 = code1.replace(oldHeader1, newHeader1);
code1 = code1.replace(oldHeader1, newHeader1);
fs.writeFileSync('src/pages/InvoiceView.tsx', code1);

let code2 = fs.readFileSync('src/pages/ReceiptView.tsx', 'utf8');
const oldHeader2 = "                <p className='text-gray-500 text-sm font-mono uppercase mt-1'>Ref: {invoice.invoiceNumber}</p>";
const newHeader2 = `                <p className='text-gray-500 text-[13px] font-mono uppercase mt-1'>Ref: {invoice.invoiceNumber}</p>
                <p className='text-gray-500 text-[13px] font-mono uppercase mt-0.5'>Issued By: {invoice.createdByEmail}</p>`;
code2 = code2.replace(oldHeader2, newHeader2);
code2 = code2.replace(oldHeader2, newHeader2);
fs.writeFileSync('src/pages/ReceiptView.tsx', code2);
console.log("Invoice/Receipt View modified");
