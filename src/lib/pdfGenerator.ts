import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export async function downloadAsPDF(elementId: string, filename: string) {
  // Use querySelectorAll to find the *visible* preview element.
  // When PrintModal is open, the main one might be hidden or we want the one in the modal.
  const elements = document.querySelectorAll(`#${elementId}`);
  let element = elements[elements.length - 1] as HTMLElement; // Get the last one (likely the modal one if open)

  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // We capture the canvas exactly as it looks on screen.
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution for sharpness
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    
    // Create an A4 portrait PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    
    // Calculate the height to perfectly maintain the original element's aspect ratio
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.height / imgProps.width;
    const finalHeight = pdfWidth * imgRatio;

    // Add the image perfectly scaled to A4 width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight);
    
    // Auto download the exact screenshot
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('An error occurred while generating the PDF. Please try again.');
  }
}
