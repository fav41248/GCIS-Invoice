const fs = require('fs');
let code = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');

// Add state
code = code.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  "const [searchTerm, setSearchTerm] = useState('');\n  const [activeTab, setActiveTab] = useState<'bronze' | 'silver' | 'gold'>('bronze');"
);

// Update processData to use activeTab
const oldProcessDataStart = `const processData = async (data: any[]) => {`;
const newProcessDataStart = `const processData = async (data: any[], currentTab: string) => {`;
code = code.replace(oldProcessDataStart, newProcessDataStart);

const oldProcessMap = `              if (wholesalePrice !== undefined) {
                productData.wholesalePriceBronze = wholesalePrice;
                productData.wholesalePriceSilver = wholesalePrice;
                productData.wholesalePriceGold = wholesalePrice;
              }`;

const newProcessMap = `              if (wholesalePrice !== undefined) {
                if (currentTab === 'gold') productData.wholesalePriceGold = wholesalePrice;
                else if (currentTab === 'silver') productData.wholesalePriceSilver = wholesalePrice;
                else productData.wholesalePriceBronze = wholesalePrice;
              }`;
code = code.replace(oldProcessMap, newProcessMap);

// Update handleFileUpload to pass activeTab
code = code.replace(
  "await processData(results.data);",
  "await processData(results.data, activeTab);"
);
code = code.replace(
  "await processData(data);",
  "await processData(data, activeTab);"
);

// Add Tab UI
const oldHeader = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F5132] flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[#0F5132]" />
              Knowledge Bank (Admin)
            </h1>
            <p className="text-gray-500 mt-1">Upload and manage product pricing database.</p>
          </div>
          
          <div className="flex gap-3">`;

const newHeader = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F5132] flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[#0F5132]" />
              Knowledge Bank (Admin)
            </h1>
            <p className="text-gray-500 mt-1">Upload and manage product pricing database.</p>
          </div>
          
          <div className="flex gap-3">`;

// Actually we want to insert tabs below the header.
const oldControls = `<div className="flex justify-between items-center max-w-2xl">`;
const newControls = `<div className="flex items-center gap-2 mb-4 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('bronze')} 
            className={\`px-4 py-2 font-medium text-sm transition-colors \${activeTab === 'bronze' ? 'border-b-2 border-[#0F5132] text-[#0F5132]' : 'text-gray-500 hover:text-gray-700'}\`}
          >
            Bronze Plan
          </button>
          <button 
            onClick={() => setActiveTab('silver')} 
            className={\`px-4 py-2 font-medium text-sm transition-colors \${activeTab === 'silver' ? 'border-b-2 border-gray-400 text-gray-700' : 'text-gray-500 hover:text-gray-700'}\`}
          >
            Silver Plan
          </button>
          <button 
            onClick={() => setActiveTab('gold')} 
            className={\`px-4 py-2 font-medium text-sm transition-colors \${activeTab === 'gold' ? 'border-b-2 border-yellow-500 text-yellow-700' : 'text-gray-500 hover:text-gray-700'}\`}
          >
            Gold Plan
          </button>
        </div>
        
        <div className="flex justify-between items-center max-w-2xl">`;

code = code.replace(oldControls, newControls);

// Fix the display of wholesale price in the table based on activeTab
const oldWholesaleDisplay = `{
  (() => {
    const tier = user?.pricingTier || 'bronze';
    const wp = tier === 'gold' ? (product.wholesalePriceGold || product.wholesalePrice || 0) :
               tier === 'silver' ? (product.wholesalePriceSilver || product.wholesalePrice || 0) :
               (product.wholesalePriceBronze || product.wholesalePrice || 0);
    return wp ? \`₦\${wp.toLocaleString('en-US', { minimumFractionDigits: 2 })}\` : '-';
  })()
}`;

const newWholesaleDisplay = `{
  (() => {
    const wp = activeTab === 'gold' ? (product.wholesalePriceGold || product.wholesalePrice || 0) :
               activeTab === 'silver' ? (product.wholesalePriceSilver || product.wholesalePrice || 0) :
               (product.wholesalePriceBronze || product.wholesalePrice || 0);
    return wp ? \`₦\${wp.toLocaleString('en-US', { minimumFractionDigits: 2 })}\` : '-';
  })()
}`;

code = code.split(oldWholesaleDisplay).join(newWholesaleDisplay);


// Also update InvoiceGenerator search dropdown display to respect the tier
let ig = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');
const oldSearchDisplay = `{p.wholesalePrice ? \`| Wholesale: \${sym}\${Number(p.wholesalePrice).toLocaleString()}\` : ''}`;
const newSearchDisplay = `
{(() => {
  const tier = user?.pricingTier || 'bronze';
  const wp = tier === 'gold' ? (p.wholesalePriceGold || p.wholesalePrice) :
             tier === 'silver' ? (p.wholesalePriceSilver || p.wholesalePrice) :
             (p.wholesalePriceBronze || p.wholesalePrice);
  return wp ? \`| Wholesale: \${sym}\${Number(wp).toLocaleString()}\` : '';
})()}
`;
ig = ig.split(oldSearchDisplay).join(newSearchDisplay);

fs.writeFileSync('src/pages/KnowledgeBank.tsx', code);
fs.writeFileSync('src/pages/InvoiceGenerator.tsx', ig);
console.log('Fixed KnowledgeBank tabs and InvoiceGenerator display');
