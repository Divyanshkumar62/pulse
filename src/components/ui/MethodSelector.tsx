import { useState, useEffect, useRef } from 'react';

export type MethodColorMap = Record<string, string>;

export const DEFAULT_METHOD_COLORS: MethodColorMap = {
  GET: 'var(--method-get)',
  POST: 'var(--method-post)',
  PUT: 'var(--method-put)',
  DELETE: 'var(--method-delete)',
  PATCH: 'var(--method-patch)',
  HEAD: 'var(--method-head)',
  OPTIONS: 'var(--method-options)',
  WS: '#10b981',
};

interface MethodSelectorProps {
  method: string;
  methods: string[];
  onChange: (method: any) => void;
  disabled?: boolean;
  colors?: MethodColorMap;
}

export default function MethodSelector({ 
  method, 
  methods, 
  onChange, 
  disabled, 
  colors = DEFAULT_METHOD_COLORS 
}: MethodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentColor = colors[method] || 'var(--accent-primary)';

  return (
    <div className="method-selector" ref={dropdownRef}>
      <button
        className="method-select-premium"
        style={{ color: currentColor }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {method}
      </button>
      <div className="method-chevron" style={{ color: currentColor }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      {isOpen && (
        <div className="method-dropdown-glass">
          {methods.map(m => (
            <button
              key={m}
              className={`method-dropdown-item ${method === m ? 'active' : ''}`}
              style={{ '--method-color': colors[m] } as React.CSSProperties}
              onClick={() => {
                onChange(m);
                setIsOpen(false);
              }}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
