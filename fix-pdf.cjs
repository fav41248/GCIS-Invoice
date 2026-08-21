const fs = require('fs');
let code = fs.readFileSync('src/lib/pdfGenerator.ts', 'utf-8');

code = code.replace(
  "const scale = 2;",
  `
    // Convert images to base64 to avoid CORS issues causing blank PDF
    const images = clone.querySelectorAll('img');
    for (const img of Array.from(images)) {
      try {
        if (img.src && !img.src.startsWith('data:')) {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          img.src = base64;
        }
      } catch (e) {
        console.warn('Failed to inline image', img.src);
      }
    }
    const scale = 2;
  `
);

code = code.replace(
  "pixelRatio: scale,",
  `pixelRatio: scale,
      skipFonts: true, // Fixes blank PDF issues caused by font loading
      imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',`
);

fs.writeFileSync('src/lib/pdfGenerator.ts', code);
