import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  name?: string;
  value?: string | number;
  onChange?: (e: any) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export default function CustomSelect({ name, value, onChange, options, children, className = 'form-select', style, disabled }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const finalOptions: SelectOption[] = options ? [...options] : [];
  if (!options && children) {
    const childrenArray = React.Children.toArray(children);
    
    const extractOptions = (nodes: any[]) => {
      nodes.forEach(child => {
        if (!React.isValidElement(child)) return;
        
        if (child.type === 'option') {
          finalOptions.push({
             value: String((child as any).props.value ?? ''),
             label: String((child as any).props.children)
          });
        } else if (child.type === React.Fragment) {
          extractOptions(React.Children.toArray((child as any).props.children));
        }
      });
    };
    
    extractOptions(childrenArray);
  }

  const stringValue = String(value ?? '');
  const selectedOption = finalOptions.find(o => String(o.value) === stringValue) || finalOptions[0];

  const handleSelect = (val: string) => {
    if (onChange) {
      onChange({ target: { name, value: val } } as any);
    }
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      style={{ position: 'relative', width: '100%', minWidth: '120px', ...style }} 
      className={className ? className.replace('form-select', '') : ''} // Remove form-select from container, apply to trigger
    >
      <div 
        className={`form-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className.includes('form-select') ? '' : className}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isOpen ? 'var(--bg-input-focus)' : 'var(--bg-input)',
          borderColor: isOpen ? 'var(--accent-blue)' : 'var(--border-color)',
          boxShadow: isOpen ? '0 0 0 4px rgba(59, 130, 246, 0.15)' : 'none',
          paddingRight: '12px',
          backgroundImage: 'none',
          userSelect: 'none',
          height: '100%',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption?.label || value}
        </span>
        <Icons.ChevronDown 
          size={16} 
          style={{ 
            color: isOpen ? 'var(--accent-blue)' : 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'all 0.2s',
            flexShrink: 0,
            marginLeft: 8
          }} 
        />
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            maxHeight: '250px',
            overflowY: 'auto',
            padding: '6px'
          }}
        >
          {finalOptions.map((opt, i) => {
            const isSelected = String(opt.value) === stringValue;
            return (
              <div
                key={i}
                onClick={() => handleSelect(opt.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                  background: isSelected ? 'var(--bg-input-focus)' : 'transparent',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.9rem',
                  transition: 'background 0.15s ease',
                  marginBottom: i !== finalOptions.length - 1 ? 2 : 0
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
                {isSelected && <Icons.Check size={16} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
