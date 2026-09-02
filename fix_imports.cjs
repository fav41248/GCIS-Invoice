const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

// Fix duplicate imports in firestore
code = code.replace(
  "import { collection, addDoc, getDocs, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';",
  "import { collection, addDoc, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';"
);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', code);
console.log("Imports fixed");
