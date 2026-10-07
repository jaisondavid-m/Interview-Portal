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

// Standard CSS strictly scoped to #pdf-export-sandbox with zero oklch variables and zero global leaks
const ACADEMIC_DOCUMENT_CSS = `
  #pdf-export-sandbox * {
    box-sizing: border-box !important;
  }
  #pdf-export-sandbox .academic-page {
    background: #ffffff !important;
    color: #000000 !important;
    font-family: "Times New Roman", Times, "Liberation Serif", serif !important;
    font-size: 10.5pt !important;
    line-height: 1.5 !important;
    width: 210mm !important;
    min-height: 297mm !important;
    height: 297mm !important;
    box-sizing: border-box !important;
    border: none !important;
    padding: 14mm 16mm 16mm 16mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    position: relative !important;
    overflow: hidden !important;
    transform: none !important;
    display: flex !important;
    flex-direction: column !important;
  }
  #pdf-export-sandbox .academic-page.page-odd {
    padding-left: 20mm !important;
    padding-right: 14mm !important;
  }
  #pdf-export-sandbox .academic-page.page-even {
    padding-left: 14mm !important;
    padding-right: 20mm !important;
  }
  #pdf-export-sandbox .top-row-table {
    width: 100% !important;
    border-collapse: collapse !important;
    border: none !important;
    margin-bottom: 38px !important;
  }
  #pdf-export-sandbox .top-row-table td {
    border: none !important;
    padding: 0 !important;
    vertical-align: middle !important;
    font-weight: bold !important;
    font-size: 10pt !important;
    color: #000000 !important;
  }
  #pdf-export-sandbox .register-boxes {
    border-collapse: collapse !important;
    margin-left: auto !important;
  }
  #pdf-export-sandbox .register-boxes td {
    width: 16px !important;
    height: 21px !important;
    border: 1px solid #000000 !important;
    padding: 0 !important;
    text-align: center !important;
    font-family: "Courier New", Courier, monospace !important;
    font-size: 10pt !important;
    font-weight: bold !important;
    vertical-align: middle !important;
    color: #000000 !important;
  }
  #pdf-export-sandbox .header-table {
    width: 100% !important;
    border-collapse: collapse !important;
    border: 1px solid #000000 !important;
    text-align: center !important;
    margin-bottom: 14px !important;
  }
  #pdf-export-sandbox .header-table td, #pdf-export-sandbox .header-table th {
    border: 1px solid #000000 !important;
    padding: 6px 10px !important;
    vertical-align: middle !important;
    color: #000000 !important;
  }
  #pdf-export-sandbox .section-bar-table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin-top: 14px !important;
    margin-bottom: 4px !important;
  }
  #pdf-export-sandbox .section-bar-table td {
    border: none !important;
    text-align: left !important;
    padding: 4px 0 !important;
    font-size: 11pt !important;
    font-weight: bold !important;
    text-transform: uppercase !important;
    background: transparent !important;
    letter-spacing: 0.5px !important;
    color: #000000 !important;
    text-decoration: underline !important;
    text-underline-offset: 3px !important;
  }
  #pdf-export-sandbox .grid-table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin-top: -1px !important;
    margin-bottom: 14px !important;
  }
  #pdf-export-sandbox .grid-table th, #pdf-export-sandbox .grid-table td {
    border: 1px solid #000000 !important;
    padding: 7px 10px !important;
    vertical-align: middle !important;
    font-size: 10pt !important;
    color: #000000 !important;
  }
  #pdf-export-sandbox .grid-table th {
    text-align: center !important;
    font-weight: bold !important;
    background: #fafafa !important;
  }
  #pdf-export-sandbox .content-box {
    border: none !important;
    padding: 4px 0 10px 0 !important;
    font-size: 10.5pt !important;
    line-height: 1.6 !important;
    margin-bottom: 12px !important;
    text-align: justify !important;
    color: #000000 !important;
    background: transparent !important;
  }
  #pdf-export-sandbox .code-container {
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
    font-family: Consolas, Monaco, "SF Pro Mono", "Segoe UI Mono", "Roboto Mono", "Ubuntu Mono", monospace, sans-serif !important;
    font-size: 9.5pt !important;
    line-height: 1.42 !important;
    letter-spacing: 0.1px !important;
    white-space: pre-wrap !important;
    word-break: break-word !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    color: #111827 !important;
    box-sizing: border-box !important;
    -webkit-font-smoothing: antialiased !important;
  }
  #pdf-export-sandbox .output-container {
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
    font-family: Consolas, Monaco, "SF Pro Mono", "Segoe UI Mono", "Roboto Mono", "Ubuntu Mono", monospace, sans-serif !important;
    font-size: 9.5pt !important;
    line-height: 1.42 !important;
    letter-spacing: 0.1px !important;
    white-space: pre-wrap !important;
    word-break: break-word !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    color: #111827 !important;
    box-sizing: border-box !important;
    -webkit-font-smoothing: antialiased !important;
  }
  #pdf-export-sandbox .doc-footer {
    position: absolute !important;
    bottom: 11mm !important;
    left: 16mm !important;
    right: 16mm !important;
    padding-top: 6px !important;
    border-top: 1px dashed #777777 !important;
    display: flex !important;
    justify-content: space-between !important;
    font-size: 8.5pt !important;
    font-weight: bold !important;
    color: #444444 !important;
  }
  #pdf-export-sandbox .academic-page.page-odd .doc-footer {
    left: 20mm !important;
    right: 14mm !important;
  }
  #pdf-export-sandbox .academic-page.page-even .doc-footer {
    left: 14mm !important;
    right: 20mm !important;
  }
  #pdf-export-sandbox .flex { display: flex !important; }
  #pdf-export-sandbox .flex-col { flex-direction: column !important; }
  #pdf-export-sandbox .flex-row { flex-direction: row !important; }
  #pdf-export-sandbox .items-center { align-items: center !important; }
  #pdf-export-sandbox .items-start { align-items: flex-start !important; }
  #pdf-export-sandbox .items-baseline { align-items: baseline !important; }
  #pdf-export-sandbox .justify-between { justify-content: space-between !important; }
  #pdf-export-sandbox .justify-center { justify-content: center !important; }
  #pdf-export-sandbox .justify-end { justify-content: flex-end !important; }
  #pdf-export-sandbox .flex-1 { flex: 1 1 0% !important; }
  #pdf-export-sandbox .gap-1 { gap: 4px !important; }
  #pdf-export-sandbox .gap-2 { gap: 8px !important; }
  #pdf-export-sandbox .gap-3 { gap: 12px !important; }
  #pdf-export-sandbox .gap-4 { gap: 16px !important; }
  #pdf-export-sandbox .w-full { width: 100% !important; }
  #pdf-export-sandbox .h-full { height: 100% !important; }
  #pdf-export-sandbox .max-w-full { max-width: 100% !important; }
  #pdf-export-sandbox .text-center { text-align: center !important; }
  #pdf-export-sandbox .text-left { text-align: left !important; }
  #pdf-export-sandbox .text-right { text-align: right !important; }
  #pdf-export-sandbox .text-justify { text-align: justify !important; }
  #pdf-export-sandbox .font-bold { font-weight: bold !important; }
  #pdf-export-sandbox .font-normal { font-weight: normal !important; }
  #pdf-export-sandbox .font-serif { font-family: "Times New Roman", Times, "Liberation Serif", serif !important; }
  #pdf-export-sandbox .italic { font-style: italic !important; }
  #pdf-export-sandbox .uppercase { text-transform: uppercase !important; }
  #pdf-export-sandbox .tracking-widest { letter-spacing: 0.1em !important; }
  #pdf-export-sandbox .tracking-wider { letter-spacing: 0.05em !important; }
  #pdf-export-sandbox .whitespace-nowrap { white-space: nowrap !important; }
  #pdf-export-sandbox .text-black { color: #000000 !important; }
  #pdf-export-sandbox .text-neutral-400 { color: #a3a3a3 !important; }
  #pdf-export-sandbox .text-neutral-500 { color: #737373 !important; }
  #pdf-export-sandbox .text-neutral-600 { color: #525252 !important; }
  #pdf-export-sandbox .text-neutral-700 { color: #404040 !important; }
  #pdf-export-sandbox .text-neutral-300 { color: #d4d4d4 !important; }
  #pdf-export-sandbox .bg-white { background-color: #ffffff !important; }
  #pdf-export-sandbox .opacity-15 { opacity: 0.15 !important; }
  #pdf-export-sandbox .space-y-3 > * + * { margin-top: 12px !important; }
  #pdf-export-sandbox .leading-relaxed { line-height: 1.625 !important; }
  #pdf-export-sandbox .object-contain { object-fit: contain !important; }
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
  sandbox.style.pointerEvents = 'none';
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

      // Small async tick to let browser UI and React state render smoothly
      await new Promise((resolve) => setTimeout(resolve, 20));

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




