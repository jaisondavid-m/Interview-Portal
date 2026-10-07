import React, { useState, useRef, useEffect } from 'react';
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
  FileUp,
  FlaskConical,
  Layers,
  Code2
} from 'lucide-react';
import api from '../../api/axios';

// ============================================================
// SAMPLE TEMPLATES GENERATORS
// ============================================================
export const getExperimentSampleJSON = (courseCode = 'CS301') => [
  {
    experiment_no: 1,
    language: 'python',
    title: 'Implementation of Linear and Binary Search',
    aim: 'To write and execute a program to implement linear and binary search algorithms on a given sequence of integers.',
    max_marks: 100
  },
  {
    experiment_no: 2,
    language: 'python',
    title: 'Stack ADT Implementation using Arrays',
    aim: 'To design and implement Stack Abstract Data Type supporting push, pop, peek, and display operations.',
    max_marks: 100
  }
];

export const getExperimentSampleCSV = () => {
  return `experiment_no,language,title,aim,max_marks
1,"python","Implementation of Linear and Binary Search","To write and execute a program to implement linear and binary search algorithms on a given sequence of integers.",100
2,"python","Stack ADT Implementation using Arrays","To design and implement Stack Abstract Data Type supporting push, pop, peek, and display operations.",100`;
};

export const getVariantSampleJSON = (expNo = 1) => [
  {
    question_code: `EX${expNo}_VAR_A`,
    title: 'Binary Search on Sorted Floating Point Array',
    aim: 'Implement binary search with precision threshold epsilon = 1e-6 on a strictly ascending floating point list.',
    language: 'python',
    max_marks: 100,
    viva_questions_count: 5,
    reference_algorithm: JSON.stringify([
      'Initialize low = 0 and high = N - 1.',
      'Compute mid = (low + high) // 2.',
      'Check if abs(arr[mid] - target) < 1e-6.',
      'Adjust search window accordingly.',
      'Return 0-indexed position or -1 if absent.'
    ], null, 2),
    solution_code: 'import sys\n\ndef binary_search_float(arr, target, eps=1e-6):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if abs(arr[mid] - target) < eps:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n\nif __name__ == "__main__":\n    lines = sys.stdin.read().splitlines()\n    if lines:\n        arr = list(map(float, lines[0].split()))\n        target = float(lines[1])\n        print(binary_search_float(arr, target))\n',
    sample_test_cases: JSON.stringify([
      { input: '1.5 2.7 3.9 4.2 5.8\n3.9', expected_output: '2' },
      { input: '0.1 0.2 0.3\n0.5', expected_output: '-1' }
    ], null, 2),
    hidden_test_cases: JSON.stringify([
      { input: '10.0 20.0 30.0\n10.0', expected_output: '0' }
    ], null, 2),
    viva_questions: [
      {
        question: 'Why must binary search array inputs be strictly ordered?',
        answer: 'Because monotonic order allows discarding half the search candidates at each comparison step in O(log N) time.'
      },
      {
        question: 'What is the auxiliary space complexity of iterative binary search?',
        answer: 'Iterative binary search uses O(1) constant auxiliary space as it only maintains low, high, and mid index pointers.'
      },
      {
        question: 'How do you prevent integer overflow when calculating mid?',
        answer: 'Use mid = low + (high - low) // 2 instead of (low + high) // 2 in languages with fixed integer bit widths.'
      }
    ]
  },
  {
    question_code: `EX${expNo}_VAR_B`,
    title: 'First and Last Occurrence Search in Sorted Array',
    aim: 'Given a sorted array of integers with duplicates, find the first and last position of a given target value using two binary searches.',
    language: 'python',
    max_marks: 100,
    viva_questions_count: 5,
    reference_algorithm: JSON.stringify([
      'Run first binary search: when target is matched, record index and continue searching left (high = mid - 1).',
      'Run second binary search: when target is matched, record index and continue searching right (low = mid + 1).',
      'Return space-separated pair (first_pos, last_pos) or (-1, -1).'
    ], null, 2),
    solution_code: 'import sys\n\ndef find_bounds(arr, target):\n    def find_first():\n        low, high, res = 0, len(arr) - 1, -1\n        while low <= high:\n            mid = (low + high) // 2\n            if arr[mid] == target:\n                res = mid\n                high = mid - 1\n            elif arr[mid] < target:\n                low = mid + 1\n            else:\n                high = mid - 1\n        return res\n\n    def find_last():\n        low, high, res = 0, len(arr) - 1, -1\n        while low <= high:\n            mid = (low + high) // 2\n            if arr[mid] == target:\n                res = mid\n                low = mid + 1\n            elif arr[mid] < target:\n                low = mid + 1\n            else:\n                high = mid - 1\n        return res\n\n    return f"{find_first()} {find_last()}"\n\nif __name__ == "__main__":\n    lines = sys.stdin.read().splitlines()\n    if len(lines) >= 2:\n        arr = list(map(int, lines[0].split()))\n        target = int(lines[1])\n        print(find_bounds(arr, target))\n',
    sample_test_cases: JSON.stringify([
      { input: '5 7 7 8 8 10\n8', expected_output: '3 4' },
      { input: '5 7 7 8 8 10\n6', expected_output: '-1 -1' }
    ], null, 2),
    hidden_test_cases: JSON.stringify([
      { input: '1 1 1 1 1\n1', expected_output: '0 4' }
    ], null, 2),
    viva_questions: [
      {
        question: 'What is the overall time complexity of finding both first and last occurrence?',
        answer: 'O(log N) since it executes two independent binary searches each taking O(log N) iterations.'
      },
      {
        question: 'Can this problem be solved using Python standard library bisect?',
        answer: 'Yes, using bisect_left for first occurrence and bisect_right - 1 for last occurrence.'
      }
    ]
  }
];

export const getVariantSampleCSV = (expNo = 1) => {
  return `question_code,title,aim,language,max_marks,reference_algorithm,solution_code
EX${expNo}_VAR_A,"Binary Search on Float Array","Binary search with epsilon threshold on float list.","python",100,"1. Init low and high.\\n2. Compare with precision 1e-6.\\n3. Return index.","def solution():\\n    pass"
EX${expNo}_VAR_B,"First and Last Occurrence Search","Find first and last indices of target in sorted array.","python",100,"1. First search for leftmost.\\n2. Second search for rightmost.\\n3. Output pair.","def solution():\\n    pass"`;
};

// ============================================================
// CSV PARSER UTILITY (RFC 4180 Compliant)
// ============================================================
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let field = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r') {
        // ignore CR
      } else if (char === '\n') {
        row.push(field);
        lines.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    lines.push(row);
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.trim().toLowerCase());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const r = lines[i];
    if (r.length === 1 && !r[0].trim()) continue; // skip blank rows
    const item = {};
    headers.forEach((h, idx) => {
      item[h] = r[idx] !== undefined ? r[idx].trim() : '';
    });
    results.push(item);
  }

  return results;
}

export default function LabBulkModal({
  isOpen,
  onClose,
  mode = 'experiments', // 'experiments' | 'variants'
  targetId, // courseId for experiments, expId for variants
  targetMetadata = {}, // { courseCode, expNo, title }
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [pasteFormat, setPasteFormat] = useState('json'); // 'json' | 'csv'
  const [pasteContent, setPasteContent] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const isExp = mode === 'experiments';

  // Download Sample JSON
  const handleDownloadJSON = () => {
    const data = isExp
      ? getExperimentSampleJSON(targetMetadata?.courseCode)
      : getVariantSampleJSON(targetMetadata?.expNo || 1);
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', jsonStr);
    a.setAttribute(
      'download',
      isExp ? `lab_experiments_template.json` : `exp_${targetMetadata?.expNo || 1}_variants_template.json`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Download Sample CSV
  const handleDownloadCSV = () => {
    const csvStr = isExp
      ? getExperimentSampleCSV()
      : getVariantSampleCSV(targetMetadata?.expNo || 1);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute(
      'download',
      isExp ? `lab_experiments_template.csv` : `exp_${targetMetadata?.expNo || 1}_variants_template.csv`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Validate and parse raw items
  const validateAndSetItems = (rawList) => {
    setErrorMsg('');
    if (!Array.isArray(rawList) || rawList.length === 0) {
      setErrorMsg('No valid records found in the uploaded file or text.');
      setParsedItems([]);
      return;
    }

    const processed = rawList.map((item, idx) => {
      const errs = [];
      if (!item.title || !item.title.trim()) {
        errs.push('Title is required');
      }
      if (!item.aim || !item.aim.trim()) {
        errs.push('Aim is required');
      }

      if (isExp) {
        const expNo = Number(item.experiment_no) || (idx + 1);
        const marks = Number(item.max_marks) || 100;
        return {
          experiment_no: expNo,
          language: item.language?.trim() || 'python',
          title: item.title?.trim() || '',
          aim: item.aim?.trim() || '',
          max_marks: marks,
          _errors: errs,
          _valid: errs.length === 0,
        };
      } else {
        const qCode = item.question_code?.trim() || `EX${targetMetadata?.expNo || 1}_VAR_${String.fromCharCode(65 + idx)}`;
        const marks = Number(item.max_marks) || 100;
        const vivaCount = Number(item.viva_questions_count) || 5;
        
        let vivaList = [];
        if (Array.isArray(item.viva_questions)) {
          vivaList = item.viva_questions;
        } else if (typeof item.viva_questions === 'string' && item.viva_questions.trim()) {
          try {
            vivaList = JSON.parse(item.viva_questions);
          } catch {
            vivaList = [];
          }
        }

        return {
          ...item,
          question_code: qCode,
          title: item.title?.trim() || '',
          aim: item.aim?.trim() || '',
          language: item.language || 'python',
          reference_algorithm: typeof item.reference_algorithm === 'object'
            ? JSON.stringify(item.reference_algorithm)
            : item.reference_algorithm || '',
          solution_code: item.solution_code || '',
          sample_test_cases: typeof item.sample_test_cases === 'object'
            ? JSON.stringify(item.sample_test_cases)
            : item.sample_test_cases || '[]',
          hidden_test_cases: typeof item.hidden_test_cases === 'object'
            ? JSON.stringify(item.hidden_test_cases)
            : item.hidden_test_cases || '[]',
          max_marks: marks,
          viva_questions_count: vivaCount,
          viva_questions: vivaList,
          _errors: errs,
          _valid: errs.length === 0,
        };
      }
    });

    setParsedItems(processed);
  };

  // Handle File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;
      if (!text) return;

      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(text);
          validateAndSetItems(Array.isArray(json) ? json : [json]);
        } catch (err) {
          setErrorMsg('Invalid JSON format: ' + err.message);
          setParsedItems([]);
        }
      } else if (file.name.endsWith('.csv')) {
        try {
          const csvData = parseCSV(text);
          validateAndSetItems(csvData);
        } catch (err) {
          setErrorMsg('Invalid CSV format: ' + err.message);
          setParsedItems([]);
        }
      } else {
        setErrorMsg('Please upload a valid .json or .csv file');
        setParsedItems([]);
      }
    };

    reader.readAsText(file);
  };

  // Auto-parse Direct Paste Content in real-time
  useEffect(() => {
    if (!isOpen || activeTab !== 'paste') return;
    if (!pasteContent.trim()) {
      setParsedItems([]);
      setErrorMsg('');
      return;
    }

    if (pasteFormat === 'json') {
      try {
        const json = JSON.parse(pasteContent);
        validateAndSetItems(Array.isArray(json) ? json : [json]);
      } catch (err) {
        setErrorMsg('Invalid JSON format: ' + err.message);
        setParsedItems([]);
      }
    } else {
      try {
        const csvData = parseCSV(pasteContent);
        validateAndSetItems(csvData);
      } catch (err) {
        setErrorMsg('Invalid CSV format: ' + err.message);
        setParsedItems([]);
      }
    }
  }, [pasteContent, pasteFormat, activeTab, isExp, isOpen]);

  // Submit Bulk Upload to Backend
  const handleSubmit = async () => {
    const validItems = parsedItems.filter((it) => it._valid);
    if (validItems.length === 0) {
      setErrorMsg('No valid records to upload. Please fix validation errors.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (isExp) {
        // Strip validation metadata
        const payload = validItems.map(({ _errors, _valid, ...rest }) => rest);
        const res = await api.post(`/admin/labs/courses/${targetId}/experiments/bulk`, payload);
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        const payload = validItems.map(({ _errors, _valid, ...rest }) => ({
          ...rest,
          experiment_id: Number(targetId || 0),
          course_id: Number(targetMetadata?.courseId || 0),
        }));
        const res = await api.post(`/admin/labs/experiments/${targetId}/variants/bulk`, payload);
        if (onSuccess) onSuccess(res);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to upload bulk records.');
    } finally {
      setSubmitting(false);
    }
  };

  const validCount = parsedItems.filter((i) => i._valid).length;
  const invalidCount = parsedItems.filter((i) => !i._valid).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
              {isExp ? <FlaskConical className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {isExp ? 'Bulk Upload Experiments' : 'Bulk Upload Question Variants'}
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  {isExp ? targetMetadata?.courseCode || 'COURSE' : `Exp ${targetMetadata?.expNo || 1}`}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {isExp
                  ? 'Batch import multiple curriculum experiments via JSON or CSV.'
                  : `Batch import problem variants, test cases, and oral viva questions for "${targetMetadata?.title || 'Experiment'}".`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Template Downloaders */}
        <div className="px-6 py-3 bg-[var(--bg-card)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] font-medium">Download sample template:</span>
            <button
              onClick={handleDownloadJSON}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:text-[var(--accent)] transition font-mono font-bold cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-[var(--accent)]" />
              Sample JSON
            </button>
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:text-[var(--accent)] transition font-mono font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Sample CSV
            </button>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center bg-[var(--bg-input)] p-0.5 rounded-lg border border-[var(--border)]">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              File Upload
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold transition cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Direct Paste
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Tab 1: File Upload */}
          {activeTab === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]/20 rounded-[var(--radius-md)] p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 bg-[var(--bg-raised)]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-sm">
                <FileUp className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  Click to browse or drag & drop .JSON or .CSV file
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Supports UTF-8 formatted templates with schema validation
                </p>
              </div>
              {fileName && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-mono font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Loaded: {fileName}
                </span>
              )}
            </div>
          )}

          {/* Tab 2: Direct Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-secondary)] font-medium">Input Format:</span>
                  <button
                    onClick={() => setPasteFormat('json')}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition cursor-pointer ${
                      pasteFormat === 'json'
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] border-[var(--border)]'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setPasteFormat('csv')}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition cursor-pointer ${
                      pasteFormat === 'csv'
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] border-[var(--border)]'
                    }`}
                  >
                    CSV
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Auto-parsing</span>
                </div>
              </div>

              <textarea
                rows={7}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder={
                  pasteFormat === 'json'
                    ? 'Paste your JSON array here (e.g. [{"title": "...", "aim": "..."}])'
                    : 'Paste your CSV rows here (with header row)'
                }
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] leading-relaxed"
              />
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Items Live Preview Table */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-primary)]">Parsed Records:</span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--bg-raised)] border border-[var(--border)] font-mono text-[var(--text-secondary)]">
                    Total: {parsedItems.length}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono font-bold">
                    Valid: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/30 font-mono font-bold">
                      Errors: {invalidCount}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setParsedItems([])}
                  className="text-[var(--text-muted)] hover:text-[var(--red)] flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>

              <div className="border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-raised)] text-[var(--text-muted)] font-mono uppercase tracking-wider text-[10px] sticky top-0 border-b border-[var(--border)] z-10">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">{isExp ? 'Exp No' : 'Code'}</th>
                      <th className="p-2.5">Title & Aim</th>
                      <th className="p-2.5">Language</th>
                      <th className="p-2.5">Marks</th>
                      {!isExp && <th className="p-2.5">Vivas</th>}
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {parsedItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-[var(--bg-hover)] transition ${
                          !item._valid ? 'bg-[var(--red-bg)]/20' : ''
                        }`}
                      >
                        <td className="p-2.5 font-mono text-[var(--text-muted)]">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-[var(--text-primary)]">
                          {isExp ? `Exp ${item.experiment_no}` : item.question_code}
                        </td>
                        <td className="p-2.5 max-w-[280px]">
                          <div className="font-semibold text-[var(--text-primary)] truncate">{item.title || '(No Title)'}</div>
                          <div className="text-[11px] text-[var(--text-muted)] truncate">{item.aim || '(No Aim)'}</div>
                        </td>
                        <td className="p-2.5 font-mono uppercase text-[11px] text-[var(--text-secondary)]">
                          {item.language || 'python'}
                        </td>
                        <td className="p-2.5 font-mono text-[var(--text-secondary)]">
                          {item.max_marks || 100}
                        </td>
                        {!isExp && (
                          <td className="p-2.5 font-mono text-[11px] text-[var(--accent)]">
                            {item.viva_questions?.length || 0} Qs
                          </td>
                        )}
                        <td className="p-2.5 text-right">
                          {item._valid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--red-bg)] text-[var(--red)] text-[10px] font-bold"
                              title={item._errors?.join(', ')}
                            >
                              <AlertCircle className="w-3 h-3" />
                              {item._errors?.[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between">
          <div className="text-xs text-[var(--text-muted)]">
            {parsedItems.length > 0 ? (
              <span>
                Ready to commit <strong>{validCount}</strong> valid {isExp ? 'experiments' : 'variants'}
              </span>
            ) : (
              <span>Upload or paste records to preview</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={validCount === 0 || submitting}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-sm)] text-xs font-bold text-white transition shadow-sm cursor-pointer ${
                validCount > 0 && !submitting
                  ? 'bg-[var(--accent)] hover:opacity-90'
                  : 'bg-[var(--text-muted)]/40 cursor-not-allowed opacity-60'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Import {validCount} {isExp ? 'Experiments' : 'Variants'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
