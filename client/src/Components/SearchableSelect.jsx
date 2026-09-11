import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

/**
 * SearchableSelect - A modern searchable dropdown component.
 *
 * @param {Array} options - List of options: [{ value, label, badge, icon }, ...] or strings.
 * @param {string|number} value - Currently selected value.
 * @param {Function} onChange - Callback when selected value changes: (val) => void.
 * @param {string} placeholder - Placeholder text when nothing is selected.
 * @param {string} searchPlaceholder - Placeholder text for the search input in the menu.
 * @param {string} label - Optional prefix label (e.g., 'Dept:').
 * @param {React.ReactNode} icon - Optional icon to render inside the trigger button.
 * @param {boolean} clearable - Whether to show a clear button when an option is selected.
 * @param {string} className - Additional CSS classes for trigger button.
 * @param {string} menuWidth - Width class for the dropdown menu (e.g. 'w-64').
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  label,
  icon: TriggerIcon,
  clearable = false,
  className = '',
  menuWidth = 'w-64 sm:w-72',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to [{ value, label, badge }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value,
        label: opt.label || String(opt.value),
        badge: opt.badge,
        icon: opt.icon,
      };
    }
    return { value: opt, label: String(opt) };
  });

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find currently selected item
  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value).toLowerCase() === String(value).toLowerCase()
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
      setHighlightedIndex(0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    }
  };

  const handleSelect = (optionValue) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    // Revert to 'ALL' if present or null
    const hasAll = normalizedOptions.some((o) => o.value === 'ALL');
    onChange?.(hasAll ? 'ALL' : '');
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block text-left"
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] border transition-all duration-150 select-none ${
          isOpen
            ? 'bg-[var(--bg-card)] border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-dim)] text-[var(--text-primary)]'
            : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
        } ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {TriggerIcon && (
            <span className="text-[var(--accent)] shrink-0">
              <TriggerIcon className="w-3.5 h-3.5" />
            </span>
          )}
          {label && (
            <span className="text-[var(--text-secondary)] font-normal shrink-0">
              {label}
            </span>
          )}
          <span className="truncate font-semibold text-[var(--text-primary)]">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {clearable && value && value !== 'ALL' && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              title="Clear selection"
              className="p-0.5 rounded hover:bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[var(--accent)]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 mt-1.5 ${menuWidth} bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-50 overflow-hidden animate-slide-up origin-top-left`}
        >
          {/* Search Header inside Dropdown */}
          <div className="p-2 border-b border-[var(--border)] bg-[var(--bg-raised)]">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1 text-[12px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1 divide-y divide-transparent text-[12px] custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-5 px-4 text-center text-[var(--text-muted)] text-[12px]">
                No options found for "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  String(opt.value).toLowerCase() === String(value).toLowerCase();
                const isHighlighted = highlightedIndex === idx;

                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                        : isHighlighted
                        ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
