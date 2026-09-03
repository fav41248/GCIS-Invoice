const fs = require('fs');
let code = fs.readFileSync('src/pages/ReceiptView.tsx', 'utf8');

const targetStr = `Thank you for your business. This receipt is an acknowledgement of your payment.`;
const replacementStr = `Thank you for choosing us. We look forward to serving you again.`;

code = code.split(targetStr).join(replacementStr);

fs.writeFileSync('src/pages/ReceiptView.tsx', code);
console.log('Fixed ReceiptView.tsx');
