const fs = require('fs');
let code = fs.readFileSync('src/lib/pdfGenerator.ts', 'utf-8');

// Replace position: 'fixed' with position: 'absolute' and set width to 800px to avoid mobile viewport clipping and squishing.
code = code.replace(
  `const originalBg = sourceElement.style.backgroundColor;`,
  `const originalBg = sourceElement.style.backgroundColor;
    const originalWidth = sourceElement.style.width;
    const originalMaxWidth = sourceElement.style.maxWidth;`
);

code = code.replace(
  `sourceElement.style.position = 'fixed';`,
  `sourceElement.style.position = 'absolute';
    sourceElement.style.width = '800px'; // Force desktop layout for PDF
    sourceElement.style.maxWidth = '800px';`
);

code = code.replace(
  `sourceElement.style.backgroundColor = originalBg;`,
  `sourceElement.style.backgroundColor = originalBg;
    sourceElement.style.width = originalWidth;
    sourceElement.style.maxWidth = originalMaxWidth;`
);

// We need to fix htmlToImage width/height options to ensure it captures the full 800px layout
code = code.replace(
  `const dataUrl = await htmlToImage.toJpeg(sourceElement, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: scale,
      skipFonts: true, // Crucial for cloudflare font blocks
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    });`,
  `const dataUrl = await htmlToImage.toJpeg(sourceElement, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: scale,
      skipFonts: true, // Crucial for cloudflare font blocks
      width: 800,
      height: sourceElement.scrollHeight,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    });`
);

// We should use 800 for the PDF width instead of offsetWidth because we forced it to 800
code = code.replace(
  `const pdfWidth = sourceElement.offsetWidth * scale;
    const pdfHeight = sourceElement.offsetHeight * scale;`,
  `const pdfWidth = 800 * scale;
    const pdfHeight = sourceElement.scrollHeight * scale;`
);

fs.writeFileSync('src/lib/pdfGenerator.ts', code);
