import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Helper to convert an image URL to a base64 Data URL to eliminate CORS/canvas tainting
const imgToDataUrl = async (imgUrl) => {
  try {
    const res = await fetch(imgUrl, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not convert image to Data URL:', imgUrl, e);
    return null;
  }
};

/**
 * Pre-inlines all images in the container as base64 data URLs to guarantee zero canvas tainting.
 */
const preloadAndInlineImages = async (container) => {
  const images = Array.from(container.querySelectorAll('img'));
  const cache = new Map();

  for (const img of images) {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) continue;

    if (!cache.has(src)) {
      const dataUrl = await imgToDataUrl(src);
      cache.set(src, dataUrl);
    }

    const cachedData = cache.get(src);
    if (cachedData) {
      img.src = cachedData;
    }
  }
};

/**
 * Exports rendered .academic-page elements directly to an exact A4 PDF
 * using the live DOM preview as the single source of truth.
 *
 * Preserves 100% exact layout, positioning, fonts, font sizes, spacing,
 * margins, borders, colors, images, headers/footers, and page breaks.
 */
export const exportDomToPdf = async (containerElement, fileName = 'LabRecord.pdf', onProgress) => {
  const root = containerElement || document.querySelector('.lab-record-wrapper') || document.body;
  if (!root) {
    throw new Error('Document container not found');
  }

  const pages = Array.from(root.querySelectorAll('.academic-page'));
  if (!pages || pages.length === 0) {
    throw new Error('No pages found in document to export');
  }

  // Pre-inline images to ensure zero CORS/taint errors during canvas export
  try {
    await preloadAndInlineImages(root);
  } catch (e) {
    console.warn('Image preloading warning:', e);
  }

  // Create jsPDF document: A4 portrait (210mm x 297mm)
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

    // Capture each academic-page element at high DPI (2.0x standard 96 DPI = crisp 192 DPI print quality)
    const canvas = await html2canvas(page, {
      scale: 2.0,
      useCORS: true,
      allowTaint: false, // Must be false to allow canvas.toDataURL() without SecurityError
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        // Reset zoom and scale on all parents in the cloned tree so dimensions are 1:1 unzoomed
        const wrappers = clonedDoc.querySelectorAll('.document-canvas, .lab-record-wrapper, body, html');
        wrappers.forEach((el) => {
          el.style.zoom = '1';
          el.style.transform = 'none';
          el.style.margin = '0';
          el.style.padding = '0';
        });

        // Reset any spread layout wrappers
        const spreads = clonedDoc.querySelectorAll('.booklet-spread-container');
        spreads.forEach((el) => {
          el.style.display = 'block';
          el.style.gap = '0';
          el.style.margin = '0';
          el.style.padding = '0';
        });

        // Ensure target cloned page has exact unscaled A4 dimensions and no external shadows
        const clonedPages = clonedDoc.querySelectorAll('.academic-page');
        clonedPages.forEach((p) => {
          p.style.width = '210mm';
          p.style.minHeight = '297mm';
          p.style.height = '297mm';
          p.style.boxSizing = 'border-box';
          p.style.boxShadow = 'none';
          p.style.margin = '0';
          p.style.transform = 'none';
          p.style.overflow = 'hidden';
        });
      },
    });

    // Lossless PNG data URL to ensure pixel-perfect fidelity of text, borders, and lines
    const imgData = canvas.toDataURL('image/png');

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // A4 sheet dimensions: 210mm width x 297mm height
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'SLOW');
  }

  pdf.save(fileName);
};


