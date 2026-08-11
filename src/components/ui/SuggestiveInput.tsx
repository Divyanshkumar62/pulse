import React, { useState, useRef, useEffect } from 'react';

export interface SuggestionItem {
  label: string;
  description?: string;
}

interface SuggestiveInputProps {
  value: string;
  onChange: (value: string) => void;
  getSuggestions: (input: string) => SuggestionItem[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  type?: string;
  disabled?: boolean;
}

export default function SuggestiveInput({
  value,
  onChange,
  getSuggestions,
  placeholder,
  className,
  style,
  type = 'text',
  disabled = false,
}: SuggestiveInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const suggestions = getSuggestions(value);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const activeEl = menuRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const handleSelect = (item: SuggestionItem) => {
    onChange(item.label);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', display: 'flex', flex: 1 }}>
      <input
        ref={inputRef}
        type={type}
        className={className}
        style={style}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {isOpen && suggestions.length > 0 && !disabled && (
        <div
          ref={menuRef}
          className="suggestive-menu-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 10000,
            padding: '4px 0',
          }}
        >
          {suggestions.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={`${item.label}-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  backgroundColor: isActive ? '#1e293b' : 'transparent',
                  borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                  transition: 'background-color 0.1s ease',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isActive ? '#38bdf8' : '#f8fafc',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {item.label}
                </span>
                {item.description && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.description}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
