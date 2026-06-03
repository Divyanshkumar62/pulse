import { KeyValuePair } from '../../types';
import '../../styles/components/key-value-table.css';
import { Shield, ShieldOff } from 'lucide-react';

interface KeyValueTableProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  usages?: Record<string, number>;
}

export default function KeyValueTable({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value', usages }: KeyValueTableProps) {
  // Always ensure there is at least one empty row at the end if the last row is filled
  const displayItems = [...items];
  const lastItem = displayItems[displayItems.length - 1];
  
  if (!lastItem || lastItem.key || lastItem.value) {
    displayItems.push({ key: '', value: '', enabled: true });
  }
  
  const handleChange = (index: number, field: string, value: string | boolean) => {
    const newItems = [...displayItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Filter out rows that are empty and NOT the last row
    const cleanItems = newItems.filter((item, i) => {
      // Keep if it has data
      if (item.key || item.value) return true;
      // Keep only one empty row at the very end
      if (i === newItems.length - 1) return true;
      return false;
    });
    
    // We only send items with data or the very last empty row to the parent
    // but the parent might want to filter the final empty row before saving.
    onChange(cleanItems);
  };

  const handleDelete = (index: number) => {
    const newItems = displayItems.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="kv-table">
      {displayItems.map((item, index) => {
        const usageCount = (usages && item.key) ? usages[item.key] : undefined;
        return (
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
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <input
                className="kv-input mono"
                placeholder={valuePlaceholder}
                type={item.secret ? 'password' : 'text'}
                value={item.value || ''}
                onChange={(e) => handleChange(index, 'value', e.target.value)}
                style={{ width: '100%', paddingRight: '24px' }}
                />
                <button 
                    onClick={() => handleChange(index, 'secret', !item.secret)}
                    style={{ 
                        position: 'absolute', right: '4px', background: 'none', border: 'none', 
                        padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        color: item.secret ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                        opacity: (item.key || item.value) ? 1 : 0.2
                    }}
                    title={item.secret ? "Unmask Secret" : "Mark as Secret"}
                >
                    {item.secret ? <Shield size={12} strokeWidth={2.5} /> : <ShieldOff size={12} strokeWidth={2.5} />}
                </button>
            </div>
            <input
              className="kv-input"
              placeholder="Description"
              value={item.description || ''}
              onChange={(e) => handleChange(index, 'description', e.target.value)}
            />
          </div>
          
          {usageCount !== undefined && (
            <div 
              title={`${usageCount} requests use this variable`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: usageCount > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                background: usageCount > 0 ? 'rgba(0, 112, 243, 0.1)' : 'var(--bg-elevated)',
                padding: '2px 8px',
                borderRadius: '12px',
                minWidth: '24px',
                marginLeft: '8px'
              }}
            >
              {usageCount}
            </div>
          )}
          
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
      )})}
    </div>
  );
}
