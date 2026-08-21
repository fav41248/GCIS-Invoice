const fs = require('fs');
let code = fs.readFileSync('src/lib/pdfGenerator.ts', 'utf-8');

// Replace standard html2canvas with dom-to-image-more which handles Tailwind MUCH better
code = code.replace("import html2canvas from 'html2canvas-pro';", "import domtoimage from 'dom-to-image-more';");

code = code.replace(
  `const canvas = await html2canvas(sourceElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff'
    });`,
  `// Force a small wait before capture to ensure all styles are fully applied
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const scale = 2;
    const style = {
      transform: 'scale(' + scale + ')',
      transformOrigin: 'top left',
      width: sourceElement.offsetWidth + 'px',
      height: sourceElement.offsetHeight + 'px'
    };
    
    const imgData = await domtoimage.toJpeg(sourceElement, {
      quality: 0.95,
      bgcolor: '#ffffff',
      width: sourceElement.offsetWidth * scale,
      height: sourceElement.offsetHeight * scale,
      style: style
    });`
);

code = code.replace(
  "// 4. Generate PDF\n    const imgData = canvas.toDataURL('image/jpeg', 0.8);\n    \n    const pdfWidth = canvas.width;\n    const pdfHeight = canvas.height;",
  `// 4. Generate PDF
    const pdfWidth = sourceElement.offsetWidth * scale;
    const pdfHeight = sourceElement.offsetHeight * scale;`
);

fs.writeFileSync('src/lib/pdfGenerator.ts', code);
