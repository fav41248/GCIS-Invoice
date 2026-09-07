const fs = require('fs');
let code = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');

const oldCSVLogic = `if (wholesalePrice !== undefined) {
                productData.wholesalePrice = wholesalePrice;
              }`;

const newCSVLogic = `if (wholesalePrice !== undefined) {
                productData.wholesalePriceBronze = wholesalePrice;
                productData.wholesalePriceSilver = wholesalePrice;
                productData.wholesalePriceGold = wholesalePrice;
              }`;

code = code.split(oldCSVLogic).join(newCSVLogic);

fs.writeFileSync('src/pages/KnowledgeBank.tsx', code);
console.log('Fixed CSV logic');
