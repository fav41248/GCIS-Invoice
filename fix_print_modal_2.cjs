const fs = require('fs');
let code = fs.readFileSync('src/components/PrintModal.tsx', 'utf8');

code = code.replace('<div className="absolute top-4 right-4 flex items-center gap-4 print:hidden z-10">', '<div className="fixed top-4 right-4 flex items-center gap-4 print:hidden z-10">');

fs.writeFileSync('src/components/PrintModal.tsx', code);
console.log("Fixed absolute to fixed");
