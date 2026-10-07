import React from 'react';

// Academic Single Line Border matching manual specification
export const PageBorderFrame = ({ isOdd = true, isDuplex = true }) => {
  const x1 = isDuplex ? (isOdd ? 14 : 10) : 10;
  const y1 = 8;
  const w = isDuplex ? 186 : 190;
  const h = 281;

  return (
    <svg
      className="page-border-svg pointer-events-none select-none"
      viewBox="0 0 210 297"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      {/* Single clean crisp rectangular border in black */}
      <rect
        x={x1}
        y={y1}
        width={w}
        height={h}
        fill="none"
        stroke="#000000"
        strokeWidth="0.38"
      />
    </svg>
  );
};

// Helper to format procedure/algorithm steps cleanly
export const parseProcedureSteps = (procedure) => {
  if (!procedure) return [];

  const cleanStepText = (str) => {
    return String(str || '')
      .replace(/^Step\s*\d+[:.]\s*/i, '')
      .replace(/^\d+[\.)\]]\s*/, '')
      .replace(/^[-*•]\s*/, '')
      .trim();
  };

  if (Array.isArray(procedure)) {
    return procedure
      .map((s) => cleanStepText(s))
      .filter(Boolean);
  }

  let trimmed = String(procedure).trim();
  if (!trimmed) return [];

  // If JSON array string
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .map((s) => cleanStepText(s))
          .filter(Boolean);
      }
    } catch {
      // fallback to text split
    }
  }

  // Remove common heading prefixes like "Algorithm:" or "Procedure:"
  trimmed = trimmed
    .replace(/^(?:ALGORITHM|PROCEDURE|STEP-BY-STEP PROCEDURE)\s*[:\-]?\s*/i, '')
    .trim();

  // If text contains newlines, split by line
  if (trimmed.includes('\n')) {
    const rawLines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/^algorithm\s*[:\-]?$/i.test(l) && !/^procedure\s*[:\-]?$/i.test(l));

    if (rawLines.length > 0) {
      return rawLines.map(cleanStepText).filter(Boolean);
    }
  }

  // Check if text has explicit step markers like "Step 1:", "1.", "1)", etc.
  const stepPattern = /(?:^|\s*)(?:Step\s*\d+[:.]|\d+[\.)\]])\s+/i;
  if (stepPattern.test(trimmed)) {
    const parts = trimmed
      .split(/(?:^|\s+)(?=Step\s*\d+[:.]|\d+[\.)\]])/i)
      .map((s) => cleanStepText(s))
      .filter(Boolean);
    if (parts.length > 0) {
      return parts;
    }
  }

  // Otherwise split by sentence boundaries (. followed by space and capital letter/number)
  const sentences = trimmed
    .split(/\.\s+(?=[A-Z0-9])/)
    .map((s) => cleanStepText(s.replace(/\.$/, '') + '.'))
    .filter(Boolean);

  if (sentences.length > 1) {
    return sentences;
  }

  return [cleanStepText(trimmed)].filter(Boolean);
};

// Clean and format execution output with uploaded Sample Input & Sample Output
export const cleanExecutionOutput = (output, title, sampleTestCases) => {
  // If structured sample test cases are passed, format them directly
  if (sampleTestCases) {
    try {
      const parsed = typeof sampleTestCases === 'string' ? JSON.parse(sampleTestCases) : sampleTestCases;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((tc, idx) => {
          const prefix = parsed.length > 1 ? `[SAMPLE TEST CASE ${idx + 1}]\n` : '';
          const inp = (tc.input || tc.sample_input || tc.test_input || '').trim();
          const out = (tc.expected_output || tc.expected || tc.output || tc.expectedOutput || tc.sample_output || tc.console_output || '').trim();
          let block = prefix;
          if (inp) {
            block += `Sample Input:\n${inp}\n\n`;
          }
          if (out) {
            block += `Sample Output:\n${out}`;
          } else if (output && typeof output === 'string') {
            const cleanedRaw = output
              .replace(/\[EXECUTION STATUS:.*?\]/gi, '')
              .replace(/>>\s*Assertion Check\s*\d+:\s*PASSED/gi, '')
              .replace(/All assertions passed successfully for.*?\./gi, '')
              .replace(/All test cases passed\./gi, '')
              .trim();
            if (cleanedRaw) {
              block += `Sample Output:\n${cleanedRaw}`;
            }
          }
          return block.trim();
        }).filter(Boolean).join('\n\n' + '—'.repeat(38) + '\n\n');
      }
    } catch { }
  }

  if (!output || typeof output !== 'string') {
    return `Sample Input:\n>> Standard test input processed.\n\nSample Output:\n>> Result computed for ${title || 'experiment'}.\n>> Execution completed successfully.`;
  }

  let cleaned = output
    .replace(/\[EXECUTION STATUS:.*?\]/gi, '')
    .replace(/>>\s*Assertion Check\s*\d+:\s*PASSED/gi, '')
    .replace(/All assertions passed successfully for.*?\./gi, '')
    .replace(/All test cases passed\./gi, '')
    .trim();

  if (!cleaned) {
    return `Sample Input:\n>> Standard input verified.\n\nSample Output:\n>> Execution completed successfully for ${title || 'experiment'}.`;
  }

  if (!cleaned.includes('Sample Output:') && !cleaned.includes('Sample Console Output:') && !cleaned.includes('Sample Input:')) {
    cleaned = `Sample Output:\n${cleaned}`;
  } else if (cleaned.includes('Sample Console Output:')) {
    cleaned = cleaned.replace(/Sample Console Output:/g, 'Sample Output:');
  }

  return cleaned;
};

// Render formatted output with lightly bold section labels
export const renderFormattedOutput = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (/^\[SAMPLE TEST CASE \d+\]/i.test(trimmed)) {
      return (
        <div key={idx} style={{ fontWeight: 600, color: '#111827', margin: idx > 0 ? '10px 0 4px 0' : '0 0 4px 0', letterSpacing: '0.3px' }}>
          {line}
        </div>
      );
    }
    if (/^Sample Input:/i.test(trimmed)) {
      return (
        <div key={idx} style={{ fontWeight: 600, color: '#111827', marginTop: idx > 0 ? '8px' : '0', marginBottom: '2px' }}>
          Sample Input:
        </div>
      );
    }
    if (/^Sample (Console )?Output:/i.test(trimmed)) {
      return (
        <div key={idx} style={{ fontWeight: 600, color: '#111827', marginTop: idx > 0 ? '8px' : '0', marginBottom: '2px' }}>
          Sample Output:
        </div>
      );
    }
    if (/^—{10,}/.test(trimmed)) {
      return <div key={idx} style={{ borderBottom: '1px dashed #d1d5db', margin: '8px 0' }} />;
    }
    return (
      <div key={idx} style={{ minHeight: line === '' ? '0.7em' : 'auto', color: '#1f2937' }}>
        {line}
      </div>
    );
  });
};

// Smart paginator for experiment code & output guaranteeing every page is strictly A4 height
export const paginateExperimentContent = (code = '', output = '', sampleTestCases = null, title = '') => {
  const cleanOut = cleanExecutionOutput(output, title, sampleTestCases);
  const codeLines = (code || '').trim() ? (code || '').trim().split(/\r?\n/) : [];
  const outLines = (cleanOut || '').trim() ? (cleanOut || '').trim().split(/\r?\n/) : [];

  // Smart dynamic line thresholds per A4 page:
  // - First page (with top register table & section header): ~38-40 lines
  // - Continuation pages (with top register table only): ~45-48 lines
  const FIRST_PAGE_MAX_CODE_LINES = 40;
  const CONT_PAGE_MAX_CODE_LINES = 46;

  const FIRST_PAGE_MAX_OUT_LINES = 38;
  const CONT_PAGE_MAX_OUT_LINES = 45;

  // 1. Chunk code lines (for Right pages)
  const codeChunks = [];
  let cIdx = 0;
  while (cIdx < codeLines.length) {
    const limit = codeChunks.length === 0 ? FIRST_PAGE_MAX_CODE_LINES : CONT_PAGE_MAX_CODE_LINES;
    const chunk = codeLines.slice(cIdx, cIdx + limit);
    codeChunks.push(chunk.join('\n'));
    cIdx += limit;
  }
  if (codeChunks.length === 0) {
    codeChunks.push(`# Program for: ${title || 'Lab Experiment'}\ndef main():\n    print("Execution completed successfully")\n\nif __name__ == '__main__':\n    main()`);
  }

  // 2. Chunk output lines (for Left pages)
  const outChunks = [];
  let oIdx = 0;
  while (oIdx < outLines.length) {
    const limit = outChunks.length === 0 ? FIRST_PAGE_MAX_OUT_LINES : CONT_PAGE_MAX_OUT_LINES;
    const chunk = outLines.slice(oIdx, oIdx + limit);
    outChunks.push(chunk.join('\n'));
    oIdx += limit;
  }
  if (outChunks.length === 0) {
    outChunks.push('Sample Output:\n>> Execution completed successfully.');
  }

  // Spreads count for code/output section
  const codeOutputPairsCount = Math.max(codeChunks.length, outChunks.length);
  const pairs = [];

  // Pair 1: Spread 1 (Aim & Algorithm)
  // Left: Blank Page | Right: Aim & Algorithm
  pairs.push({
    spreadType: 'aim_algo',
    left: { type: 'blank', titleSuffix: '' },
    right: { type: 'aim_algo', titleSuffix: '' }
  });

  // Pair 2..N: Spread(s) for Program (Right) & Output (Left)
  for (let i = 0; i < codeOutputPairsCount; i++) {
    const codeChunk = codeChunks[i] || '';
    const outChunk = outChunks[i] || '';

    pairs.push({
      spreadType: 'code_output',
      left: outChunk
        ? { type: 'output', output: outChunk, chunkIndex: i }
        : { type: 'blank', chunkIndex: i },
      right: codeChunk
        ? { type: 'code', code: codeChunk, chunkIndex: i }
        : { type: 'blank', chunkIndex: i }
    });
  }

  // Pair Last: Spread (Evaluation Rubrics & Result)
  // Left: Blank Page | Right: Rubrics & Result
  pairs.push({
    spreadType: 'eval_result',
    left: { type: 'blank', titleSuffix: '' },
    right: { type: 'eval_result', titleSuffix: '' }
  });

  return pairs;
};

// Legacy compatibility export
export const splitCodeAndOutput = (code = '', output = '', sampleTestCases = null, title = '') => {
  const pairs = paginateExperimentContent(code, output, sampleTestCases, title);
  return {
    pairs,
  };
};

// Calculate 100-mark rubric breakdown dynamically from faculty entries
export const getExperimentRubrics = (exp, defaultMax = 100) => {
  const maxMarks = Number(exp.max_marks) > 0 ? Number(exp.max_marks) : defaultMax;
  const totalScore = exp.marks !== undefined && exp.marks !== null ? Number(exp.marks) : maxMarks;

  // Check if faculty entered marks_breakdown object or string
  let breakdown = null;
  if (exp.marks_breakdown) {
    if (typeof exp.marks_breakdown === 'object') {
      breakdown = exp.marks_breakdown;
    } else {
      try {
        breakdown = JSON.parse(exp.marks_breakdown);
      } catch { }
    }
  }

  if (maxMarks === 100) {
    const aimMax = 25;
    const progMax = 45;
    const resultMax = 10;
    const vivaMax = 20;

    let aimAwarded = breakdown?.algorithm !== undefined ? Number(breakdown.algorithm) : (exp.algorithm_marks || 25);
    let progAwarded = breakdown?.program !== undefined ? Number(breakdown.program) : (exp.code_marks || 45);
    let resultAwarded = breakdown?.result !== undefined ? Number(breakdown.result) : (exp.result_marks || 10);
    let vivaAwarded = breakdown?.viva !== undefined ? Number(breakdown.viva) : (exp.viva_marks || 20);

    // If totalScore differs from sum, adjust proportionally
    const sum = aimAwarded + progAwarded + resultAwarded + vivaAwarded;
    if (sum !== totalScore && totalScore <= 100) {
      const ratio = totalScore / 100;
      aimAwarded = Math.round(aimMax * ratio);
      progAwarded = Math.round(progMax * ratio);
      resultAwarded = Math.round(resultMax * ratio);
      vivaAwarded = totalScore - (aimAwarded + progAwarded + resultAwarded);
      if (vivaAwarded < 0) vivaAwarded = 0;
    }

    return {
      maxMarks: 100,
      totalScore,
      items: [
        { label: 'Aim & Algorithm Formulation', max: aimMax, awarded: aimAwarded },
        { label: 'Program & Output Verification', max: progMax, awarded: progAwarded },
        { label: 'Result & Technical Discussion', max: resultMax, awarded: resultAwarded },
        { label: 'Viva-Voce Oral Assessment', max: vivaMax, awarded: vivaAwarded },
      ]
    };
  }

  // Proportional calculation for any custom maxMarks
  const aimMax = Math.round(maxMarks * 0.25);
  const progMax = Math.round(maxMarks * 0.45);
  const resultMax = Math.round(maxMarks * 0.10);
  const vivaMax = maxMarks - (aimMax + progMax + resultMax);

  const ratio = totalScore / maxMarks;
  const aimAwarded = Math.round(aimMax * ratio);
  const progAwarded = Math.round(progMax * ratio);
  const vivaAwarded = Math.round(vivaMax * ratio);
  const resultAwarded = totalScore - (aimAwarded + progAwarded + vivaAwarded);

  return {
    maxMarks,
    totalScore,
    items: [
      { label: 'Aim & Algorithm Formulation', max: aimMax, awarded: aimAwarded },
      { label: 'Program & Output Verification', max: progMax, awarded: progAwarded },
      { label: 'Result & Technical Discussion', max: resultMax, awarded: Math.max(0, resultAwarded) },
      { label: 'Viva-Voce Oral Assessment', max: vivaMax, awarded: vivaAwarded },
    ]
  };
};

// Split roll/register number into 12 discrete boxed cells
export const getRegisterCells = (regNo, totalCells = 12) => {
  const str = String(regNo || '').replace(/\s+/g, '').toUpperCase();
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    cells.push(str[i] || '');
  }
  return cells;
};

export default function LabRecordDocument({
  data = {},
  isDuplex = true,
  viewMode = 'all', // 'all', 'spread', 'flyleaf', 'cover', 'certificate', 'index', or `exp_${expNo}_left`, `exp_${expNo}_right`
  scale = 1,
  showSignatures = true,
  showRubrics = true,
  showOutputs = true
}) {
  const {
    institution_name = 'INSTITUTE OF TECHNOLOGY & HIGHER EDUCATION',
    institution_sub = 'An Autonomous Institution, Affiliated to University',
    logo = '/logo.png',
    department = 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING',
    degree = 'B.E. / B.Tech',
    semester = 'III SEMESTER',
    academic_year = '2026 - 2027 (ODD)',
    course_code = 'CS3351',
    course_title = 'DIGITAL PRINCIPLES AND SYSTEM DESIGN',
    student_name = 'STUDENT RECORD COPY',
    roll_no = '7376222CS101',
    register_no = '7376222CS101',
    branch_section = 'CSE - A',
    certificate_text,
    staff_incharge = 'Staff Incharge',
    head_of_department = 'Head of Department',
    experiments = []
  } = data;

  const regCells = getRegisterCells(register_no || roll_no, 12);
  const totalMarks = experiments.reduce((acc, exp) => acc + (Number(exp.marks) || 100), 0);
  const avgMarks = experiments.length ? (totalMarks / experiments.length).toFixed(1) : '100.0';

  const defaultCertText = certificate_text ||
    `Certified that this is the bonafide record of practical work done by Mr./Ms. ${student_name} (Register No: ${register_no || roll_no}) of ${semester}, ${department} in the ${course_code} – ${course_title} Laboratory during the academic year ${academic_year}.`;

  // Compute smart dynamic pagination across all experiments
  let runningPageCount = 6;
  const experimentPaginator = experiments.map((exp, index) => {
    const expNo = exp.experiment_no || index + 1;
    const pairs = paginateExperimentContent(exp.submitted_code, exp.execution_output, exp.sample_test_cases, exp.title);
    const pairCount = pairs.length;
    const startPage = runningPageCount + 1;
    const endPage = startPage + (pairCount * 2) - 1;
    runningPageCount = endPage;

    return {
      exp,
      expNo,
      pairs,
      pairCount,
      startPage,
      endPage,
    };
  });

  const totalDocPages = runningPageCount;

  return (
    <div className="lab-record-wrapper font-serif text-black selection:bg-neutral-200">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Ensure parent containers allow full multi-page document flow */
          #root, #root > *, main, .admin-layout, .app-layout, .space-y-4, .document-canvas, .lab-record-wrapper {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
            zoom: 1 !important;
          }

          .no-print {
            display: none !important;
          }

          .lab-record-wrapper {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .academic-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 14mm 16mm 16mm 16mm !important;
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            overflow: hidden !important;
          }

          .academic-page.page-odd {
            padding-left: 20mm !important;
            padding-right: 14mm !important;
          }

          .academic-page.page-even {
            padding-left: 14mm !important;
            padding-right: 20mm !important;
          }

          .academic-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .booklet-spread-container {
            display: block !important;
            width: 100% !important;
            gap: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .doc-footer {
            position: absolute !important;
            bottom: 11mm !important;
            padding-top: 6px !important;
            border-top: 1px dashed #777777 !important;
            display: flex !important;
            justify-content: space-between !important;
            font-size: 8.5pt !important;
            font-weight: bold !important;
            color: #444444 !important;
          }

          .academic-page.page-odd .doc-footer {
            left: 20mm !important;
            right: 14mm !important;
          }

          .academic-page.page-even .doc-footer {
            left: 14mm !important;
            right: 20mm !important;
          }

          table {
            page-break-inside: auto;
          }

          tr, .prevent-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          thead {
            display: table-header-group;
          }
        }

        /* Screen & Document Page Styling */
        .academic-page {
          background: #ffffff;
          color: #000000;
          font-family: "Times New Roman", Times, "Liberation Serif", serif;
          font-size: 10.5pt;
          line-height: 1.5;
          width: 210mm;
          min-height: 297mm;
          height: 297mm;
          max-height: 297mm;
          overflow: hidden;
          box-sizing: border-box;
          border: none;
          padding: 14mm 16mm 16mm 16mm;
          margin: 0 auto 28px auto;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06);
          position: relative;
          display: flex;
          flex-direction: column;
        }

        /* Duplex binding gutter margins */
        .academic-page.page-odd {
          padding-left: ${isDuplex ? '20mm' : '16mm'};
          padding-right: 14mm;
        }

        .academic-page.page-even {
          padding-left: 14mm;
          padding-right: ${isDuplex ? '20mm' : '16mm'};
        }

        .doc-footer {
          position: absolute;
          bottom: 11mm;
          left: 16mm;
          right: 16mm;
          padding-top: 6px;
          border-top: 1px dashed #777777;
          display: flex;
          justify-content: space-between;
          font-size: 8.5pt;
          font-weight: bold;
          color: #444444;
        }

        .academic-page.page-odd .doc-footer {
          left: ${isDuplex ? '20mm' : '16mm'};
          right: 14mm;
        }

        .academic-page.page-even .doc-footer {
          left: 14mm;
          right: ${isDuplex ? '20mm' : '16mm'};
        }

        .top-row-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 22px;
        }

        .top-row-table td {
          border: none;
          padding: 0;
          vertical-align: middle;
          font-weight: bold;
          font-size: 10pt;
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
        }

        .section-bar-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 14px;
          margin-bottom: 4px;
        }

        .section-bar-table td {
          border: none;
          text-align: left;
          padding: 4px 0;
          font-size: 11pt;
          font-weight: bold;
          text-transform: uppercase;
          background: transparent;
          letter-spacing: 0.5px;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .grid-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: -1px;
          margin-bottom: 14px;
        }

        .grid-table th,
        .grid-table td {
          border: 1px solid #000000;
          padding: 7px 10px;
          vertical-align: middle;
          font-size: 10pt;
        }

        .grid-table th {
          text-align: center;
          font-weight: bold;
          background: #fafafa;
        }

        .content-box {
          border: none;
          padding: 4px 0 10px 0;
          font-size: 10.5pt;
          line-height: 1.6;
          margin-bottom: 12px;
          text-align: justify;
          background: transparent;
        }

        .code-container {
          border: none;
          background: transparent;
          padding: 4px 0;
          font-family: Consolas, Monaco, "SF Pro Mono", "Segoe UI Mono", "Roboto Mono", "Ubuntu Mono", monospace, sans-serif;
          font-size: 9.5pt;
          line-height: 1.45;
          letter-spacing: 0.1px;
          white-space: pre-wrap;
          word-break: break-word;
          margin-top: 2px;
          margin-bottom: 12px;
          color: #111827;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }

        .output-container {
          border: none;
          background: transparent;
          padding: 4px 0;
          font-family: Consolas, Monaco, "SF Pro Mono", "Segoe UI Mono", "Roboto Mono", "Ubuntu Mono", monospace, sans-serif;
          font-size: 9.5pt;
          line-height: 1.45;
          letter-spacing: 0.1px;
          white-space: pre-wrap;
          word-break: break-word;
          margin-top: 2px;
          margin-bottom: 12px;
          color: #111827;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }

        .doc-footer {
          position: absolute;
          bottom: 10mm;
          left: 14mm;
          right: 14mm;
          padding-top: 6px;
          border-top: 1px dashed #777777;
          display: flex;
          justify-content: space-between;
          font-size: 8.5pt;
          font-weight: bold;
          color: #444444;
        }

        .academic-page.page-odd .doc-footer {
          left: ${isDuplex ? '18mm' : '14mm'};
          right: 12mm;
        }

        .academic-page.page-even .doc-footer {
          left: 12mm;
          right: ${isDuplex ? '18mm' : '14mm'};
        }

        .booklet-spread-container {
          display: flex;
          flex-direction: row;
          justify-content: center;
          gap: 20px;
          width: 100%;
        }
      `}</style>

      <div
        className="document-canvas flex flex-col items-center transition-all duration-200"
        style={{ zoom: scale, transformOrigin: 'top center' }}
      >
        {/* =========================================================
            FRONT MATTER PAIR 1: Page 1 (Flyleaf - Left) + Page 2 (Cover - Right)
            ========================================================= */}
        <div className={isDuplex ? "booklet-spread-container" : "flex flex-col items-center w-full"}>
          {/* PAGE 1: EMPTY / BLANK FRONT FLYLEAF PAGE (LEFT SIDE) */}
          {(viewMode === 'all' || viewMode === 'spread' || viewMode === 'flyleaf') && (
            <div className="academic-page page-even flex flex-col justify-between">
              <PageBorderFrame isOdd={false} isDuplex={isDuplex} />
              <div className="text-right text-[8pt] text-neutral-300 select-none">
                [Front Flyleaf Page]
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 mb-4 opacity-15">
                  <img
                    src={logo || '/logo.png'}
                    alt="Institute Crest"
                    className="w-full h-full object-contain filter grayscale"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <p className="text-xs uppercase tracking-widest text-neutral-300 font-serif">
                  Laboratory Record Notebook
                </p>
              </div>

              <div className="doc-footer">
                <span className="text-neutral-400 font-normal italic">Blank Flyleaf</span>
                <span>Page 1 of {totalDocPages}</span>
              </div>
            </div>
          )}

          {/* PAGE 2: TITLE & OFFICIAL COVER PAGE (RIGHT SIDE) */}
          {(viewMode === 'all' || viewMode === 'spread' || viewMode === 'cover') && (
            <div className="academic-page page-odd">
              <PageBorderFrame isOdd={true} isDuplex={isDuplex} />
              {/* Top Row: Course Code & Register Boxes */}
              <table className="top-row-table">
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left', width: '45%' }}>
                      COURSE CODE: <span>{course_code}</span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                      REGISTER NO.:
                    </td>
                    <td style={{ width: '195px' }}>
                      <table className="register-boxes">
                        <tbody>
                          <tr>
                            {regCells.map((char, idx) => (
                              <td key={idx}>{char}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Institutional Header Table */}
              <table className="header-table">
                <tbody>
                  <tr>
                    <td rowSpan={2} style={{ width: '18%', padding: '8px', textAlign: 'center' }}>
                      <img
                        src={logo || '/logo.png'}
                        alt="Institute Logo"
                        style={{
                          maxHeight: '75px',
                          maxWidth: '90px',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </td>
                    <td style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 10px' }}>
                      {institution_name}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: '9pt', fontStyle: 'italic', padding: '4px 10px' }}>
                      {institution_sub}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', background: '#f4f4f5', padding: '8px 10px' }}>
                      LABORATORY RECORD NOTEBOOK
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 'bold', fontSize: '10pt', padding: '6px 10px' }}>
                      ACADEMIC YEAR: {academic_year} &nbsp;&nbsp;|&nbsp;&nbsp; {semester}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 'bold', fontSize: '10pt', textTransform: 'uppercase', padding: '6px 10px' }}>
                      {department}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ fontSize: '11pt', fontWeight: 'bold', background: '#f9f9fa', padding: '8px 10px' }}>
                      {course_code} – {course_title}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Candidate Metadata Box */}
              <table className="section-bar-table">
                <tbody>
                  <tr>
                    <td>STUDENT RECORD DETAILS</td>
                  </tr>
                </tbody>
              </table>

              <table className="grid-table">
                <tbody>
                  <tr>
                    <td style={{ width: '24%', fontWeight: 'bold', background: '#fafafa' }}>Student Name</td>
                    <td style={{ width: '26%', fontWeight: 'bold' }}>{student_name}</td>
                    <td style={{ width: '24%', fontWeight: 'bold', background: '#fafafa' }}>Register Number</td>
                    <td style={{ width: '26%', fontFamily: 'Courier New', fontWeight: 'bold' }}>{register_no || roll_no}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', background: '#fafafa' }}>Degree & Branch</td>
                    <td>{degree} – {department}</td>
                    <td style={{ fontWeight: 'bold', background: '#fafafa' }}>Section</td>
                    <td>{branch_section || 'Section A'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', background: '#fafafa' }}>Course Title</td>
                    <td colSpan={3} style={{ fontWeight: 'bold' }}>{course_code} — {course_title}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', background: '#fafafa' }}>Total Experiments</td>
                    <td>{experiments.length} Experiments</td>
                    <td style={{ fontWeight: 'bold', background: '#fafafa' }}>Average Score</td>
                    <td style={{ fontWeight: 'bold' }}>{avgMarks} / 100 Marks</td>
                  </tr>
                </tbody>
              </table>

              {/* General Instructions */}
              <table className="section-bar-table" style={{ marginTop: '20px' }}>
                <tbody>
                  <tr>
                    <td>LABORATORY INSTRUCTIONS & CODE OF CONDUCT</td>
                  </tr>
                </tbody>
              </table>

              <div className="content-box" style={{ lineHeight: '1.7', padding: '14px 18px' }}>
                <ol style={{ margin: 0, paddingLeft: '22px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    Students must maintain neatness, discipline, and regularity in all laboratory sessions.
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    The aim, step-by-step algorithm, and program must be prepared before beginning practical execution.
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    All program outputs must be verified with appropriate test cases and recorded accurately.
                  </li>
                  <li>
                    The completed laboratory record must be submitted to the faculty in-charge on time for regular evaluation.
                  </li>
                </ol>
              </div>

              {/* Footer */}
              <div className="doc-footer">
                <span>{course_code} — Title & Cover Sheet</span>
                <span>Page 2 of {totalDocPages}</span>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            FRONT MATTER PAIR 2: Page 3 (Blank - Left) + Page 4 (Bonafide Certificate - Right)
            ========================================================= */}
        <div className={isDuplex ? "booklet-spread-container" : "flex flex-col items-center w-full"}>
          {/* PAGE 3: BLANK LEFT PAGE */}
          {(viewMode === 'all' || viewMode === 'spread' || viewMode === 'cert_blank') && (
            <div className="academic-page page-even flex flex-col justify-between">
              <PageBorderFrame isOdd={false} isDuplex={isDuplex} />
              <div className="flex-1" />

              <div className="doc-footer">
                <span className="text-neutral-400 font-normal italic">Blank Page</span>
                <span>Page 3 of {totalDocPages}</span>
              </div>
            </div>
          )}

          {/* PAGE 4: BONAFIDE CERTIFICATE (RIGHT SIDE) */}
          {(viewMode === 'all' || viewMode === 'spread' || viewMode === 'certificate') && (
            <div className="academic-page page-odd">
              <PageBorderFrame isOdd={true} isDuplex={isDuplex} />
              {/* Top Row */}
              <table className="top-row-table">
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left' }}>COURSE CODE: <span>{course_code}</span></td>
                    <td style={{ textAlign: 'right', paddingRight: '8px' }}>REGISTER NO.:</td>
                    <td style={{ width: '195px' }}>
                      <table className="register-boxes">
                        <tbody>
                          <tr>
                            {regCells.map((char, idx) => (
                              <td key={idx}>{char}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Institutional Header */}
              <table className="header-table">
                <tbody>
                  <tr>
                    <td rowSpan={3} style={{ width: '18%', padding: '8px', textAlign: 'center' }}>
                      <img
                        src={logo || '/logo.png'}
                        alt="Institute Logo"
                        style={{
                          maxHeight: '70px',
                          maxWidth: '85px',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </td>
                    <td style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', padding: '8px 10px' }}>
                      {institution_name}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: '9pt', fontStyle: 'italic', padding: '3px 10px' }}>
                      {institution_sub}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', fontSize: '10pt', textTransform: 'uppercase', padding: '6px 10px' }}>
                      {department}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Certificate Header Box */}
              <table className="section-bar-table" style={{ marginTop: '32px' }}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: '13pt', padding: '8px', letterSpacing: '1px' }}>
                      BONAFIDE CERTIFICATE
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Certificate Body Statement */}
              <div style={{
                border: '1px solid #000000',
                borderTop: 'none',
                padding: '36px 28px',
                fontSize: '11pt',
                lineHeight: '2.0',
                textAlign: 'justify',
                minHeight: '200px'
              }}>
                <p style={{ textIndent: '40px', margin: 0 }}>
                  {defaultCertText}
                </p>
              </div>

              {/* Signatures Table */}
              {showSignatures && (
                <table className="grid-table" style={{ marginTop: '50px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50%', padding: '10px', fontSize: '10pt' }}>STAFF IN-CHARGE</th>
                      <th style={{ width: '50%', padding: '10px', fontSize: '10pt' }}>HEAD OF THE DEPARTMENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ height: '90px', verticalAlign: 'bottom', textAlign: 'center', paddingBottom: '10px' }}>
                        <div className="font-bold">{staff_incharge}</div>
                        <div style={{ fontSize: '8.5pt', color: '#666' }}>Signature & Date</div>
                      </td>
                      <td style={{ height: '90px', verticalAlign: 'bottom', textAlign: 'center', paddingBottom: '10px' }}>
                        <div className="font-bold">{head_of_department}</div>
                        <div style={{ fontSize: '8.5pt', color: '#666' }}>Signature with Seal</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* University Practical Examination Sign-off */}
              {showSignatures && (
                <table className="grid-table" style={{ marginTop: '30px' }}>
                  <thead>
                    <tr>
                      <th colSpan={2} style={{ padding: '8px', fontSize: '10pt' }}>
                        SUBMITTED FOR THE PRACTICAL EXAMINATION HELD ON: ____________________
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', height: '85px', verticalAlign: 'bottom', textAlign: 'center', paddingBottom: '10px' }}>
                        <div className="font-bold">INTERNAL EXAMINER</div>
                        <div style={{ fontSize: '8.5pt', color: '#666' }}>Signature & Date</div>
                      </td>
                      <td style={{ width: '50%', height: '85px', verticalAlign: 'bottom', textAlign: 'center', paddingBottom: '10px' }}>
                        <div className="font-bold">EXTERNAL EXAMINER</div>
                        <div style={{ fontSize: '8.5pt', color: '#666' }}>Signature & Date</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Footer */}
              <div className="doc-footer">
                <span>{course_code} — Bonafide Certificate</span>
                <span>Page 4 of {totalDocPages}</span>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            FRONT MATTER PAIR 3: Page 5 (Blank - Left) + Page 6 (Index & Criteria - Right)
            ========================================================= */}
        <div className={isDuplex ? "booklet-spread-container" : "flex flex-col items-center w-full"}>
          {/* PAGE 5: BLANK LEFT PAGE */}
          {(viewMode === 'all' || viewMode === 'spread' || viewMode === 'index_blank') && (
            <div className="academic-page page-even flex flex-col justify-between">
              <PageBorderFrame isOdd={false} isDuplex={isDuplex} />
              <div className="flex-1" />

              <div className="doc-footer">
                <span className="text-neutral-400 font-normal italic">Blank Page</span>
                <span>Page 5 of {totalDocPages}</span>
              </div>
            </div>
          )}

          {/* PAGE 6: INDEX OF LABORATORY EXPERIMENTS & EVALUATION CRITERIA (RIGHT SIDE) */}
          {(viewMode === 'all' || viewMode === 'spread' || viewMode === 'index') && (
            <div className="academic-page page-odd">
              <PageBorderFrame isOdd={true} isDuplex={isDuplex} />
              {/* Top Row */}
              <table className="top-row-table">
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left' }}>COURSE CODE: <span>{course_code}</span></td>
                    <td style={{ textAlign: 'right', paddingRight: '8px' }}>REGISTER NO.:</td>
                    <td style={{ width: '195px' }}>
                      <table className="register-boxes">
                        <tbody>
                          <tr>
                            {regCells.map((char, idx) => (
                              <td key={idx}>{char}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Title Header */}
              <table className="section-bar-table">
                <tbody>
                  <tr>
                    <td style={{ fontSize: '12pt', padding: '8px' }}>
                      INDEX OF LABORATORY EXPERIMENTS
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Index Grid Table */}
              <table className="grid-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px', padding: '8px 6px' }}>Ex. No</th>
                    <th style={{ width: '85px', padding: '8px 6px' }}>Date</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Name of the Experiment</th>
                    <th style={{ width: '70px', padding: '8px 6px' }}>Page No.</th>
                    <th style={{ width: '90px', padding: '8px 6px' }}>Marks (100)</th>
                    <th style={{ width: '95px', padding: '8px 6px' }}>Staff Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {experiments.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                        No laboratory experiments scheduled for this course.
                      </td>
                    </tr>
                  ) : (
                    experimentPaginator.map((item, idx) => {
                      const { exp, expNo, startPage, endPage } = item;
                      const rubricsData = getExperimentRubrics(exp, 100);
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px 6px' }}>{expNo}</td>
                          <td style={{ textAlign: 'center', fontSize: '9.5pt', padding: '8px 6px' }}>{exp.date || '05-10-2026'}</td>
                          <td style={{ fontWeight: '500', padding: '8px 10px' }}>{exp.title}</td>
                          <td style={{ textAlign: 'center', padding: '8px 6px' }}>{startPage} – {endPage}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px 6px' }}>
                            {rubricsData.totalScore} / 100
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '8.5pt', padding: '8px 6px' }}>
                            Verified
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {/* Total Summary Row */}
                  {experiments.length > 0 && (
                    <tr style={{ background: '#fafafa', fontWeight: 'bold' }}>
                      <td colSpan={4} style={{ textAlign: 'right', padding: '10px 14px' }}>
                        CUMULATIVE AVERAGE SCORE:
                      </td>
                      <td colSpan={2} style={{ textAlign: 'center', padding: '10px 8px' }}>
                        {avgMarks} / 100 Marks
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Evaluation Criteria */}
              <table className="section-bar-table" style={{ marginTop: '24px' }}>
                <tbody>
                  <tr>
                    <td>CONTINUOUS PRACTICAL EVALUATION CRITERIA & WEIGHTAGE</td>
                  </tr>
                </tbody>
              </table>

              <table className="grid-table">
                <thead>
                  <tr>
                    <th style={{ width: '12%', padding: '8px' }}>S.No</th>
                    <th style={{ width: '58%', padding: '8px', textAlign: 'left' }}>Assessment Criteria / Component</th>
                    <th style={{ width: '30%', padding: '8px' }}>Marks Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>1</td>
                    <td style={{ padding: '8px 10px' }}>Aim, Logic Formulation & Algorithm / Procedure</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>10 Marks</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>2</td>
                    <td style={{ padding: '8px 10px' }}>Program Implementation & Correct Syntax</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>40 Marks</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>3</td>
                    <td style={{ padding: '8px 10px' }}>Execution, Verification & Console Output</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>20 Marks</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>4</td>
                    <td style={{ padding: '8px 10px' }}>Oral Viva-Voce Assessment</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>20 Marks</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>5</td>
                    <td style={{ padding: '8px 10px' }}>Result, Discussion & Record Regularity</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>10 Marks</td>
                  </tr>
                  <tr style={{ background: '#fafafa', fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ textAlign: 'right', padding: '8px 14px' }}>TOTAL SCORE PER EXPERIMENT:</td>
                    <td style={{ textAlign: 'center' }}>100 Marks</td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div className="doc-footer">
                <span>{course_code} — Index Sheet</span>
                <span>Page 6 of {totalDocPages}</span>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            EXPERIMENTS: DYNAMIC MULTI-PAIR RECORD NOTEBOOK STRUCTURE
            - Pair 1 (Left/Even): Program Source Code (Part 1)
            - Pair 1 (Right/Odd): Aim & Algorithm / Procedure
            - Intermediate Pairs (if needed): Continued Code/Output (Left) & Notes/Diagrams (Right)
            - Final Pair (Left/Even): Final Program / Console Output
            - Spread 1 (Pair 1): Blank Page (Left) & Aim + Algorithm / Procedure (Right)
            - Spread 2..N: Program Execution Output (Left) & Program Source Code (Right)
            - Final Spread: Blank Page (Left) & Evaluation Rubrics + Result with Staff Sign (Right)
            All pages are strictly constrained to A4 sheet dimensions.
            ========================================================= */}
        {experimentPaginator.map((item, index) => {
          const { exp, expNo, pairs, startPage } = item;
          const procedureSteps = parseProcedureSteps(exp.procedure);
          const rubricsData = getExperimentRubrics(exp, 100);

          return (
            <React.Fragment key={index}>
              {pairs.map((pair, pairIdx) => {
                const { spreadType, left, right } = pair;
                const leftPageNum = startPage + (pairIdx * 2);
                const rightPageNum = leftPageNum + 1;

                const showLeft =
                  viewMode === 'all' ||
                  viewMode === 'spread' ||
                  viewMode === expNo ||
                  viewMode === exp.id ||
                  viewMode === `exp_${expNo}_left` ||
                  viewMode === `exp_${expNo}_p${leftPageNum}` ||
                  (spreadType === 'aim_algo' && viewMode === `exp_${expNo}_aim_left`) ||
                  (spreadType === 'code_output' && (viewMode === `exp_${expNo}_out_left` || viewMode === `exp_${expNo}_output`)) ||
                  (spreadType === 'eval_result' && viewMode === `exp_${expNo}_eval_left`);

                const showRight =
                  viewMode === 'all' ||
                  viewMode === 'spread' ||
                  viewMode === expNo ||
                  viewMode === exp.id ||
                  viewMode === `exp_${expNo}_right` ||
                  viewMode === `exp_${expNo}_p${rightPageNum}` ||
                  (spreadType === 'aim_algo' && (viewMode === `exp_${expNo}_aim_right` || viewMode === `exp_${expNo}_aim`)) ||
                  (spreadType === 'code_output' && (viewMode === `exp_${expNo}_code_right` || viewMode === `exp_${expNo}_code`)) ||
                  (spreadType === 'eval_result' && (viewMode === `exp_${expNo}_eval_right` || viewMode === `exp_${expNo}_eval`));

                return (
                  <div key={pairIdx} className={isDuplex ? "booklet-spread-container" : "flex flex-col items-center w-full"}>
                    {/* -------------------------------------------------------------
                        LEFT-HAND PAGE (EVEN): ONLY PROGRAM OUTPUT OR BLANK PAGE
                        ------------------------------------------------------------- */}
                    {showLeft && (
                      <div className="academic-page page-even flex flex-col justify-between">
                        <PageBorderFrame isOdd={false} isDuplex={isDuplex} />
                        <div>
                          {/* Top Row: Left Page Header */}
                          <table className="top-row-table">
                            <tbody>
                              <tr>
                                <td style={{ textAlign: 'left' }}>
                                  EXP NO: <span className="font-bold">{expNo}</span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '8px' }}>REGISTER NO.:</td>
                                <td style={{ width: '195px' }}>
                                  <table className="register-boxes">
                                    <tbody>
                                      <tr>
                                        {regCells.map((char, idx) => (
                                          <td key={idx}>{char}</td>
                                        ))}
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {left.type === 'output' ? (
                            <>
                              {left.chunkIndex === 0 && (
                                <div style={{ fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '0', marginBottom: '6px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                                  SAMPLE INPUT & OUTPUT
                                </div>
                              )}
                              <div className="output-container" style={{ marginTop: '0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '9.5pt', lineHeight: '1.44' }}>
                                {renderFormattedOutput(left.output)}
                              </div>
                            </>
                          ) : (
                            /* Empty Blank Page on Left Side */
                            <div style={{ minHeight: '520px' }} />
                          )}
                        </div>

                        {/* Footer */}
                        <div className="doc-footer">
                          <span>{course_code} — Experiment {expNo} ({left.type === 'output' ? 'Program Output' : 'Blank Page'})</span>
                          <span>Page {leftPageNum} of {totalDocPages}</span>
                        </div>
                      </div>
                    )}

                    {/* -------------------------------------------------------------
                        RIGHT-HAND PAGE (ODD):
                        - Aim & Algorithm Spread: AIM & ALGORITHM
                        - Program Spread: PROGRAM SOURCE CODE
                        - Evaluation Spread: EVALUATION RUBRIC MATRIX & RESULT
                        ------------------------------------------------------------- */}
                    {showRight && (
                      <div className="academic-page page-odd flex flex-col justify-between">
                        <PageBorderFrame isOdd={true} isDuplex={isDuplex} />
                        {spreadType === 'aim_algo' ? (
                          <div>
                            {/* Top Row: Right Page Header */}
                            <table className="top-row-table">
                              <tbody>
                                <tr>
                                  <td style={{ textAlign: 'left' }}>
                                    EXP NO: <span className="font-bold">{expNo}</span> &nbsp;&nbsp;|&nbsp;&nbsp; DATE: <span className="font-bold">{exp.date || '05-10-2026'}</span>
                                  </td>
                                  <td style={{ textAlign: 'right', paddingRight: '8px' }}>REGISTER NO.:</td>
                                  <td style={{ width: '195px' }}>
                                    <table className="register-boxes">
                                      <tbody>
                                        <tr>
                                          {regCells.map((char, idx) => (
                                            <td key={idx}>{char}</td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Main Experiment Title Bar - ONLY SHOWN ONCE HERE */}
                            <div style={{ marginTop: '12px', marginBottom: '10px', textAlign: 'center', fontSize: '12pt', fontWeight: 'bold', letterSpacing: '0.8px', lineHeight: '1.4' }}>
                              EXPERIMENT {expNo} : {exp.title ? exp.title.toUpperCase() : `LAB EXPERIMENT ${expNo}`}
                            </div>

                            {/* AIM */}
                            <div style={{ fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '14px', marginBottom: '4px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                              AIM
                            </div>
                            <div className="content-box" style={{ marginBottom: '14px', lineHeight: '1.7', fontSize: '10.5pt' }}>
                              {exp.aim || `To write, execute and verify the program for "${exp.title}".`}
                            </div>

                            {/* ALGORITHM / PROCEDURE */}
                            <div style={{ fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '14px', marginBottom: '4px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                              ALGORITHM / PROCEDURE
                            </div>
                            <div className="content-box" style={{ minHeight: '140px', marginBottom: '14px' }}>
                              {procedureSteps.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {procedureSteps.map((step, sIdx) => (
                                    <div
                                      key={sIdx}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: '8px',
                                        lineHeight: '1.75',
                                        fontSize: '10.5pt',
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontWeight: 'bold',
                                          color: '#000000',
                                          whiteSpace: 'nowrap',
                                          minWidth: '58px',
                                        }}
                                      >
                                        Step {sIdx + 1}:
                                      </span>
                                      <span style={{ flex: 1, textAlign: 'justify', color: '#000000' }}>
                                        {step}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', lineHeight: '1.75', fontSize: '10.5pt' }}>
                                    <span style={{ fontWeight: 'bold', color: '#000000', whiteSpace: 'nowrap', minWidth: '58px' }}>Step 1:</span>
                                    <span style={{ flex: 1, textAlign: 'justify', color: '#000000' }}>Start the program execution.</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', lineHeight: '1.75', fontSize: '10.5pt' }}>
                                    <span style={{ fontWeight: 'bold', color: '#000000', whiteSpace: 'nowrap', minWidth: '58px' }}>Step 2:</span>
                                    <span style={{ flex: 1, textAlign: 'justify', color: '#000000' }}>Read the required input parameters and initialize the appropriate data structures.</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', lineHeight: '1.75', fontSize: '10.5pt' }}>
                                    <span style={{ fontWeight: 'bold', color: '#000000', whiteSpace: 'nowrap', minWidth: '58px' }}>Step 3:</span>
                                    <span style={{ flex: 1, textAlign: 'justify', color: '#000000' }}>Implement the core algorithmic logic and computational operations for {exp.title}.</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', lineHeight: '1.75', fontSize: '10.5pt' }}>
                                    <span style={{ fontWeight: 'bold', color: '#000000', whiteSpace: 'nowrap', minWidth: '58px' }}>Step 4:</span>
                                    <span style={{ flex: 1, textAlign: 'justify', color: '#000000' }}>Compute, format and display the verified output results.</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', lineHeight: '1.75', fontSize: '10.5pt' }}>
                                    <span style={{ fontWeight: 'bold', color: '#000000', whiteSpace: 'nowrap', minWidth: '58px' }}>Step 5:</span>
                                    <span style={{ flex: 1, textAlign: 'justify', color: '#000000' }}>Stop the program execution and verify test case assertions.</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : spreadType === 'code_output' ? (
                          /* Program Source Code (Right Side) */
                          <div>
                            {/* Top Row: Right Page Header */}
                            <table className="top-row-table">
                              <tbody>
                                <tr>
                                  <td style={{ textAlign: 'left' }}>
                                    EXP NO: <span className="font-bold">{expNo}</span> &nbsp;&nbsp;|&nbsp;&nbsp; DATE: <span className="font-bold">{exp.date || '05-10-2026'}</span>
                                  </td>
                                  <td style={{ textAlign: 'right', paddingRight: '8px' }}>REGISTER NO.:</td>
                                  <td style={{ width: '195px' }}>
                                    <table className="register-boxes">
                                      <tbody>
                                        <tr>
                                          {regCells.map((char, idx) => (
                                            <td key={idx}>{char}</td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            {right.chunkIndex === 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.5px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                                  PROGRAM SOURCE CODE
                                </span>
                                <span style={{ fontSize: '9pt', fontFamily: 'inherit', textTransform: 'none', fontWeight: 'normal', color: '#444' }}>
                                  Language: {exp.language || 'Python'}
                                </span>
                              </div>
                            )}
                            <pre className="code-container" style={{ margin: 0, marginTop: '0' }}>
                              {right.code || `# Program for Experiment ${expNo}: ${exp.title}\ndef main():\n    print("Program executed successfully")\n\nif __name__ == '__main__':\n    main()`}
                            </pre>
                          </div>
                        ) : spreadType === 'eval_result' ? (
                          /* Evaluation Rubrics & Result (Right Side) */
                          <>
                            <div>
                              {/* Top Row Header */}
                              <table className="top-row-table">
                                <tbody>
                                  <tr>
                                    <td style={{ textAlign: 'left' }}>
                                      EXP NO: <span className="font-bold">{expNo}</span> &nbsp;&nbsp;|&nbsp;&nbsp; DATE: <span className="font-bold">{exp.date || '05-10-2026'}</span>
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: '8px' }}>REGISTER NO.:</td>
                                    <td style={{ width: '195px' }}>
                                      <table className="register-boxes">
                                        <tbody>
                                          <tr>
                                            {regCells.map((char, idx) => (
                                              <td key={idx}>{char}</td>
                                            ))}
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Spacer to push rubrics towards centre */}
                            <div className="flex-1" />

                            {/* CENTRE: EVALUATION RUBRIC & MARKS BREAKDOWN */}
                            {showRubrics && (
                              <div className="prevent-break">
                                <table className="section-bar-table" style={{ marginTop: '10px' }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ fontSize: '10pt', padding: '5px 10px' }}>
                                        EVALUATION RUBRIC & MARKS MATRIX
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <table className="grid-table" style={{ marginBottom: '10px' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ width: '60%', padding: '6px 10px', textAlign: 'left' }}>Assessment Criteria</th>
                                      <th style={{ width: '20%', padding: '6px' }}>Max Marks</th>
                                      <th style={{ width: '20%', padding: '6px' }}>Marks Awarded</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rubricsData.items.map((rubItem, rIdx) => (
                                      <tr key={rIdx}>
                                        <td style={{ padding: '6px 10px' }}>{rubItem.label}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{rubItem.max}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{rubItem.awarded}</td>
                                      </tr>
                                    ))}
                                    <tr style={{ background: '#f4f4f5', fontWeight: 'bold' }}>
                                      <td style={{ textAlign: 'right', padding: '7px 10px' }}>TOTAL SCORE:</td>
                                      <td style={{ textAlign: 'center' }}>{rubricsData.maxMarks}</td>
                                      <td style={{ textAlign: 'center', fontSize: '11pt' }}>
                                        {rubricsData.totalScore} / {rubricsData.maxMarks}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Spacer to push result to bottom */}
                            <div className="flex-1" />

                            {/* BOTTOM: RESULT & STAFF SIGNATURE */}
                            <div className="prevent-break" style={{ marginBottom: '12mm' }}>
                              {/* RESULT */}
                              <div style={{ fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '14px', marginBottom: '4px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                                RESULT
                              </div>
                              <div className="content-box" style={{ marginBottom: '12px' }}>
                                {exp.result_text || `Thus the program for "${exp.title}" was successfully written, executed, and the output was verified.`}
                              </div>

                              {/* Staff Sign-off Table */}
                              {showSignatures && (
                                <table className="grid-table" style={{ marginTop: '8px', marginBottom: '0' }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ width: '50%', fontSize: '9pt', padding: '10px' }}>
                                        Evaluated by: <strong>{staff_incharge}</strong>
                                      </td>
                                      <td style={{ width: '50%', textAlign: 'right', fontSize: '9pt', padding: '10px', fontWeight: 'bold' }}>
                                        Staff Signature: ____________________
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </>
                        ) : (
                          /* Intermediate Blank Page */
                          <div>
                            <table className="top-row-table">
                              <tbody>
                                <tr>
                                  <td style={{ textAlign: 'left' }}>
                                    EXP NO: <span className="font-bold">{expNo}</span>
                                  </td>
                                  <td style={{ textAlign: 'right', paddingRight: '8px' }}>REGISTER NO.:</td>
                                  <td style={{ width: '195px' }}>
                                    <table className="register-boxes">
                                      <tbody>
                                        <tr>
                                          {regCells.map((char, idx) => (
                                            <td key={idx}>{char}</td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <div style={{ minHeight: '620px' }} />
                          </div>
                        )}

                        {/* Footer */}
                        <div className="doc-footer">
                          <span>{course_code} — Experiment {expNo} ({spreadType === 'aim_algo' ? 'Aim & Algorithm' : spreadType === 'code_output' ? 'Program Source Code' : spreadType === 'eval_result' ? 'Evaluation & Result' : 'Continuation'})</span>
                          <span>Page {rightPageNum} of {totalDocPages}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
