import React from 'react';

// Helper to format procedure/algorithm steps cleanly
export const parseProcedureSteps = (procedure) => {
  if (!procedure) return [];
  if (Array.isArray(procedure)) return procedure;
  
  const trimmed = String(procedure).trim();
  if (!trimmed) return [];

  // If JSON array string
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      // fallback to newline split
    }
  }

  // Split by newlines or numbered lines
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines;
};

// Clean execution output of artificial test assertion jargon
export const cleanExecutionOutput = (output, title) => {
  if (!output || typeof output !== 'string') {
    return `Enter input parameters:\n>> Input processed successfully.\n\nOutput:\n>> Result computed for ${title || 'experiment'}.\n>> Execution completed.`;
  }

  let cleaned = output
    .replace(/\[EXECUTION STATUS:.*?\]/gi, '')
    .replace(/>>\s*Assertion Check\s*\d+:\s*PASSED/gi, '')
    .replace(/All assertions passed successfully for.*?\./gi, '')
    .replace(/All test cases passed\./gi, '')
    .trim();

  if (!cleaned) {
    return `Input:\n>> Processed inputs for ${title || 'experiment'}.\n\nOutput:\n>> Execution completed successfully.`;
  }

  return cleaned;
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
      } catch {}
    }
  }

  if (maxMarks === 100) {
    const aimMax = 10;
    const codeMax = 40;
    const outputMax = 20;
    const vivaMax = 20;
    const resultMax = 10;

    let aimAwarded = breakdown?.algorithm !== undefined ? Number(breakdown.algorithm) : (exp.algorithm_marks || 10);
    let codeAwarded = breakdown?.program !== undefined ? Number(breakdown.program) : (exp.code_marks || 40);
    let outputAwarded = breakdown?.output !== undefined ? Number(breakdown.output) : (exp.output_marks || 20);
    let vivaAwarded = breakdown?.viva !== undefined ? Number(breakdown.viva) : (exp.viva_marks || 20);
    let resultAwarded = breakdown?.result !== undefined ? Number(breakdown.result) : (exp.result_marks || 10);

    // If totalScore differs from sum, adjust proportionally
    const sum = aimAwarded + codeAwarded + outputAwarded + vivaAwarded + resultAwarded;
    if (sum !== totalScore && totalScore <= 100) {
      const ratio = totalScore / 100;
      aimAwarded = Math.round(aimMax * ratio);
      codeAwarded = Math.round(codeMax * ratio);
      outputAwarded = Math.round(outputMax * ratio);
      vivaAwarded = Math.round(vivaMax * ratio);
      resultAwarded = totalScore - (aimAwarded + codeAwarded + outputAwarded + vivaAwarded);
      if (resultAwarded < 0) resultAwarded = 0;
    }

    return {
      maxMarks: 100,
      totalScore,
      items: [
        { label: 'Aim, Logic Formulation & Algorithm', max: aimMax, awarded: aimAwarded },
        { label: 'Program Implementation & Syntax', max: codeMax, awarded: codeAwarded },
        { label: 'Execution & Output Verification', max: outputMax, awarded: outputAwarded },
        { label: 'Viva-Voce Assessment', max: vivaMax, awarded: vivaAwarded },
        { label: 'Result, Discussion & Record Regularity', max: resultMax, awarded: resultAwarded },
      ]
    };
  }

  // Proportional calculation for any custom maxMarks
  const aimMax = Math.round(maxMarks * 0.1);
  const codeMax = Math.round(maxMarks * 0.4);
  const outputMax = Math.round(maxMarks * 0.2);
  const vivaMax = Math.round(maxMarks * 0.2);
  const resultMax = maxMarks - (aimMax + codeMax + outputMax + vivaMax);

  const ratio = totalScore / maxMarks;
  const aimAwarded = Math.round(aimMax * ratio);
  const codeAwarded = Math.round(codeMax * ratio);
  const outputAwarded = Math.round(outputMax * ratio);
  const vivaAwarded = Math.round(vivaMax * ratio);
  const resultAwarded = totalScore - (aimAwarded + codeAwarded + outputAwarded + vivaAwarded);

  return {
    maxMarks,
    totalScore,
    items: [
      { label: 'Aim, Logic Formulation & Algorithm', max: aimMax, awarded: aimAwarded },
      { label: 'Program Implementation & Syntax', max: codeMax, awarded: codeAwarded },
      { label: 'Execution & Output Verification', max: outputMax, awarded: outputAwarded },
      { label: 'Viva-Voce Assessment', max: vivaMax, awarded: vivaAwarded },
      { label: 'Result, Discussion & Record Regularity', max: resultMax, awarded: Math.max(0, resultAwarded) },
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

  const totalDocPages = 4 + (experiments.length * 4);

  return (
    <div className="lab-record-wrapper font-serif text-black selection:bg-neutral-200">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 14mm 16mm 16mm 16mm;
        }

        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body > *:not(#root),
          #root > *:not(.lab-record-print-root) {
            display: none !important;
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
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .academic-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .booklet-spread-container {
            display: block !important;
            width: 100% !important;
            gap: 0 !important;
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
          box-sizing: border-box;
          padding: 16mm 18mm 18mm 18mm;
          margin: 0 auto 28px auto;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06);
          position: relative;
        }

        /* Duplex binding gutter margins */
        .academic-page.page-odd {
          padding-left: ${isDuplex ? '24mm' : '18mm'};
          padding-right: 14mm;
        }

        .academic-page.page-even {
          padding-left: 14mm;
          padding-right: ${isDuplex ? '24mm' : '18mm'};
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
          border: 1px solid #000000;
          border-top: none;
          padding: 10px 14px;
          font-size: 10pt;
          line-height: 1.55;
          margin-bottom: 14px;
          text-align: justify;
        }

        .code-container {
          border: 1px solid #000000;
          border-top: none;
          background: #fafafa;
          padding: 12px 14px;
          font-family: "Courier New", "JetBrains Mono", Consolas, monospace;
          font-size: 9.5pt;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
          margin-top: -1px;
          margin-bottom: 14px;
        }

        .output-container {
          border: 1px solid #000000;
          border-top: none;
          background: #fafafa;
          padding: 10px 14px;
          font-family: "Courier New", Consolas, monospace;
          font-size: 9.5pt;
          line-height: 1.45;
          white-space: pre-wrap;
          margin-top: -1px;
          margin-bottom: 14px;
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
        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
      >
        {/* =========================================================
            PAGE 1: EMPTY / BLANK FRONT FLYLEAF PAGE
            ========================================================= */}
        {(viewMode === 'all' || viewMode === 'flyleaf') && (
          <div className="academic-page page-odd flex flex-col justify-between">
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

            <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
              <span className="text-neutral-400 font-normal italic">Blank Flyleaf</span>
              <span>Page 1 of {totalDocPages}</span>
            </div>
          </div>
        )}

        {/* =========================================================
            PAGE 2: TITLE & OFFICIAL COVER PAGE
            ========================================================= */}
        {(viewMode === 'all' || viewMode === 'cover') && (
          <div className="academic-page page-even">
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
            <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
              <span>{course_code} — Title & Cover Sheet</span>
              <span>Page 2 of {totalDocPages}</span>
            </div>
          </div>
        )}

        {/* =========================================================
            PAGE 3: BONAFIDE CERTIFICATE
            ========================================================= */}
        {(viewMode === 'all' || viewMode === 'certificate') && (
          <div className="academic-page page-odd">
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
            <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
              <span>{course_code} — Bonafide Certificate</span>
              <span>Page 3 of {totalDocPages}</span>
            </div>
          </div>
        )}

        {/* =========================================================
            PAGE 4: INDEX OF LABORATORY EXPERIMENTS
            ========================================================= */}
        {(viewMode === 'all' || viewMode === 'index') && (
          <div className="academic-page page-even">
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
                  experiments.map((exp, idx) => {
                    const startPage = 5 + (idx * 4);
                    const rubricsData = getExperimentRubrics(exp, 100);
                    return (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px 6px' }}>{exp.experiment_no || idx + 1}</td>
                        <td style={{ textAlign: 'center', fontSize: '9.5pt', padding: '8px 6px' }}>{exp.date || '05-10-2026'}</td>
                        <td style={{ fontWeight: '500', padding: '8px 10px' }}>{exp.title}</td>
                        <td style={{ textAlign: 'center', padding: '8px 6px' }}>{startPage} – {startPage + 3}</td>
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
            <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
              <span>{course_code} — Index Sheet</span>
              <span>Page 4 of {totalDocPages}</span>
            </div>
          </div>
        )}

        {/* =========================================================
            EXPERIMENTS: FOUR-PAGE RECORD NOTEBOOK STRUCTURE
            - Page 1 (Left/Even): Program Source Code & Output
            - Page 2 (Right/Odd): Aim & Algorithm / Procedure ONLY
            - Page 3 (Left/Even): Empty / Blank Page
            - Page 4 (Right/Odd): Evaluation Rubrics (Centre) & Result (Bottom)
            Pages 3 & 4 are displayed side-by-side on screen
            ========================================================= */}
        {experiments.map((exp, index) => {
          const expNo = exp.experiment_no || index + 1;
          const page1Num = 5 + (index * 4);      // Left: Program & Output
          const page2Num = 6 + (index * 4);       // Right: Aim & Algorithm
          const page3Num = 7 + (index * 4);       // Left: Empty
          const page4Num = 8 + (index * 4);       // Right: Rubrics & Result

          const showPage1 = viewMode === 'all' || viewMode === 'spread' || viewMode === `exp_${expNo}_left` || viewMode === expNo;
          const showPage2 = viewMode === 'all' || viewMode === 'spread' || viewMode === `exp_${expNo}_right` || viewMode === expNo;
          const showPage3 = viewMode === 'all' || viewMode === 'spread' || viewMode === `exp_${expNo}_eval_left` || viewMode === expNo;
          const showPage4 = viewMode === 'all' || viewMode === 'spread' || viewMode === `exp_${expNo}_eval_right` || viewMode === expNo;

          const procedureSteps = parseProcedureSteps(exp.procedure);
          const cleanOutput = cleanExecutionOutput(exp.execution_output, exp.title);
          const rubricsData = getExperimentRubrics(exp, 100);

          const isSpread = viewMode === 'spread';

          return (
            <React.Fragment key={index}>
              {/* ===== PAIR 1: Program (Left) + Aim/Algorithm (Right) ===== */}
              <div className={isSpread ? 'booklet-spread-container' : 'w-full'}>
                {/* -------------------------------------------------------------
                    PAGE 1 - LEFT-HAND PAGE (EVEN): PROGRAM SOURCE CODE & EXECUTION OUTPUT
                    ------------------------------------------------------------- */}
                {showPage1 && (
                  <div className="academic-page page-even">
                    {/* Top Row: Left Page Header */}
                    <table className="top-row-table">
                      <tbody>
                        <tr>
                          <td style={{ textAlign: 'left' }}>
                            EXP NO: <span className="font-bold">{expNo}</span> &nbsp;&nbsp;|&nbsp;&nbsp; [PROGRAM & OUTPUT]
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

                    {/* Left Page Title Bar */}
                    <table className="section-bar-table">
                      <tbody>
                        <tr>
                          <td style={{ fontSize: '11.5pt', padding: '8px 10px' }}>
                            EXPERIMENT {expNo} : PROGRAM & EXECUTION OUTPUT
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* 3. PROGRAM */}
                    <table className="section-bar-table" style={{ marginTop: '14px' }}>
                      <tbody>
                        <tr>
                          <td style={{ textAlign: 'left', padding: '5px 10px', fontSize: '10pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>3. PROGRAM SOURCE CODE</span>
                            <span style={{ fontSize: '8.5pt', fontFamily: 'Courier New', textTransform: 'none', fontWeight: 'normal' }}>
                              Language: {exp.language || 'Python'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <pre className="code-container" style={{ minHeight: '340px' }}>
                      {exp.submitted_code || `# Program for Experiment ${expNo}: ${exp.title}\ndef main():\n    print("Program executed successfully")\n\nif __name__ == '__main__':\n    main()`}
                    </pre>

                    {/* 4. SAMPLE INPUT & OUTPUT */}
                    {showOutputs && (
                      <>
                        <table className="section-bar-table">
                          <tbody>
                            <tr>
                              <td style={{ textAlign: 'left', padding: '5px 10px', fontSize: '10pt' }}>
                                4. SAMPLE INPUT & CONSOLE OUTPUT
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="output-container" style={{ minHeight: '130px' }}>
                          {cleanOutput}
                        </div>
                      </>
                    )}

                    {/* Footer */}
                    <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
                      <span>{course_code} — Experiment {expNo} (Program & Output)</span>
                      <span>Page {page1Num} of {totalDocPages}</span>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    PAGE 2 - RIGHT-HAND PAGE (ODD): AIM & ALGORITHM ONLY
                    ------------------------------------------------------------- */}
                {showPage2 && (
                  <div className="academic-page page-odd flex flex-col justify-between">
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

                      {/* Right Page Title Bar */}
                      <table className="section-bar-table">
                        <tbody>
                          <tr>
                            <td style={{ fontSize: '11.5pt', padding: '8px 10px' }}>
                              EXPERIMENT {expNo} : {exp.title ? exp.title.toUpperCase() : `LAB EXPERIMENT ${expNo}`}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 1. AIM */}
                      <table className="section-bar-table" style={{ marginTop: '12px' }}>
                        <tbody>
                          <tr>
                            <td style={{ textAlign: 'left', padding: '5px 10px', fontSize: '10pt' }}>
                              1. AIM
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="content-box" style={{ marginBottom: '10px' }}>
                        {exp.aim || `To write, execute and verify the program for "${exp.title}".`}
                      </div>

                      {/* 2. ALGORITHM / PROCEDURE */}
                      <table className="section-bar-table" style={{ marginTop: '10px' }}>
                        <tbody>
                          <tr>
                            <td style={{ textAlign: 'left', padding: '5px 10px', fontSize: '10pt' }}>
                              2. ALGORITHM / PROCEDURE
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="content-box" style={{ minHeight: '130px', marginBottom: '14px' }}>
                        {procedureSteps.length > 0 ? (
                          <ol style={{ margin: 0, paddingLeft: '22px' }}>
                            {procedureSteps.map((step, sIdx) => (
                              <li key={sIdx} style={{ marginBottom: '4px' }}>
                                {step.replace(/^Step\s*\d+:\s*/i, '').replace(/^\d+[\.)\]]\s*/, '')}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p style={{ margin: 0, lineHeight: '1.6' }}>
                            1. Start the program.<br />
                            2. Read the required input parameters and initialize data structures.<br />
                            3. Implement the logic and algorithm operations for {exp.title}.<br />
                            4. Compute and display the verified output.<br />
                            5. Stop the program execution.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
                      <span>{course_code} — Experiment {expNo} (Aim & Algorithm)</span>
                      <span>Page {page2Num} of {totalDocPages}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ===== PAIR 2: Blank (Left) + Rubrics & Result (Right) — SIDE-BY-SIDE ===== */}
              <div className="booklet-spread-container">
                {/* -------------------------------------------------------------
                    PAGE 3 - LEFT-HAND PAGE (EVEN): BLANK / EMPTY PAGE
                    ------------------------------------------------------------- */}
                {showPage3 && (
                  <div className="academic-page page-even flex flex-col justify-between">
                    <div className="text-right text-[8pt] text-neutral-300 select-none">
                      [This page is intentionally left blank]
                    </div>

                    <div className="flex-1" />

                    {/* Footer */}
                    <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
                      <span className="text-neutral-400 font-normal italic">Blank Page</span>
                      <span>Page {page3Num} of {totalDocPages}</span>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    PAGE 4 - RIGHT-HAND PAGE (ODD):
                    - Centre: Evaluation Rubrics Matrix (100 Marks breakdown)
                    - Bottom: 5. Result & Staff Signature
                    ------------------------------------------------------------- */}
                {showPage4 && (
                  <div className="academic-page page-odd flex flex-col">
                    {/* Top Row Header */}
                    <table className="top-row-table">
                      <tbody>
                        <tr>
                          <td style={{ textAlign: 'left' }}>
                            EXP NO: <span className="font-bold">{expNo}</span> &nbsp;&nbsp;|&nbsp;&nbsp; [EVALUATION & RESULT]
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

                    {/* Evaluation Page Title Bar */}
                    <table className="section-bar-table">
                      <tbody>
                        <tr>
                          <td style={{ fontSize: '11.5pt', padding: '8px 10px' }}>
                            EXPERIMENT {expNo} : EVALUATION & RESULT
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Spacer to push rubrics towards centre */}
                    <div className="flex-1" />

                    {/* --------------------------------------------------------
                        CENTRE: EVALUATION RUBRIC & MARKS BREAKDOWN
                        -------------------------------------------------------- */}
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
                            {rubricsData.items.map((item, rIdx) => (
                              <tr key={rIdx}>
                                <td style={{ padding: '6px 10px' }}>{item.label}</td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.max}</td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.awarded}</td>
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

                    {/* --------------------------------------------------------
                        BOTTOM: 5. RESULT & STAFF SIGNATURE
                        -------------------------------------------------------- */}
                    <div className="prevent-break" style={{ marginBottom: '12mm' }}>
                      {/* 5. RESULT */}
                      <table className="section-bar-table">
                        <tbody>
                          <tr>
                            <td style={{ textAlign: 'left', padding: '5px 10px', fontSize: '10pt' }}>
                              5. RESULT
                            </td>
                          </tr>
                        </tbody>
                      </table>
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

                    {/* Footer */}
                    <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
                      <span>{course_code} — Experiment {expNo} (Evaluation & Result)</span>
                      <span>Page {page4Num} of {totalDocPages}</span>
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
