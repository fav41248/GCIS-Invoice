const fs = require('fs');
let code = fs.readFileSync('src/lib/pdfGenerator.ts', 'utf8');

const oldPdfGeneration = `    // 6. Generate the actual PDF
    const pdfWidth = 800 * scale;
    const pdfHeight = sourceElement.scrollHeight * scale;
    
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfWidth, pdfHeight]
    });
    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } catch (error) {`;

const newPdfGeneration = `    // 6. Generate the actual PDF
    const pdfWidth = 800 * scale;
    const pdfHeight = sourceElement.scrollHeight * scale;
    
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfWidth, pdfHeight]
    });
    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    
    // 7. Mobile-Friendly Download Handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && navigator.share) {
      try {
        const blob = pdf.output('blob');
        const file = new File([blob], filename, { type: 'application/pdf' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename
          });
          return;
        }
      } catch (shareError) {
        console.warn('Web Share API failed or was cancelled, falling back to standard download', shareError);
      }
    }

    // Standard download (Desktop and mobile fallback)
    pdf.save(filename);
  } catch (error) {`;

code = code.replace(oldPdfGeneration, newPdfGeneration);

fs.writeFileSync('src/lib/pdfGenerator.ts', code);
console.log("Updated pdfGenerator.ts");
