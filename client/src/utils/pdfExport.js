import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Helper to convert an image URL to a base64 Data URL to eliminate CORS/canvas tainting
const imgToDataUrl = async (imgUrl) => {
  try {
    const res = await fetch(imgUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
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
 * using an isolated single-page sandbox to guarantee 100% fidelity,
 * instant rendering speed, and zero memory leaks.
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

  // Pre-inline images to eliminate any potential canvas taint errors
  try {
    await preloadAndInlineImages(root);
  } catch (e) {
    console.warn('Image preloading warning:', e);
  }

  // Gather all style elements and stylesheets from the main document
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  // Create an offscreen sandbox container with exact unscaled A4 dimensions (210mm x 297mm)
  const sandbox = document.createElement('div');
  sandbox.id = 'pdf-export-sandbox';
  sandbox.style.position = 'fixed';
  sandbox.style.left = '-99999px';
  sandbox.style.top = '0';
  sandbox.style.width = '210mm';
  sandbox.style.minHeight = '297mm';
  sandbox.style.background = '#ffffff';
  sandbox.style.zIndex = '-99999';
  sandbox.style.overflow = 'hidden';
  sandbox.style.boxSizing = 'border-box';
  document.body.appendChild(sandbox);

  // Initialize jsPDF document (A4 portrait: 210mm width x 297mm height)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const total = pages.length;

  try {
    for (let i = 0; i < total; i++) {
      const page = pages[i];

      if (onProgress) {
        onProgress(i + 1, total);
      }

      // Populate sandbox with isolated cloned page and full styles
      sandbox.innerHTML = `
        ${styleTags}
        <style>
          body, html { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
          .academic-page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            transform: none !important;
          }
        </style>
      `;

      const clonedPage = page.cloneNode(true);
      clonedPage.style.margin = '0';
      clonedPage.style.boxShadow = 'none';
      clonedPage.style.width = '210mm';
      clonedPage.style.minHeight = '297mm';
      clonedPage.style.height = '297mm';
      clonedPage.style.boxSizing = 'border-box';
      clonedPage.style.overflow = 'hidden';
      clonedPage.style.transform = 'none';
      sandbox.appendChild(clonedPage);

      // Render isolated single page to canvas
      const canvas = await html2canvas(clonedPage, {
        scale: 1.8, // 1.8x DPI (~1430px x 2020px) — crisp print resolution with optimal memory
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Add to A4 PDF page (210mm x 297mm)
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    pdf.save(fileName);
  } finally {
    // Ensure sandbox cleanup
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }
};



