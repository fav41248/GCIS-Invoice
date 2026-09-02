const fs = require('fs');
let code = fs.readFileSync('src/pages/InvoiceGenerator.tsx', 'utf8');

// 1. Add getDocs, query, orderBy, limit imports if missing
if (!code.includes('orderBy')) {
  code = code.replace(/collection, addDoc/g, "collection, addDoc, getDocs, query, orderBy, limit");
} else {
  code = code.replace(/collection, addDoc/g, "collection, addDoc, getDocs, limit");
}

// 2. Add an effect to fetch the latest invoice number
const useAuthImport = "import { useAuth } from '../AuthContext';";
const useEffectImport = "import React, { useState, useEffect, useRef } from 'react';";

const fetchLogic = `
  useEffect(() => {
    const fetchLatestInvoiceNumber = async () => {
      try {
        const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        let nextNumber = 1;
        const currentYear = new Date().getFullYear();
        
        if (!snapshot.empty) {
          const lastInvoice = snapshot.docs[0].data();
          const lastNumberStr = lastInvoice.invoiceNumber;
          // Assuming format INV-YYYY-XXXX
          const parts = lastNumberStr.split('-');
          if (parts.length === 3 && parts[1] === currentYear.toString()) {
            nextNumber = parseInt(parts[2], 10) + 1;
          }
        }
        
        const formattedNumber = String(nextNumber).padStart(4, '0');
        setInvoiceNumber(\`INV-\${currentYear}-\${formattedNumber}\`);
      } catch (error) {
        console.error("Error fetching latest invoice number:", error);
      }
    };
    fetchLatestInvoiceNumber();
  }, []);
`;

// Replace the default state initialization
code = code.replace(
  "const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);",
  `const [invoiceNumber, setInvoiceNumber] = useState(\`INV-\${new Date().getFullYear()}-0001\`);\n${fetchLogic}`
);

fs.writeFileSync('src/pages/InvoiceGenerator.tsx', code);
console.log("InvoiceGenerator modified");
