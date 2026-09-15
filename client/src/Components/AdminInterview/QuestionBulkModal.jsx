import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  RefreshCw,
  Plus,
  HelpCircle,
  Trash2,
  FileUp
} from 'lucide-react';
import api from '../../api/axios';

export default function QuestionBulkModal({
  isOpen,
  onClose,
  currentLevel,
  currentTrack,
  onSuccess,
}) {
  const [importFormat, setImportFormat] = useState('json'); // 'json' | 'csv'
  const [inputMode, setInputMode] = useState('file'); // 'file' | 'text'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [parseError, setParseError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const currentMode = currentLevel?.mode || 'coding';

  // ============================================================
  // SAMPLE TEMPLATES
  // ============================================================
  const handleDownloadJSONTemplate = () => {
    const sample = [
      {
        title: "Two Sum with Target Lookup",
        prompt: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        difficulty: "Easy",
        type: currentMode,
        detail: {
          constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
          expected_approach: "Use a hash map to look up the complement for each element in O(1) average time.",
          expected_complexity: "Time: O(N), Space: O(N)",
          ideal_answer: "Iterate once maintaining a complement lookup map.",
          scenario: "",
          correct_option: "",
          explanation: ""
        },
        templates: [
          {
            language: "javascript",
            starter_code: "function twoSum(nums, target) {\n  // Write your code here\n}"
          },
          {
            language: "python",
            starter_code: "def twoSum(nums: list[int], target: int) -> list[int]:\n    # Write your code here\n    pass"
          }
        ],
        test_cases: [
          {
            input: "[2,7,11,15]\n9",
            expected_output: "[0,1]",
            is_hidden: false,
            explanation: "nums[0] + nums[1] == 9"
          },
          {
            input: "[3,2,4]\n6",
            expected_output: "[1,2]",
            is_hidden: true,
            explanation: "nums[1] + nums[2] == 6"
          }
        ],
        hints: [
          { type: "hint", content: "Can you store already visited numbers in a hash map?" },
          { type: "rubric", content: "Check for O(N) single-pass lookup efficiency." }
        ],
        mcq_options: [
          { option_key: "A", option_text: "O(N) with Hash Map", is_correct: true },
          { option_key: "B", option_text: "O(N^2) Nested Loops", is_correct: false }
        ]
      },
      {
        title: "Valid Palindrome Verification",
        prompt: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
        difficulty: "Easy",
        type: currentMode,
        detail: {
          constraints: "1 <= s.length <= 2 * 10^5",
          expected_approach: "Two-pointer approach comparing start and end characters while skipping non-alphanumerics.",
          expected_complexity: "Time: O(N), Space: O(1)",
          ideal_answer: "Two pointers converging towards center."
        },
        templates: [
          {
            language: "javascript",
            starter_code: "function isPalindrome(s) {\n  // Write your solution here\n}"
          }
        ],
        test_cases: [
          {
            input: "\"A man, a plan, a canal: Panama\"",
            expected_output: "true",
            is_hidden: false,
            explanation: "\"amanaplanacanalpanama\" is a palindrome."
          }
        ],
        hints: [
          { type: "hint", content: "Consider using two pointers from both ends." }
        ]
      }
    ];

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mockmate_${currentMode}_questions_template.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSVTemplate = () => {
    const csvContent = [
      'title,prompt,difficulty,type,constraints,starter_code,test_case_1_input,test_case_1_output,test_case_2_input,test_case_2_output,hints,expected_approach',
      '"Two Sum Lookup","Given an array of integers nums and target, return indices.","Easy","coding","2 <= nums.length <= 10^4","function twoSum(nums, target) {}","[2,7,11,15]\n9","[0,1]","[3,2,4]\n6","[1,2]","Use a hash map","One pass hash map O(N)"',
      '"Valid Palindrome","Determine if string is a palindrome after stripping non-alphanumerics.","Easy","coding","1 <= s.length <= 2*10^5","function isPalindrome(s) {}","\"race a car\"","false","\"aba\"","true","Two pointers approach","Converging pointers O(N)"'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mockmate_${currentMode}_questions_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // PARSING LOGIC
  // ============================================================
  const parseContent = (content, format) => {
    setParseError('');
    if (!content || !content.trim()) {
      setParsedPreview([]);
      return;
    }

    if (format === 'json') {
      try {
        const data = JSON.parse(content);
        const list = Array.isArray(data) ? data : [data];
        const preview = list.map((item, idx) => {
          const title = (item.title || item.name || '').trim();
          const prompt = (item.prompt || item.description || item.question || '').trim();
          const difficulty = item.difficulty || 'Medium';
          const type = item.type || currentMode;

          let status = 'valid';
          let message = 'Ready to import';

          if (!title) {
            status = 'error';
            message = 'Missing title';
          } else if (!prompt) {
            status = 'error';
            message = 'Missing prompt';
          }

          return {
            id: idx + 1,
            title,
            prompt,
            difficulty,
            type,
            testCasesCount: (item.test_cases || []).length,
            templatesCount: (item.templates || []).length,
            hintsCount: (item.hints || []).length,
            rawItem: item,
            status,
            message,
          };
        });
        setParsedPreview(preview);
      } catch (err) {
        setParseError('Invalid JSON format: ' + err.message);
        setParsedPreview([]);
      }
    } else {
      // CSV parser
      const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        setParsedPreview([]);
        return;
      }

      const parseLine = (text) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headerCols = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_\-/]/g, ''));
      const titleIdx = headerCols.findIndex((h) => h.includes('title') || h.includes('name'));
      const promptIdx = headerCols.findIndex((h) => h.includes('prompt') || h.includes('desc') || h.includes('question'));
      const diffIdx = headerCols.findIndex((h) => h.includes('diff'));
      const typeIdx = headerCols.findIndex((h) => h.includes('type') || h.includes('mode'));
      const constraintsIdx = headerCols.findIndex((h) => h.includes('constraint'));
      const starterIdx = headerCols.findIndex((h) => h.includes('starter') || h.includes('code'));
      const tc1InIdx = headerCols.findIndex((h) => h.includes('testcase1in') || h.includes('tc1in') || h.includes('samplein'));
      const tc1OutIdx = headerCols.findIndex((h) => h.includes('testcase1out') || h.includes('tc1out') || h.includes('sampleout'));
      const tc2InIdx = headerCols.findIndex((h) => h.includes('testcase2in') || h.includes('tc2in'));
      const tc2OutIdx = headerCols.findIndex((h) => h.includes('testcase2out') || h.includes('tc2out'));
      const hintsIdx = headerCols.findIndex((h) => h.includes('hint'));
      const approachIdx = headerCols.findIndex((h) => h.includes('approach'));

      const startIndex = titleIdx !== -1 || promptIdx !== -1 ? 1 : 0;
      const preview = [];

      for (let i = startIndex; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

        const title = titleIdx !== -1 ? (cols[titleIdx] || '') : (cols[0] || '');
        const prompt = promptIdx !== -1 ? (cols[promptIdx] || '') : (cols[1] || '');
        const difficulty = diffIdx !== -1 && cols[diffIdx] ? cols[diffIdx] : 'Medium';
        const type = typeIdx !== -1 && cols[typeIdx] ? cols[typeIdx] : currentMode;

        const testCases = [];
        if (tc1InIdx !== -1 && cols[tc1InIdx]) {
          testCases.push({
            input: cols[tc1InIdx],
            expected_output: tc1OutIdx !== -1 ? cols[tc1OutIdx] || '' : '',
            is_hidden: false,
          });
        }
        if (tc2InIdx !== -1 && cols[tc2InIdx]) {
          testCases.push({
            input: cols[tc2InIdx],
            expected_output: tc2OutIdx !== -1 ? cols[tc2OutIdx] || '' : '',
            is_hidden: true,
          });
        }

        const templates = [];
        if (starterIdx !== -1 && cols[starterIdx]) {
          templates.push({
            language: 'javascript',
            starter_code: cols[starterIdx],
          });
        }

        const hints = [];
        if (hintsIdx !== -1 && cols[hintsIdx]) {
          hints.push({
            type: 'hint',
            content: cols[hintsIdx],
          });
        }

        const rawItem = {
          title,
          prompt,
          difficulty,
          type,
          detail: {
            constraints: constraintsIdx !== -1 ? cols[constraintsIdx] || '' : '',
            expected_approach: approachIdx !== -1 ? cols[approachIdx] || '' : '',
          },
          templates,
          test_cases: testCases,
          hints,
        };

        let status = 'valid';
        let message = 'Ready to import';
        if (!title.trim()) {
          status = 'error';
          message = 'Missing title';
        } else if (!prompt.trim()) {
          status = 'error';
          message = 'Missing prompt';
        }

        preview.push({
          id: i + 1,
          title: title.trim(),
          prompt: prompt.trim(),
          difficulty,
          type,
          testCasesCount: testCases.length,
          templatesCount: templates.length,
          hintsCount: hints.length,
          rawItem,
          status,
          message,
        });
      }

      setParsedPreview(preview);
    }
  };

  const processFile = (file) => {
    if (!file) return;
    setUploadedFile(file);

    const isJson = file.name.toLowerCase().endsWith('.json') || file.type.includes('json');
    const fmt = isJson ? 'json' : 'csv';
    setImportFormat(fmt);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      parseContent(text, fmt);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleTextChange = (text) => {
    setRawText(text);
    parseContent(text, importFormat);
  };

  const handleFormatSwitch = (fmt) => {
    setImportFormat(fmt);
    if (rawText) {
      parseContent(rawText, fmt);
    }
  };

  const handleResetUpload = () => {
    setUploadedFile(null);
    setParsedPreview([]);
    setParseError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================
  // SUBMIT BATCH
  // ============================================================
  const handleSubmit = async () => {
    const validItems = parsedPreview.filter((p) => p.status === 'valid');
    if (validItems.length === 0) {
      alert('No valid questions to import.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        questions: validItems.map((p) => ({
          ...p.rawItem,
          level_id: currentLevel.id,
          type: p.rawItem.type || currentMode,
        })),
      };

      const res = await api.post(`/admin/interviews/levels/${currentLevel.id}/questions/bulk`, payload);
      setImportResult(res.data || res);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.message || 'Failed to bulk import questions');
    } finally {
      setLoading(false);
    }
  };

  const validCount = parsedPreview.filter((p) => p.status === 'valid').length;
  const errorCount = parsedPreview.filter((p) => p.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex min-h-full items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] flex flex-col my-auto overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
                Bulk Upload Questions
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Import question bank for <strong>{currentTrack?.title}</strong> • Level {currentLevel?.level_number} ({currentMode.toUpperCase()})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          {importResult ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-[var(--green-bg)] border border-[var(--green)]/30 rounded-[var(--radius-md)] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--green)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[14px] font-bold text-[var(--green)]">
                    Questions Imported Successfully!
                  </h4>
                  <p className="text-[12px] text-[var(--text-primary)] mt-1">
                    <strong>{importResult.created_count || 0}</strong> questions were added into Level {currentLevel?.level_number}.
                    {importResult.skipped_count > 0 && ` (${importResult.skipped_count} items skipped)`}
                  </p>
                </div>
              </div>

              {importResult.skipped_details && importResult.skipped_details.length > 0 && (
                <div className="panel-card p-4 space-y-2">
                  <p className="text-[12px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Skipped Details ({importResult.skipped_details.length}):</span>
                  </p>
                  <div className="max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 text-[var(--text-secondary)] bg-[var(--bg-input)] p-3 rounded">
                    {importResult.skipped_details.map((msg, idx) => (
                      <div key={idx} className="border-b border-[var(--border)]/50 pb-1">
                        • {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportResult(null);
                    setParsedPreview([]);
                    setUploadedFile(null);
                    setRawText('');
                  }}
                  className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Upload Another Batch
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-primary text-xs py-2 px-4 cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Sample Templates Download Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[var(--bg-raised)] rounded-[var(--radius-md)] border border-[var(--border)]">
                <div>
                  <p className="text-[12px] font-bold text-[var(--text-primary)]">
                    Need sample question templates?
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Download sample formats with boilerplate code, test cases, and constraints.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadJSONTemplate}
                    className="btn btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 font-bold hover:text-indigo-500 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Sample JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSVTemplate}
                    className="btn btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 font-bold hover:text-emerald-500 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sample CSV</span>
                  </button>
                </div>
              </div>

              {/* Format & Input Mode Selectors */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                {/* Format selection */}
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase">Format:</span>
                  <div className="flex items-center p-0.5 bg-[var(--bg-input)] rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleFormatSwitch('json')}
                      className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 text-xs ${
                        importFormat === 'json'
                          ? 'bg-[var(--bg-card)] text-[var(--accent)] font-bold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>JSON (Rich Specs)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormatSwitch('csv')}
                      className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 text-xs ${
                        importFormat === 'csv'
                          ? 'bg-[var(--bg-card)] text-[var(--accent)] font-bold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CSV (Table)</span>
                    </button>
                  </div>
                </div>

                {/* Input mode selection */}
                <div className="flex items-center p-0.5 bg-[var(--bg-input)] rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                      inputMode === 'file'
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-bold shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                      inputMode === 'text'
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-bold shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Paste Text</span>
                  </button>
                </div>
              </div>

              {/* Upload Input Area */}
              {inputMode === 'file' ? (
                <div>
                  <input
                    id="bulk-question-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept={importFormat === 'json' ? '.json' : '.csv'}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <div className="p-4 bg-[var(--bg-raised)] border border-[var(--border-accent)] rounded-[var(--radius-lg)] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center shrink-0">
                          {importFormat === 'json' ? <FileCode className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                            {uploadedFile.name}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] font-mono">
                            {(uploadedFile.size / 1024).toFixed(1)} KB • {importFormat.toUpperCase()} format
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="bulk-question-file-input"
                          className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                        >
                          Change File
                        </label>
                        <button
                          type="button"
                          onClick={handleResetUpload}
                          className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 rounded transition cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="bulk-question-file-input"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`block border-2 border-dashed rounded-[var(--radius-lg)] p-8 text-center transition cursor-pointer space-y-2.5 ${
                        isDragging
                          ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                          : 'border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--bg-input)]/40 hover:bg-[var(--bg-input)]'
                      }`}
                    >
                      <div className="w-12 h-12 mx-auto rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[var(--text-primary)]">
                          Click to browse or drop your {importFormat.toUpperCase()} file
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Accepts valid <strong>.{importFormat}</strong> format
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                      Paste {importFormat.toUpperCase()} Content:
                    </label>
                    {rawText && (
                      <button
                        type="button"
                        onClick={() => handleTextChange('')}
                        className="text-[11px] text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                      >
                        Clear Text
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder={
                      importFormat === 'json'
                        ? '[\n  {\n    "title": "Two Sum",\n    "prompt": "Find indices of two numbers.",\n    "difficulty": "Easy"\n  }\n]'
                        : 'title,prompt,difficulty,constraints,starter_code\n"Two Sum","Find indices of two numbers","Easy","2<=N<=10^4","function twoSum() {}"'
                    }
                    className="custom-input font-mono text-[11px] w-full p-3 resize-y"
                  />
                </div>
              )}

              {/* Parse Error Notification */}
              {parseError && (
                <div className="p-3 bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-[var(--radius-sm)] text-[12px] text-[var(--red)] font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-[var(--text-primary)]">
                        Parsed Questions Preview:
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-secondary)]">
                        Total: {parsedPreview.length}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                        ✓ {validCount} Valid
                      </span>
                      {errorCount > 0 && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                          ✕ {errorCount} Missing Title/Prompt
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-md)] overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-[var(--bg-input)] text-[var(--text-muted)] font-mono uppercase sticky top-0 border-b border-[var(--border)]">
                        <tr>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Title</th>
                          <th className="py-2 px-3">Difficulty</th>
                          <th className="py-2 px-3">Prompt Excerpt</th>
                          <th className="py-2 px-3 text-center">Test Cases</th>
                          <th className="py-2 px-3 text-center">Templates</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {parsedPreview.map((item, i) => (
                          <tr key={i} className="hover:bg-[var(--bg-hover)]">
                            <td className="py-2 px-3 whitespace-nowrap">
                              {item.status === 'valid' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400" title={item.message}>
                                  <AlertCircle className="w-3 h-3" /> {item.message}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[var(--text-primary)]">
                              {item.title || <span className="text-rose-500 italic">Empty</span>}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                item.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-600' :
                                item.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                              }`}>
                                {item.difficulty}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[200px]">
                              {item.prompt || <span className="text-rose-500 italic">Empty</span>}
                            </td>
                            <td className="py-2 px-3 font-mono text-center text-[var(--text-muted)]">
                              {item.testCasesCount > 0 ? (
                                <span className="text-[var(--accent)] font-bold">{item.testCasesCount} cases</span>
                              ) : '—'}
                            </td>
                            <td className="py-2 px-3 font-mono text-center text-[var(--text-muted)]">
                              {item.templatesCount > 0 ? (
                                <span className="text-indigo-600 font-bold">{item.templatesCount} langs</span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importResult && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--bg-raised)]/70">
            <div className="text-[12px] text-[var(--text-muted)]">
              {validCount > 0 ? (
                <span><strong>{validCount}</strong> questions ready for Level {currentLevel?.level_number}</span>
              ) : (
                <span>Upload or paste question content to validate</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validCount === 0 || loading}
                onClick={handleSubmit}
                className="btn btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing {validCount} Questions...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import {validCount} Questions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
