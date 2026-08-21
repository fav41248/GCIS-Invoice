import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export async function downloadAsPDF(elementId: string, filename: string) {
  const elements = document.querySelectorAll(`#${elementId}`);
  let sourceElement = elements[elements.length - 1] as HTMLElement;

  if (!sourceElement) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // 1. Create a pristine, isolated wrapper
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px'; // Hide off-screen
    wrapper.style.top = '0';
    wrapper.style.width = '800px'; // Force exact desktop width
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.zIndex = '-1000';
    document.body.appendChild(wrapper);

    // 2. Clone the visual element perfectly
    const clone = sourceElement.cloneNode(true) as HTMLElement;
    clone.style.width = '800px';
    clone.style.minWidth = '800px';
    clone.style.maxWidth = '800px';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.transform = 'none';
    clone.style.position = 'relative'; 

    // 3. The Magic Fix: Inputs don't clone their typed values, and html2canvas 
    // can sometimes struggle with rendering custom inputs correctly across browsers. 
    // We will convert all inputs into standard text DIVs in the clone!
    const originalInputs = sourceElement.querySelectorAll('input, textarea, select');
    const clonedInputs = clone.querySelectorAll('input, textarea, select');
    
    originalInputs.forEach((original, index) => {
      const cloned = clonedInputs[index] as HTMLElement;
      if (cloned && original) {
        const val = (original as HTMLInputElement).value;
        
        const textNode = document.createElement('div');
        textNode.innerText = val;
        
        // Copy essential text styling so it looks exactly like the input
        const computedStyle = window.getComputedStyle(original);
        textNode.style.fontFamily = computedStyle.fontFamily;
        textNode.style.fontSize = computedStyle.fontSize;
        textNode.style.fontWeight = computedStyle.fontWeight;
        textNode.style.color = computedStyle.color;
        textNode.style.textAlign = computedStyle.textAlign;
        textNode.style.padding = computedStyle.padding;
        textNode.style.width = computedStyle.width;
        textNode.style.height = computedStyle.height;
        textNode.style.display = 'flex';
        textNode.style.alignItems = 'center';
        
        // Handle alignment exactly as the input had it
        textNode.style.justifyContent = 
          computedStyle.textAlign === 'right' ? 'flex-end' : 
          (computedStyle.textAlign === 'center' ? 'center' : 'flex-start');
        
        textNode.style.overflow = 'hidden';
        textNode.style.boxSizing = 'border-box';
        
        // Replace the raw input element with our perfectly styled text block in the clone
        if (cloned.parentNode) {
          cloned.parentNode.replaceChild(textNode, cloned);
        }
      }
    });

    wrapper.appendChild(clone);

    // 4. Wait a moment for browser to apply styles in the clone
    await new Promise(resolve => setTimeout(resolve, 150));

    // 5. Capture the isolated wrapper
    const canvas = await html2canvas(wrapper, {
      scale: 2, // High resolution
      useCORS: true,
      allowTaint: false, 
      backgroundColor: '#ffffff',
      logging: false,
    });

    // 6. Cleanup the DOM immediately
    document.body.removeChild(wrapper);

    // 7. Generate the PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.8); // Compress to jpeg to save size
    
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('An error occurred while generating the PDF. Please check your connection and try again.');
    const existingWrapper = document.body.querySelector('div[style*="-9999px"]');
    if (existingWrapper) document.body.removeChild(existingWrapper);
  }
}
