import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadAsPDF(elementId: string, filename: string) {
  const elements = document.querySelectorAll(`#${elementId}`);
  let sourceElement = elements[elements.length - 1] as HTMLElement;

  if (!sourceElement) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // 1. Temporarily replace inputs with text divs ON THE ACTUAL DOM
    // This avoids cloning issues where CSS variables and context are lost.
    const inputs = Array.from(sourceElement.querySelectorAll('input, textarea, select')) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
    
    const replacements: { parent: HTMLElement, original: HTMLElement, textNode: HTMLElement, nextSibling: Node | null }[] = [];

    inputs.forEach(input => {
      const parent = input.parentElement;
      if (!parent) return;

      const val = input.value;
      const textNode = document.createElement('div');
      textNode.innerText = val || ' '; // Ensure empty spaces still take up height

      const computedStyle = window.getComputedStyle(input);
      // Fine-tune styles for perfect visual match
      textNode.style.fontFamily = computedStyle.fontFamily;
      textNode.style.fontSize = computedStyle.fontSize;
      textNode.style.fontWeight = computedStyle.fontWeight;
      textNode.style.color = computedStyle.color;
      textNode.style.textAlign = computedStyle.textAlign;
      textNode.style.padding = computedStyle.padding;
      textNode.style.margin = computedStyle.margin;
      textNode.style.width = computedStyle.width;
      textNode.style.height = computedStyle.height;
      textNode.style.display = 'flex';
      textNode.style.alignItems = 'center';
      textNode.style.boxSizing = 'border-box';
      
      textNode.style.justifyContent = 
        computedStyle.textAlign === 'right' ? 'flex-end' : 
        (computedStyle.textAlign === 'center' ? 'center' : 'flex-start');

      replacements.push({
        parent,
        original: input,
        textNode,
        nextSibling: input.nextSibling
      });

      parent.replaceChild(textNode, input);
    });
    
    // Give browser a tiny tick to paint the text nodes
    await new Promise(r => setTimeout(r, 50));

    // 2. Capture the ACTUAL DOM element directly
    const canvas = await html2canvas(sourceElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff'
    });

    // 3. Restore the DOM immediately
    replacements.forEach(rep => {
      if (rep.nextSibling) {
        rep.parent.insertBefore(rep.original, rep.nextSibling);
      } else {
        rep.parent.appendChild(rep.original);
      }
      if (rep.parent.contains(rep.textNode)) {
        rep.parent.removeChild(rep.textNode);
      }
      // Re-assign value just in case
      (rep.original as HTMLInputElement).value = rep.textNode.innerText.trim();
    });

    // 4. Generate PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    
    const pdfWidth = canvas.width;
    const pdfHeight = canvas.height;
    
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('An error occurred while generating the PDF.');
  }
}
