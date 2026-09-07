const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

const oldMap = `const itemsWithWholesale = allItems.map(item => {
         const matchedProduct = products.find(p => (p.name || '').toLowerCase() === (item.description || '').toLowerCase());
         const wp = matchedProduct?.wholesalePrice || 0;
         return { ...item, wholesalePrice: wp, wholesaleTotal: wp * item.qty, profit: (item.price - wp) * item.qty };
      });`;

const newMap = `const itemsWithWholesale = allItems.map(item => {
         const matchedProduct = products.find(p => (p.name || '').toLowerCase() === (item.description || '').toLowerCase());
         let wp = 0;
         if (matchedProduct) {
           const tier = user?.pricingTier || 'bronze';
           if (tier === 'gold') wp = matchedProduct.wholesalePriceGold || matchedProduct.wholesalePrice || 0;
           else if (tier === 'silver') wp = matchedProduct.wholesalePriceSilver || matchedProduct.wholesalePrice || 0;
           else wp = matchedProduct.wholesalePriceBronze || matchedProduct.wholesalePrice || 0;
         }
         return { ...item, wholesalePrice: wp, wholesaleTotal: wp * item.qty, profit: (item.price - wp) * item.qty };
      });`;

code = code.replace(oldMap, newMap);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', code);
console.log('Fixed InvoiceGenerator.tsx wholesale map');
