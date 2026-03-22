import { KeyValuePair } from '../../types';

interface KeyValueTableProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueTable({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: KeyValueTableProps) {
  // Ensure we always have at least one empty row to type into
  const displayItems = items.length === 0 ? [{ key: '', value: '' }] : items;
  
  const handleChange = (index: number, field: string, value: string | boolean) => {
    const newItems = [...displayItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-add new row if we're typing in the last row
    if (index === displayItems.length - 1 && typeof value === 'string' && value.length > 0) {
      newItems.push({ key: '', value: '' });
    }
    
    // Filter out completely empty rows unless it's the last one
    const cleanItems = newItems.filter((item, i) => {
      if (i === newItems.length - 1) return true;
      return item.key || item.value || item.description;
    });
    
    onChange(cleanItems.filter(item => item.key || item.value || item.description));
  };

  const handleDelete = (index: number) => {
    let newItems = displayItems.filter((_, i) => i !== index);
    if (newItems.length === 0) newItems = [];
    onChange(newItems);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {displayItems.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={item.enabled !== false} 
            onChange={(e) => handleChange(index, 'enabled', e.target.checked)}
            style={{ accentColor: 'var(--accent-primary)', width: '14px', height: '14px' }}
          />
          <input
            style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
            placeholder={keyPlaceholder}
            value={item.key || ''}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
          />
          <input
            style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
            placeholder={valuePlaceholder}
            value={item.value || ''}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
          />
          <input
            style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
            placeholder="Description"
            value={item.description || ''}
            onChange={(e) => handleChange(index, 'description', e.target.value)}
          />
          <button 
            style={{ background: 'transparent', color: 'var(--text-tertiary)', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', visibility: (item.key || item.value) ? 'visible' : 'hidden' }}
            onClick={() => handleDelete(index)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
