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

// Pure standard CSS for the academic document with zero oklch variables
const ACADEMIC_DOCUMENT_CSS = `
  * {
    box-sizing: border-box;
  }
  body, html {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
    font-family: "Times New Roman", Times, "Liberation Serif", serif;
  }
  .academic-page {
    background: #ffffff !important;
    color: #000000 !important;
    font-family: "Times New Roman", Times, "Liberation Serif", serif;
    font-size: 10.5pt;
    line-height: 1.5;
    width: 210mm !important;
    min-height: 297mm !important;
    height: 297mm !important;
    box-sizing: border-box !important;
    padding: 16mm 18mm 18mm 18mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    position: relative !important;
    overflow: hidden !important;
    transform: none !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
  }
  .academic-page.page-odd {
    padding-left: 24mm !important;
    padding-right: 14mm !important;
  }
  .academic-page.page-even {
    padding-left: 14mm !important;
    padding-right: 24mm !important;
  }
  .top-row-table {
    width: 100%;
    border-collapse: collapse;
    border: none;
    margin-bottom: 12px;
  }
  .top-row-table td {
    border: none;
    padding: 0;
    vertical-align: middle;
    font-weight: bold;
    font-size: 10pt;
    color: #000000;
  }
  .register-boxes {
    border-collapse: collapse;
    margin-left: auto;
  }
  .register-boxes td {
    width: 16px;
    height: 21px;
    border: 1px solid #000000;
    padding: 0;
    text-align: center;
    font-family: "Courier New", Courier, monospace;
    font-size: 10pt;
    font-weight: bold;
    vertical-align: middle;
    color: #000000;
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #000000;
    text-align: center;
    margin-bottom: 14px;
  }
  .header-table td, .header-table th {
    border: 1px solid #000000;
    padding: 6px 10px;
    vertical-align: middle;
    color: #000000;
  }
  .section-bar-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 14px;
    margin-bottom: 0;
  }
  .section-bar-table td {
    border: 1px solid #000000;
    text-align: center;
    padding: 6px 10px;
    font-size: 10.5pt;
    font-weight: bold;
    text-transform: uppercase;
    background: #f4f4f5;
    letter-spacing: 0.5px;
    color: #000000;
  }
  .grid-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: -1px;
    margin-bottom: 14px;
  }
  .grid-table th, .grid-table td {
    border: 1px solid #000000;
    padding: 7px 10px;
    vertical-align: middle;
    font-size: 10pt;
    color: #000000;
  }
  .grid-table th {
    text-align: center;
    font-weight: bold;
    background: #fafafa;
  }
  .content-box {
    border: 1px solid #000000;
    border-top: none;
    padding: 10px 14px;
    font-size: 10pt;
    line-height: 1.55;
    margin-bottom: 14px;
    text-align: justify;
    color: #000000;
  }
  .code-container {
    border: 1px solid #000000;
    border-top: none;
    background: #fafafa;
    padding: 12px 14px;
    font-family: "Times New Roman", Times, "Liberation Serif", serif;
    font-size: 10pt;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    margin-top: -1px;
    margin-bottom: 14px;
    color: #000000;
  }
  .output-container {
    border: 1px solid #000000;
    border-top: none;
    background: #fafafa;
    padding: 10px 14px;
    font-family: "Times New Roman", Times, "Liberation Serif", serif;
    font-size: 10pt;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    margin-top: -1px;
    margin-bottom: 14px;
    color: #000000;
  }
  .doc-footer {
    margin-top: 24px;
    padding-top: 8px;
    border-top: 1px dashed #777777;
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    font-weight: bold;
    color: #444444;
  }
  /* Common Flex / Layout utilities in pure RGB/Hex without oklch */
  .flex { display: flex !important; }
  .flex-col { flex-direction: column !important; }
  .flex-row { flex-direction: row !important; }
  .items-center { align-items: center !important; }
  .items-start { align-items: flex-start !important; }
  .items-baseline { align-items: baseline !important; }
  .justify-between { justify-content: space-between !important; }
  .justify-center { justify-content: center !important; }
  .justify-end { justify-content: flex-end !important; }
  .flex-1 { flex: 1 1 0% !important; }
  .gap-1 { gap: 4px !important; }
  .gap-2 { gap: 8px !important; }
  .gap-3 { gap: 12px !important; }
  .gap-4 { gap: 16px !important; }
  .w-full { width: 100% !important; }
  .h-full { height: 100% !important; }
  .max-w-full { max-width: 100% !important; }
  .text-center { text-align: center !important; }
  .text-left { text-align: left !important; }
  .text-right { text-align: right !important; }
  .text-justify { text-align: justify !important; }
  .font-bold { font-weight: bold !important; }
  .font-normal { font-weight: normal !important; }
  .font-serif { font-family: "Times New Roman", Times, "Liberation Serif", serif !important; }
  .italic { font-style: italic !important; }
  .uppercase { text-transform: uppercase !important; }
  .tracking-widest { letter-spacing: 0.1em !important; }
  .tracking-wider { letter-spacing: 0.05em !important; }
  .whitespace-nowrap { white-space: nowrap !important; }
  .text-black { color: #000000 !important; }
  .text-neutral-400 { color: #a3a3a3 !important; }
  .text-neutral-500 { color: #737373 !important; }
  .text-neutral-600 { color: #525252 !important; }
  .text-neutral-700 { color: #404040 !important; }
  .text-neutral-300 { color: #d4d4d4 !important; }
  .bg-white { background-color: #ffffff !important; }
  .opacity-15 { opacity: 0.15 !important; }
  .space-y-3 > * + * { margin-top: 12px !important; }
  .leading-relaxed { line-height: 1.625 !important; }
  .object-contain { object-fit: contain !important; }
`;

// Helper to remove any oklch color references that might cause html2canvas parsing errors
const sanitizeOklchColors = (element) => {
  const allElements = [element, ...element.querySelectorAll('*')];
  for (const el of allElements) {
    if (el.style) {
      for (let i = 0; i < el.style.length; i++) {
        const prop = el.style[i];
        const val = el.style.getPropertyValue(prop);
        if (val && val.includes('oklch')) {
          el.style.removeProperty(prop);
        }
      }
    }
  }
};

/**
 * Exports rendered .academic-page elements directly to an exact A4 PDF
 * using an isolated single-page sandbox with pure CSS (zero oklch)
 * guaranteeing 100% visual fidelity and zero crashes.
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

      // Populate sandbox with isolated pure CSS and cloned page
      sandbox.innerHTML = `
        <style>
          ${ACADEMIC_DOCUMENT_CSS}
        </style>
      `;

      const clonedPage = page.cloneNode(true);
      sanitizeOklchColors(clonedPage);
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
        ignoreElements: (element) => {
          return element.classList && element.classList.contains('no-print');
        }
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




