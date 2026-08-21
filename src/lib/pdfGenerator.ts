import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

export async function downloadAsPDF(elementId: string, filename: string) {
  const elements = document.querySelectorAll(`#${elementId}`);
  let sourceElement = elements[elements.length - 1] as HTMLElement;

  if (!sourceElement) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px'; 
    wrapper.style.top = '0';
    wrapper.style.width = '800px'; 
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.zIndex = '-1000';
    document.body.appendChild(wrapper);

    const clone = sourceElement.cloneNode(true) as HTMLElement;
    clone.style.width = '800px';
    clone.style.minWidth = '800px';
    clone.style.maxWidth = '800px';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.transform = 'none';
    clone.style.position = 'relative'; 

    // --- FIX FOR CLOUDFLARE/TAILWIND CSS DROPPING ---
    // Fetch all external stylesheets manually and inline them into the clone.
    const styleNode = document.createElement('style');
    let cssText = '';
    
    document.querySelectorAll('style').forEach(s => {
      cssText += s.innerHTML + '\n';
    });

    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (const link of Array.from(links)) {
      try {
        const href = (link as HTMLLinkElement).href;
        if (href) {
          const response = await fetch(href);
          if (response.ok) {
            cssText += await response.text() + '\n';
          }
        }
      } catch (e) {
        console.warn('Failed to fetch stylesheet for PDF generation:', e);
      }
    }
    
    styleNode.innerHTML = cssText;
    clone.insertBefore(styleNode, clone.firstChild);
    // ------------------------------------------------

    // Convert all inputs into standard text DIVs in the clone!
    const originalInputs = sourceElement.querySelectorAll('input, textarea, select');
    const clonedInputs = clone.querySelectorAll('input, textarea, select');
    
    originalInputs.forEach((original, index) => {
      const cloned = clonedInputs[index] as HTMLElement;
      if (cloned && original) {
        const val = (original as HTMLInputElement).value;
        
        const textNode = document.createElement('div');
        textNode.innerText = val;
        
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
        
        textNode.style.justifyContent = 
          computedStyle.textAlign === 'right' ? 'flex-end' : 
          (computedStyle.textAlign === 'center' ? 'center' : 'flex-start');
        
        textNode.style.overflow = 'hidden';
        textNode.style.boxSizing = 'border-box';
        
        if (cloned.parentNode) {
          cloned.parentNode.replaceChild(textNode, cloned);
        }
      }
    });

    wrapper.appendChild(clone);

    await new Promise(resolve => setTimeout(resolve, 150));

    const scale = 2;
    
    const dataUrl = await htmlToImage.toJpeg(wrapper, {
      quality: 0.9,
      backgroundColor: '#ffffff',
      pixelRatio: scale,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      }
    });

    document.body.removeChild(wrapper);

    const pdf = new jsPDF({
      orientation: wrapper.offsetWidth > wrapper.offsetHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [wrapper.offsetWidth, wrapper.offsetHeight]
    });

    pdf.addImage(dataUrl, 'JPEG', 0, 0, wrapper.offsetWidth, wrapper.offsetHeight);
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('An error occurred while generating the PDF. Please check your connection and try again.');
    const existingWrapper = document.body.querySelector('div[style*="-9999px"]');
    if (existingWrapper) document.body.removeChild(existingWrapper);
  }
}
