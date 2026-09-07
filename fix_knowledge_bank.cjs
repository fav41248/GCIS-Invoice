const fs = require('fs');
let code = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');

const oldDisplay = `{product.wholesalePrice ? \`₦\${product.wholesalePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}\` : '-'}`;

const newDisplay = `{
  (() => {
    const tier = user?.pricingTier || 'bronze';
    const wp = tier === 'gold' ? (product.wholesalePriceGold || product.wholesalePrice || 0) :
               tier === 'silver' ? (product.wholesalePriceSilver || product.wholesalePrice || 0) :
               (product.wholesalePriceBronze || product.wholesalePrice || 0);
    return wp ? \`₦\${wp.toLocaleString('en-US', { minimumFractionDigits: 2 })}\` : '-';
  })()
}`;

code = code.split(oldDisplay).join(newDisplay);

fs.writeFileSync('src/pages/KnowledgeBank.tsx', code);
console.log('Fixed KnowledgeBank display');
