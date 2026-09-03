const fs = require('fs');
let code = fs.readFileSync('src/pages/PriceList.tsx', 'utf8');

code = code.replace('placeholder="Search services..."', 'placeholder="Search products..."');

fs.writeFileSync('src/pages/PriceList.tsx', code);
console.log('Fixed PriceList.tsx placeholder');
