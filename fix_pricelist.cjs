const fs = require('fs');
let code = fs.readFileSync('src/pages/PriceList.tsx', 'utf8');

code = code.replace(/price_list/g, 'products');

fs.writeFileSync('src/pages/PriceList.tsx', code);
console.log("Updated PriceList.tsx to use products collection");
