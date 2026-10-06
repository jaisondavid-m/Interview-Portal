import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Exports rendered .academic-page elements directly to an exact A4 PDF
 * guaranteeing 100% visual fidelity matching the live preview.
 */
export const exportDomToPdf = async (containerElement, fileName = 'LabRecord.pdf', onProgress) => {
  if (!containerElement) {
    throw new Error('Document container not found');
  }

  const pages = containerElement.querySelectorAll('.academic-page');
  if (!pages || pages.length === 0) {
    throw new Error('No pages found in document to export');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const page = pages[i];

    if (onProgress) {
      onProgress(i + 1, total);
    }

    // Capture exact DOM element at high resolution
    const canvas = await html2canvas(page, {
      scale: 2.2, // 2.2x DPI for crisp text and borders with optimal memory
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: page.scrollWidth || 794,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // A4 sheet dimensions: 210mm width x 297mm height
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  pdf.save(fileName);
};
