import { KeyValuePair } from '../../types';
import '../../styles/components/key-value-table.css';

interface KeyValueTableProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueTable({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: KeyValueTableProps) {
  const displayItems = items.length === 0 ? [{ key: '', value: '', enabled: true }] : items;
  
  const handleChange = (index: number, field: string, value: string | boolean) => {
    const newItems = [...displayItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (index === displayItems.length - 1 && typeof value === 'string' && value.length > 0) {
      newItems.push({ key: '', value: '', enabled: true });
    }
    
    const cleanItems = newItems.filter((item, i) => {
      if (i === newItems.length - 1) return true;
      return item.key || item.value;
    });
    
    onChange(cleanItems);
  };

  const handleDelete = (index: number) => {
    let newItems = displayItems.filter((_, i) => i !== index);
    if (newItems.length === 0) newItems = [{ key: '', value: '', enabled: true }];
    onChange(newItems);
  };

  return (
    <div className="kv-table">
      {displayItems.map((item, index) => (
        <div key={index} className="kv-row">
          <div className="kv-check-wrapper">
            <input 
              type="checkbox" 
              className="kv-checkbox"
              checked={item.enabled !== false} 
              onChange={(e) => handleChange(index, 'enabled', e.target.checked)}
            />
          </div>
          <div className="kv-input-group">
            <input
              className="kv-input mono"
              placeholder={keyPlaceholder}
              value={item.key || ''}
              onChange={(e) => handleChange(index, 'key', e.target.value)}
            />
            <input
              className="kv-input mono"
              placeholder={valuePlaceholder}
              value={item.value || ''}
              onChange={(e) => handleChange(index, 'value', e.target.value)}
            />
            <input
              className="kv-input"
              placeholder="Description"
              value={item.description || ''}
              onChange={(e) => handleChange(index, 'description', e.target.value)}
            />
          </div>
          <button 
            className="kv-delete-btn"
            style={{ visibility: (item.key || item.value) ? 'visible' : 'hidden' }}
            onClick={() => handleDelete(index)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
