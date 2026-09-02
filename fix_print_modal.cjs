const fs = require('fs');
let code = fs.readFileSync('src/components/PrintModal.tsx', 'utf8');

// Replace wrapper and container to ensure 800px width for faithful preview
const oldWrapper = '<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 print:bg-transparent print:static print:z-auto print:inset-auto">';
const newWrapper = '<div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 print:bg-transparent print:static print:z-auto print:inset-auto overflow-auto py-10 px-4">';

const oldContainer = '<div className="w-fit min-h-[297mm] bg-white shadow-2xl overflow-y-auto max-h-[90vh] print:max-h-none print:w-full print:h-auto print:shadow-none print:overflow-visible">';
const newContainer = '<div className="w-[800px] shrink-0 min-h-[297mm] bg-white shadow-2xl print:max-h-none print:w-full print:h-auto print:shadow-none print:overflow-visible relative">';

code = code.replace(oldWrapper, newWrapper);
code = code.replace(oldContainer, newContainer);

fs.writeFileSync('src/components/PrintModal.tsx', code);
console.log("PrintModal fixed");
