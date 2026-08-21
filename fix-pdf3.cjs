const fs = require('fs');
let code = fs.readFileSync('src/lib/pdfGenerator.ts', 'utf-8');

// Replace standard html2canvas with html2canvas-pro which supports modern CSS better
code = code.replace("import html2canvas from 'html2canvas';", "import html2canvas from 'html2canvas-pro';");

// Make absolutely sure html2canvas takes the screenshot of the raw DOM element with NO scaling
// bugs by appending it to a fixed position at the top left of the screen for the split second it captures
code = code.replace(
  "// 2. Capture the ACTUAL DOM element directly",
  `// 2. Ensure element is at top left to prevent html2canvas clipping bugs
    const originalPosition = sourceElement.style.position;
    const originalTop = sourceElement.style.top;
    const originalLeft = sourceElement.style.left;
    const originalZIndex = sourceElement.style.zIndex;
    const originalBg = sourceElement.style.backgroundColor;
    
    // Temporarily fix to top left
    sourceElement.style.position = 'fixed';
    sourceElement.style.top = '0';
    sourceElement.style.left = '0';
    sourceElement.style.zIndex = '9999';
    sourceElement.style.backgroundColor = '#ffffff';

    // 2. Capture the ACTUAL DOM element directly`
);

code = code.replace(
  "// 3. Restore the DOM immediately",
  `// 3. Restore the DOM immediately
    sourceElement.style.position = originalPosition;
    sourceElement.style.top = originalTop;
    sourceElement.style.left = originalLeft;
    sourceElement.style.zIndex = originalZIndex;
    sourceElement.style.backgroundColor = originalBg;
  `
);

fs.writeFileSync('src/lib/pdfGenerator.ts', code);
