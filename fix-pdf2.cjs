const fs = require('fs');
let code = fs.readFileSync('src/lib/pdfGenerator.ts', 'utf-8');

code = code.replace(
  "// Give browser a tiny tick to paint the text nodes",
  `
    // Convert any images to base64 to prevent CORS taint
    const images = Array.from(sourceElement.querySelectorAll('img'));
    const originalSrcs = new Map();
    
    for (const img of images) {
      if (img.src && !img.src.startsWith('data:')) {
        originalSrcs.set(img, img.src);
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          img.src = base64;
        } catch (e) {
          console.warn('Failed to convert image to base64', img.src);
        }
      }
    }

    // Force scroll to top to prevent html2canvas clipping bugs
    window.scrollTo(0, 0);

    // Give browser a tiny tick to paint the text nodes
  `
);

code = code.replace(
  "// 3. Restore the DOM immediately",
  `// 3. Restore the DOM immediately
    images.forEach(img => {
      if (originalSrcs.has(img)) {
        img.src = originalSrcs.get(img);
      }
    });
  `
);

fs.writeFileSync('src/lib/pdfGenerator.ts', code);
