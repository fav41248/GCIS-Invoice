const fs = require('fs');
let code = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');

const oldChunkLoop = `      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(row => {
          const name = row[nameKey];
          let price = row[priceKey];
          
          if (!name) return; // Skip empty names
          
          // Clean up price (remove currency symbols, commas, convert to number)
          if (typeof price === 'string') {
            price = parseFloat(price.replace(/[^0-9.-]+/g, ""));
          }
          if (isNaN(price)) price = 0;

          const docId = name.toString().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
          const docRef = doc(db, 'products', docId);
          batch.set(docRef, {
            name: name.toString(),
            price: price,
            category: row['Category'] || row['category'] || 'General',
            updatedAt: new Date().toISOString()
          }, { merge: true }); // Merge true allows updating existing without wiping other fields
        });
        
        // Retry logic for batch commit to handle transport errors
        let retries = 3;
        while (retries > 0) {
          try {
            await batch.commit();
            break;
          } catch (err: any) {
            retries--;
            if (retries === 0) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        // Small delay between chunks to prevent overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 500));
      }`;

const newChunkLoop = `      for (const chunk of chunks) {
        // Retry logic for batch commit to handle transport errors
        let retries = 3;
        while (retries > 0) {
          try {
            const batch = writeBatch(db);
            chunk.forEach(row => {
              const name = row[nameKey];
              let price = row[priceKey];
              
              if (!name) return; // Skip empty names
              
              if (typeof price === 'string') {
                price = parseFloat(price.replace(/[^0-9.-]+/g, ""));
              }
              if (isNaN(price)) price = 0;

              const docId = name.toString().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
              const docRef = doc(db, 'products', docId);
              batch.set(docRef, {
                name: name.toString(),
                price: price,
                category: row['Category'] || row['category'] || 'General',
                updatedAt: new Date().toISOString()
              }, { merge: true }); 
            });
            
            await batch.commit();
            break;
          } catch (err: any) {
            retries--;
            if (retries === 0) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }`;

code = code.replace(oldChunkLoop, newChunkLoop);
fs.writeFileSync('src/pages/KnowledgeBank.tsx', code);
console.log("Updated KnowledgeBank.tsx");
