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
    const canvas = await html2canvas(sourceElement, {
      scale: 1.5, 
      useCORS: true,
      allowTaint: false, 
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
      onclone: (clonedDoc) => {
        // html2canvas clones the whole document. We need to find our element in the clone
        // and force all its parents to have overflow: visible so it doesn't get clipped.
        const clonedElements = clonedDoc.querySelectorAll(`#${elementId}`);
        const clonedElement = clonedElements[clonedElements.length - 1] as HTMLElement;
        
        if (clonedElement) {
            clonedElement.style.width = '800px';
            clonedElement.style.minWidth = '800px';
            clonedElement.style.maxWidth = '800px';
            
            let parent = clonedElement.parentElement;
            while(parent && parent !== clonedDoc.body) {
                parent.style.overflow = 'visible';
                parent.style.position = 'static';
                parent.style.maxHeight = 'none';
                parent.style.transform = 'none';
                parent = parent.parentElement;
            }
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    
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
