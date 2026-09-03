const fs = require('fs');

const files = [
  'src/pages/InvoiceView.tsx',
  'src/pages/ReceiptView.tsx',
  'src/pages/InvoiceGenerator.tsx'
];

const targetStr = `className='w-20 min-w-[5rem] h-20 bg-gray-50 border border-gray-100 rounded-md flex items-center justify-center p-2 shrink-0 overflow-hidden'`;
const replacementStr = `className='w-32 sm:w-40 h-24 sm:h-32 flex items-center justify-center shrink-0 overflow-hidden'`;

files.forEach(file => {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    if (code.includes(targetStr)) {
      code = code.split(targetStr).join(replacementStr);
      fs.writeFileSync(file, code);
      console.log(`Updated ${file}`);
    } else {
      console.log(`Target string not found in ${file}`);
    }
  }
});
