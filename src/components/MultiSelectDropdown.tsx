import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectDropdownProps = {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
};

export function MultiSelectDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  emptyLabel = 'All',
}: MultiSelectDropdownProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.value.toLowerCase().includes(q) ||
        opt.label.toLowerCase().includes(q),
    );
  }, [options, query]);

  const triggerText = value.length
    ? value.length <= 3
      ? value.join(', ')
      : `${value.slice(0, 3).join(', ')} +${value.length - 3}`
    : emptyLabel;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    queueMicrotask(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle(code: string) {
    if (selectedSet.has(code)) {
      onChange(value.filter((v) => v !== code));
    } else {
      onChange([...value, code]);
    }
  }

  return (
    <div className="field-block multi-select" ref={rootRef}>
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        type="button"
        id={id}
        className={`multi-select-trigger ${!value.length ? 'is-empty' : ''}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
          if (open) setQuery('');
        }}
      >
        <span className="multi-select-value">{triggerText || placeholder}</span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div className="multi-select-panel" role="listbox" aria-multiselectable>
          <div className="multi-select-search">
            <Search size={14} strokeWidth={2} aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Search currencies"
              aria-label="Search currencies"
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="multi-select-toolbar">
            <button
              type="button"
              className="text-btn"
              disabled={disabled || !value.length}
              onClick={() => onChange([])}
            >
              Clear
            </button>
            <span className="muted">
              {value.length
                ? `${value.length} selected`
                : `${emptyLabel} (no filter)`}
            </span>
          </div>

          {value.length ? (
            <div className="multi-select-chips">
              {value.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="chip"
                  onClick={() => toggle(code)}
                  aria-label={`Remove ${code}`}
                >
                  {code}
                  <X size={12} strokeWidth={2} aria-hidden />
                </button>
              ))}
            </div>
          ) : null}

          <ul className="multi-select-options">
            {filtered.length ? (
              filtered.map((opt) => {
                const checked = selectedSet.has(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      className={`multi-select-option ${checked ? 'is-selected' : ''}`.trim()}
                      onClick={() => toggle(opt.value)}
                    >
                      <span
                        className={`multi-select-check ${checked ? 'on' : ''}`.trim()}
                        aria-hidden
                      >
                        {checked ? <Check size={12} strokeWidth={2.5} /> : null}
                      </span>
                      <span className="multi-select-option-label">
                        {opt.label}
                      </span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="multi-select-empty muted">No matches</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
