const fs = require('fs');
let code = fs.readFileSync('src/lib/pdfGenerator.ts', 'utf-8');

// The screenshot proved dom-to-image failed just as badly. Let's write our own clean SVG wrapping.
code = `
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';

export async function downloadAsPDF(elementId: string, filename: string) {
  const elements = document.querySelectorAll('#' + elementId);
  const sourceElement = elements[elements.length - 1] as HTMLElement;

  if (!sourceElement) {
    console.error('Element with id ' + elementId + ' not found');
    return;
  }

  // Force scroll to top so window offset doesn't break capture
  window.scrollTo(0, 0);

  try {
    // 1. Temporarily replace inputs with text divs ON THE ACTUAL DOM
    const inputs = Array.from(sourceElement.querySelectorAll('input, textarea, select')) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
    const replacements: { parent: HTMLElement, original: HTMLElement, textNode: HTMLElement, nextSibling: Node | null }[] = [];
    
    inputs.forEach(input => {
      const parent = input.parentElement;
      if (!parent) return;
      
      const val = input.value;
      const textNode = document.createElement('div');
      textNode.innerText = val || ' '; 
      
      const computedStyle = window.getComputedStyle(input);
      textNode.style.cssText = \`
        font-family: \${computedStyle.fontFamily};
        font-size: \${computedStyle.fontSize};
        font-weight: \${computedStyle.fontWeight};
        color: \${computedStyle.color};
        text-align: \${computedStyle.textAlign};
        padding: \${computedStyle.padding};
        margin: \${computedStyle.margin};
        width: \${computedStyle.width};
        height: \${computedStyle.height};
        display: flex;
        align-items: center;
        box-sizing: border-box;
        justify-content: \${computedStyle.textAlign === 'right' ? 'flex-end' : (computedStyle.textAlign === 'center' ? 'center' : 'flex-start')};
      \`;

      replacements.push({ parent, original: input, textNode, nextSibling: input.nextSibling });
      parent.replaceChild(textNode, input);
    });

    // 2. Pre-fetch images to base64 to avoid CORS taint in the canvas
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
          img.src = base64 as string;
        } catch (e) {
          console.warn('Failed to convert image to base64', img.src);
        }
      }
    }

    // Wait a tick for DOM updates
    await new Promise(r => setTimeout(r, 100));

    // 3. Fix to top-left to avoid weird scroll offsets
    const originalPosition = sourceElement.style.position;
    const originalTop = sourceElement.style.top;
    const originalLeft = sourceElement.style.left;
    const originalZIndex = sourceElement.style.zIndex;
    const originalBg = sourceElement.style.backgroundColor;
    
    sourceElement.style.position = 'fixed';
    sourceElement.style.top = '0';
    sourceElement.style.left = '0';
    sourceElement.style.zIndex = '9999';
    sourceElement.style.backgroundColor = '#ffffff';

    // Wait one more tick for layout to settle
    await new Promise(r => setTimeout(r, 100));

    // 4. Use the new standard html-to-image library (re-installed)
    const scale = 2;
    const dataUrl = await htmlToImage.toJpeg(sourceElement, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: scale,
      skipFonts: true, // Crucial for cloudflare font blocks
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    });

    // 5. Restore the DOM immediately
    sourceElement.style.position = originalPosition;
    sourceElement.style.top = originalTop;
    sourceElement.style.left = originalLeft;
    sourceElement.style.zIndex = originalZIndex;
    sourceElement.style.backgroundColor = originalBg;

    images.forEach(img => {
      if (originalSrcs.has(img)) {
        img.src = originalSrcs.get(img);
      }
    });

    replacements.forEach(rep => {
      if (rep.nextSibling) {
        rep.parent.insertBefore(rep.original, rep.nextSibling);
      } else {
        rep.parent.appendChild(rep.original);
      }
      if (rep.parent.contains(rep.textNode)) {
        rep.parent.removeChild(rep.textNode);
      }
      (rep.original as HTMLInputElement).value = rep.textNode.innerText.trim();
    });

    // 6. Generate the actual PDF
    const pdfWidth = sourceElement.offsetWidth * scale;
    const pdfHeight = sourceElement.offsetHeight * scale;
    
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('An error occurred while generating the PDF.');
  }
}
`;
fs.writeFileSync('src/lib/pdfGenerator.ts', code);
