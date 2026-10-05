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
  viewMode = 'all', // 'all', 'cover', 'certificate', 'index', or experiment_no (number)
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
  const totalMarks = experiments.reduce((acc, exp) => acc + (Number(exp.marks) || 0), 0);
  const avgMarks = experiments.length ? (totalMarks / experiments.length).toFixed(1) : '10.0';

  const defaultCertText = certificate_text ||
    `Certified that this is the bonafide record of practical work done by Mr./Ms. ${student_name} (Register No: ${register_no || roll_no}) of ${semester}, ${department} in the ${course_code} – ${course_title} Laboratory during the academic year ${academic_year}.`;

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

          /* Hide everything except printable lab record */
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

        /* Screen & Document Page Styling - Spacious & Breathable */
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

        .academic-page.duplex-odd {
          padding-left: 22mm;
          padding-right: 14mm;
        }

        .academic-page.duplex-even {
          padding-left: 14mm;
          padding-right: 22mm;
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
          margin-top: 16px;
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
      `}</style>

      <div
        className="document-canvas flex flex-col items-center transition-all duration-200"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
      >
        {/* =========================================================
            PAGE 1: OFFICIAL COVER & TITLE PAGE
            ========================================================= */}
        {(viewMode === 'all' || viewMode === 'cover') && (
          <div className={`academic-page ${isDuplex ? 'duplex-odd' : ''}`}>
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
                  <td colSpan={2} style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase', background: '#f4f4f5', padding: '7px 10px' }}>
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
                  <td>STUDENT DETAILS</td>
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
                  <td style={{ fontWeight: 'bold', background: '#fafafa' }}>Average Marks</td>
                  <td style={{ fontWeight: 'bold' }}>{avgMarks} / 10</td>
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
              <span>{course_code} — Laboratory Record Manual</span>
              <span>Page 1 of {experiments.length + 3}</span>
            </div>
          </div>
        )}

        {/* =========================================================
            PAGE 2: BONAFIDE CERTIFICATE
            ========================================================= */}
        {(viewMode === 'all' || viewMode === 'certificate') && (
          <div className={`academic-page ${isDuplex ? 'duplex-even' : ''}`}>
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
              <span>{course_code} — Laboratory Record Manual</span>
              <span>Page 2 of {experiments.length + 3}</span>
            </div>
          </div>
        )}

        {/* =========================================================
            PAGE 3: INDEX OF LABORATORY EXPERIMENTS
            ========================================================= */}
        {(viewMode === 'all' || viewMode === 'index') && (
          <div className={`academic-page ${isDuplex ? 'duplex-odd' : ''}`}>
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
                  <th style={{ width: '80px', padding: '8px 6px' }}>Marks (10)</th>
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
                  experiments.map((exp, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px 6px' }}>{exp.experiment_no || idx + 1}</td>
                      <td style={{ textAlign: 'center', fontSize: '9.5pt', padding: '8px 6px' }}>{exp.date || '05-10-2026'}</td>
                      <td style={{ fontWeight: '500', padding: '8px 10px' }}>{exp.title}</td>
                      <td style={{ textAlign: 'center', padding: '8px 6px' }}>{idx + 4}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px 6px' }}>
                        {exp.marks !== undefined ? exp.marks : 10}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '8.5pt', padding: '8px 6px' }}>
                        Verified
                      </td>
                    </tr>
                  ))
                )}
                {/* Total Summary Row */}
                {experiments.length > 0 && (
                  <tr style={{ background: '#fafafa', fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '10px 14px' }}>
                      AVERAGE SCORE:
                    </td>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '10px 8px' }}>
                      {avgMarks} / 10 Marks
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Evaluation Criteria */}
            <table className="section-bar-table" style={{ marginTop: '24px' }}>
              <tbody>
                <tr>
                  <td>EVALUATION CRITERIA & WEIGHTAGE</td>
                </tr>
              </tbody>
            </table>

            <table className="grid-table">
              <thead>
                <tr>
                  <th style={{ width: '15%', padding: '8px' }}>S.No</th>
                  <th style={{ width: '55%', padding: '8px', textAlign: 'left' }}>Assessment Component</th>
                  <th style={{ width: '30%', padding: '8px' }}>Marks Split-up</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>1</td>
                  <td style={{ padding: '8px 10px' }}>Aim, Logic Formulation & Algorithm / Procedure</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>3 Marks</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>2</td>
                  <td style={{ padding: '8px 10px' }}>Program Implementation & Execution</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>4 Marks</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>3</td>
                  <td style={{ padding: '8px 10px' }}>Viva-Voce & Record Regularity</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>3 Marks</td>
                </tr>
                <tr style={{ background: '#fafafa', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '8px 14px' }}>TOTAL:</td>
                  <td style={{ textAlign: 'center' }}>10 Marks</td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
              <span>{course_code} — Laboratory Record Manual</span>
              <span>Page 3 of {experiments.length + 3}</span>
            </div>
          </div>
        )}

        {/* =========================================================
            PAGES 4+: LABORATORY EXPERIMENT DETAILS
            ========================================================= */}
        {experiments.map((exp, index) => {
          const expNo = exp.experiment_no || index + 1;
          const pageNum = index + 4;
          const isOdd = pageNum % 2 !== 0;

          if (viewMode !== 'all' && viewMode !== expNo) {
            return null;
          }

          const procedureSteps = parseProcedureSteps(exp.procedure);
          const cleanOutput = cleanExecutionOutput(exp.execution_output, exp.title);

          return (
            <div key={index} className={`academic-page ${isDuplex ? (isOdd ? 'duplex-odd' : 'duplex-even') : ''}`}>
              {/* Top Row */}
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

              {/* Experiment Title Bar */}
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
              <table className="section-bar-table" style={{ marginTop: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left', padding: '5px 10px', fontSize: '10pt' }}>
                      1. AIM
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="content-box">
                {exp.aim || `To write, execute and verify the program for "${exp.title}".`}
              </div>

              {/* 2. ALGORITHM / PROCEDURE */}
              <table className="section-bar-table">
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left', padding: '5px 10px', fontSize: '10pt' }}>
                      2. ALGORITHM / PROCEDURE
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="content-box">
                {procedureSteps.length > 0 ? (
                  <ol style={{ margin: 0, paddingLeft: '22px' }}>
                    {procedureSteps.map((step, sIdx) => (
                      <li key={sIdx} style={{ marginBottom: '6px' }}>
                        {step.replace(/^Step\s*\d+:\s*/i, '').replace(/^\d+[\.\)]\s*/, '')}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p style={{ margin: 0, lineHeight: '1.6' }}>
                    1. Start the program.<br />
                    2. Read the required input values.<br />
                    3. Perform the necessary operations and calculations for {exp.title}.<br />
                    4. Display the calculated result.<br />
                    5. Stop the program execution.
                  </p>
                )}
              </div>

              {/* 3. PROGRAM */}
              <table className="section-bar-table">
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left', padding: '5px 10px', fontSize: '10pt' }}>
                      3. PROGRAM
                    </td>
                  </tr>
                </tbody>
              </table>
              <pre className="code-container">
                {exp.submitted_code || `# Program for Experiment ${expNo}: ${exp.title}\ndef main():\n    print("Program executed successfully")\n\nif __name__ == '__main__':\n    main()`}
              </pre>

              {/* 4. SAMPLE INPUT & OUTPUT */}
              {showOutputs && (
                <>
                  <table className="section-bar-table">
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'left', padding: '5px 10px', fontSize: '10pt' }}>
                          4. SAMPLE INPUT & OUTPUT
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="output-container">
                    {cleanOutput}
                  </div>
                </>
              )}

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
              <div className="content-box">
                {exp.result_text || `Thus the program for "${exp.title}" was successfully written, executed, and verified.`}
              </div>

              {/* 6. MARKS & SIGN-OFF */}
              {showRubrics && (
                <div className="prevent-break">
                  <table className="grid-table" style={{ marginTop: '14px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '25%', padding: '6px' }}>Aim & Algorithm (3)</th>
                        <th style={{ width: '25%', padding: '6px' }}>Program Coding (4)</th>
                        <th style={{ width: '25%', padding: '6px' }}>Execution & Viva (3)</th>
                        <th style={{ width: '25%', padding: '6px' }}>Total Marks (10)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px' }}>{exp.algorithm_marks || 3}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px' }}>{exp.code_marks || 4}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px' }}>{exp.viva_marks || 3}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', background: '#f4f4f5', padding: '6px' }}>
                          {exp.marks !== undefined ? exp.marks : 10} / 10
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ fontSize: '9pt', padding: '8px 10px' }}>
                          Staff In-Charge: <strong>{staff_incharge}</strong>
                        </td>
                        <td colSpan={2} style={{ textAlign: 'right', fontSize: '9pt', padding: '8px 10px', fontWeight: 'bold' }}>
                          Staff Signature: ____________________
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="doc-footer" style={{ position: 'absolute', bottom: '14mm', left: '18mm', right: '18mm' }}>
                <span>{course_code} — Experiment {expNo}</span>
                <span>Page {pageNum} of {experiments.length + 3}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
