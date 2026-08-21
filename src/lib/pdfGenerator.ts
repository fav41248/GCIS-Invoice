export async function downloadAsPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-10000px';
    iframe.style.bottom = '-10000px';
    iframe.style.width = '210mm'; // A4 width
    // Set a large enough height to render content naturally without scrollbars
    iframe.style.height = '2000px'; 
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      throw new Error("Could not access iframe document");
    }

    // Open iframe document and write HTML skeleton
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename.replace('.pdf', '')}</title>
          <meta charset="utf-8">
        </head>
        <body class="bg-white">
          <div id="print-root"></div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Copy all stylesheets from the main document to the iframe
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach((style) => {
      iframeDoc.head.appendChild(style.cloneNode(true));
    });

    // Add specific print styles
    const printStyle = iframeDoc.createElement('style');
    printStyle.textContent = `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background-color: white !important;
        margin: 0;
        padding: 0;
      }
      #print-root {
        width: 210mm;
        margin: 0 auto;
        background: white;
      }
      /* Hide things that shouldn't be printed */
      .print\\:hidden { display: none !important; }
      
      /* Make inputs look like standard text in print */
      input, textarea {
        border: none !important;
        background: transparent !important;
        outline: none !important;
        box-shadow: none !important;
        resize: none !important;
        -webkit-appearance: none !important;
        appearance: none !important;
      }
      /* Hide number input spinners in print */
      input[type="number"]::-webkit-inner-spin-button,
      input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none !important;
        margin: 0 !important;
      }
      /* Ensure proper styling for tailwind background colors */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `;
    iframeDoc.head.appendChild(printStyle);

    // Clone the element and append it to the iframe's print-root
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Remove the fixed A4 container constraints that might conflict with print
    clone.style.width = '100%';
    clone.style.height = 'auto';
    clone.style.minHeight = '0';
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';
    // KEEP padding so internal layout remains intact
    
    iframeDoc.getElementById('print-root')?.appendChild(clone);

    // Wait a brief moment to ensure fonts/styles/images are applied
    await new Promise(resolve => setTimeout(resolve, 800));

    // Trigger the print dialog
    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }

    // Clean up the iframe after print dialog is closed
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('An error occurred while preparing the document for print/PDF. Please try again.');
  }
}
