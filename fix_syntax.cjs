const fs = require('fs');
let code = fs.readFileSync('src/pages/PriceList.tsx', 'utf8');

// Replace the failed closing tag replacement
code = code.replace(
  /<\/form>[\s\S]*?<\/div>[\s\S]*?<div className="lg:col-span-2">/,
  `</form>
        </div>)}
        <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>`
);

fs.writeFileSync('src/pages/PriceList.tsx', code);
console.log("Fixed JSX syntax in PriceList.tsx");
