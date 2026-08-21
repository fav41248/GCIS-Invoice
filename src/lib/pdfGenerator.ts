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

    wrapper.appendChild(clone);

    // 3. Wait a moment for browser to apply styles in the clone
    await new Promise(resolve => setTimeout(resolve, 150));

    // 4. Capture the isolated wrapper
    // We reduce scale slightly from 2.0 to 1.5 to drastically reduce file size while maintaining readability
    const canvas = await html2canvas(wrapper, {
      scale: 1.5, 
      useCORS: true,
      allowTaint: false, 
      backgroundColor: '#ffffff',
      logging: false,
    });

    // 5. Cleanup the DOM immediately
    document.body.removeChild(wrapper);

    // 6. Generate the PDF
    // Switch to JPEG compression instead of PNG to make the file size MUCH lighter
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Instead of forcing it to standard A4 paper, we create a custom PDF page size 
    // that EXACTLY matches the dimensions of the invoice preview tab block.
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
  }
}
