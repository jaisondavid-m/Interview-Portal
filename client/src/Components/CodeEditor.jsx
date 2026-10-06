import React, { useMemo, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { Copy, Check } from 'lucide-react';

const LANGUAGE_CONFIGS = [
  { id: 'c', label: 'C (GCC / Clang)', extension: () => cpp() },
  { id: 'cpp', label: 'C++ (g++ 17)', extension: () => cpp() },
  { id: 'javascript', label: 'JavaScript (Node.js)', extension: () => javascript({ jsx: true }) },
  { id: 'python', label: 'Python 3', extension: () => python() },
  { id: 'java', label: 'Java (OpenJDK 17)', extension: () => java() },
  { id: 'go', label: 'Go (Golang)', extension: () => cpp() },
];

export default function CodeEditor({
  code = '',
  onChange,
  language = 'javascript',
  onLanguageChange,
  isEditable = true,
  isLanguageLocked = false,
  allowCopyPaste = true,
  onCopyPasteBlocked,
}) {
  const [copied, setCopied] = React.useState(false);
  const editorWrapperRef = useRef(null);

  // Student interview editor starts empty with no starter template
  const displayCode = typeof code === 'string' ? code : '';

  const selectedExtension = useMemo(() => {
    const langObj = LANGUAGE_CONFIGS.find((l) => l.id === language);
    return langObj ? [langObj.extension()] : [javascript()];
  }, [language]);

  // Restrict copy, paste, cut, drop, and right-click in exam mode
  useEffect(() => {
    if (allowCopyPaste) return;
    const el = editorWrapperRef.current;
    if (!el) return;

    const blockEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onCopyPasteBlocked) onCopyPasteBlocked();
    };

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      // Block Ctrl/Cmd + C, V, X, Insert, Shift+Insert
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'insert'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        if (onCopyPasteBlocked) onCopyPasteBlocked();
      } else if (e.shiftKey && key === 'insert') {
        e.preventDefault();
        e.stopPropagation();
        if (onCopyPasteBlocked) onCopyPasteBlocked();
      }
    };

    // Attach in capture phase to intercept before CodeMirror internal keymap
    el.addEventListener('paste', blockEvent, true);
    el.addEventListener('copy', blockEvent, true);
    el.addEventListener('cut', blockEvent, true);
    el.addEventListener('drop', blockEvent, true);
    el.addEventListener('contextmenu', blockEvent, true);
    el.addEventListener('keydown', handleKeyDown, true);

    return () => {
      el.removeEventListener('paste', blockEvent, true);
      el.removeEventListener('copy', blockEvent, true);
      el.removeEventListener('cut', blockEvent, true);
      el.removeEventListener('drop', blockEvent, true);
      el.removeEventListener('contextmenu', blockEvent, true);
      el.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [allowCopyPaste, onCopyPasteBlocked]);

  const handleCopy = () => {
    if (!allowCopyPaste) return;
    navigator.clipboard.writeText(displayCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCodeChange = (val) => {
    if (!isEditable || !onChange) return;
    onChange(val);
  };

  return (
    <div className="flex flex-col h-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[#282c34] overflow-hidden shadow-[var(--shadow-sm)]">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-[#181a1f] text-xs select-none">
        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
            disabled={!isEditable || isLanguageLocked}
            className={`bg-[#282c34] text-gray-300 text-[11px] font-mono rounded px-2.5 py-1 border border-[#3e4451] focus:outline-none focus:border-[var(--accent)] ${
              !isEditable || isLanguageLocked ? 'opacity-85 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {LANGUAGE_CONFIGS.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-2">
          {allowCopyPaste && (
            <button
              onClick={handleCopy}
              title="Copy code to clipboard"
              className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-[#3e4451] transition flex items-center gap-1 text-[10px] font-mono cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* CodeMirror Workspace */}
      <div ref={editorWrapperRef} className="flex-1 overflow-auto relative">
        <CodeMirror
          value={displayCode}
          height="100%"
          minHeight="320px"
          theme={oneDark}
          extensions={selectedExtension}
          readOnly={!isEditable}
          editable={isEditable}
          onChange={handleCodeChange}
          placeholder="// Type your code here..."
          className="text-[13px] font-mono h-full"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />

        {!isEditable && (
          <div className="absolute bottom-2 right-3 pointer-events-none bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-mono text-gray-300 flex items-center gap-1.5 border border-white/10">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Read-only stream for assessor</span>
          </div>
        )}
      </div>
    </div>
  );
}
