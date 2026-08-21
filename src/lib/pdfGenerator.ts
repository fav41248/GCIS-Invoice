import domtoimage from 'dom-to-image-more';
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
    // This allows input fields to keep their values via deep clone manually if needed
    // However, dom-to-image-more clones it internally and captures inputs automatically!
    // But to ensure it captures the current screen size at 800px, we wrap it.
    
    // We clone the node to isolate it from mobile squishing
    const clone = sourceElement.cloneNode(true) as HTMLElement;
    clone.style.width = '800px';
    clone.style.minWidth = '800px';
    clone.style.maxWidth = '800px';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.transform = 'none';
    clone.style.position = 'relative';
    
    // Manually copy input/textarea values to the clone since cloneNode doesn't copy current values
    const originalInputs = sourceElement.querySelectorAll('input, textarea, select');
    const clonedInputs = clone.querySelectorAll('input, textarea, select');
    originalInputs.forEach((input, index) => {
      const clonedInput = clonedInputs[index] as any;
      if (clonedInput && input) {
        clonedInput.value = (input as any).value;
        if ((input as any).checked !== undefined) {
           clonedInput.checked = (input as any).checked;
        }
      }
    });

    wrapper.appendChild(clone);

    // 3. Wait a moment for browser to apply styles in the clone
    await new Promise(resolve => setTimeout(resolve, 150));

    // 4. Capture the isolated wrapper using dom-to-image-more
    // This perfectly supports modern CSS like Tailwind v4 because the browser's own rendering engine does it.
    
    // We scale it up by 1.5 to maintain good quality text
    const scale = 1.5;
    
    const imgData = await domtoimage.toJpeg(wrapper, {
      quality: 0.8,
      bgcolor: '#ffffff',
      width: 800 * scale,
      height: wrapper.offsetHeight * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: '800px',
        height: `${wrapper.offsetHeight}px`
      }
    });

    // 5. Cleanup the DOM immediately
    document.body.removeChild(wrapper);

    // 6. Generate the PDF
    const pdf = new jsPDF({
      orientation: wrapper.offsetWidth > wrapper.offsetHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [800, wrapper.offsetHeight]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 800, wrapper.offsetHeight);
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('An error occurred while generating the PDF. Please check your connection and try again.');
    // Cleanup if it failed halfway
    const existingWrapper = document.body.querySelector('div[style*="-9999px"]');
    if (existingWrapper) document.body.removeChild(existingWrapper);
  }
}
