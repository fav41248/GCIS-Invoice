const fs = require('fs');

function makeResponsive(filePath) {
  let code = fs.readFileSync(filePath, 'utf-8');

  // Wrapper
  code = code.replace(
    /className=['"]bg-white w-\[800px\] min-w-\[800px\] shrink-0 p-10/g,
    "className='@container bg-white w-full max-w-[800px] mx-auto shrink-0 p-4 @2xl:p-10"
  );

  // Header
  code = code.replace(
    /<div className=['"]flex justify-between items-start mb-10['"]>/g,
    "<div className='flex flex-col @2xl:flex-row justify-between items-start mb-6 @2xl:mb-10 gap-6 @2xl:gap-0'>"
  );
  
  // Company text align
  code = code.replace(
    /<div className=['"]text-right['"]>\s*<h4/g,
    "<div className='text-left @2xl:text-right'>\n                <h4"
  );

  // Billed To & Dates
  code = code.replace(
    /<div className=['"]flex justify-between items-end mb-8['"]>/g,
    "<div className='flex flex-col @2xl:flex-row justify-between items-start @2xl:items-end mb-6 @2xl:mb-8 gap-6 @2xl:gap-0'>"
  );

  // Date sections wrapper
  code = code.replace(
    /<div className=['"]flex justify-end gap-12 items-center['"]>/g,
    "<div className='flex justify-start @2xl:justify-end gap-6 @2xl:gap-12 items-center w-full @2xl:w-auto'>"
  );

  // Date text aligns
  code = code.replace(
    /<div className=['"]text-right['"]>\s*<h5/g,
    "<div className='text-left @2xl:text-right'>\n                  <h5"
  );

  // Table wrapper (wrapping the <table> with overflow-x-auto)
  // We need to be careful here not to break React. 
  // A simple way is to replace `<table` with `<div className="overflow-x-auto w-full"><table`
  // and `</table>` with `</table></div>`
  // But ONLY for the invoice/receipt tables, which have `w-full text-left text-sm mb-8`
  code = code.replace(
    /<table className=['"]w-full text-left text-sm mb-8['"]>/g,
    "<div className='overflow-x-auto w-full'><table className='w-full text-left text-sm mb-8 min-w-[600px] @2xl:min-w-full'>"
  );
  // Need to be careful with </table> replacement to match the one after the invoice table
  code = code.replace(
    /<\/tbody>\s*<\/table>/g,
    "</tbody>\n            </table></div>"
  );

  // Footer section
  code = code.replace(
    /<div className=['"]flex justify-between items-start pt-6 mt-4['"]>/g,
    "<div className='flex flex-col @2xl:flex-row justify-between items-start pt-6 mt-4 gap-8 @2xl:gap-0'>"
  );

  code = code.replace(
    /<div className=['"]w-1\/2 pr-8['"]>/g,
    "<div className='w-full @2xl:w-1/2 @2xl:pr-8'>"
  );

  code = code.replace(
    /<div className=['"]w-72 space-y-3 shrink-0['"]>/g,
    "<div className='w-full @2xl:w-72 space-y-3 shrink-0'>"
  );

  fs.writeFileSync(filePath, code);
}

['src/pages/InvoiceGenerator.tsx', 'src/pages/InvoiceView.tsx', 'src/pages/ReceiptView.tsx'].forEach(makeResponsive);

console.log('Done!');
