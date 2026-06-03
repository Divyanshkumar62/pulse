import React, { useMemo, useState } from 'react';
import { HttpResponse } from '../../types';
import { Columns, LayoutList } from 'lucide-react';

interface DiffLine {
  type: 'added' | 'removed' | 'equal';
  content: string;
}

function simpleDiff(oldStr: string, newStr: string): DiffLine[] {
  let oldLines: string[];
  let newLines: string[];
  
  try {
    oldLines = JSON.stringify(JSON.parse(oldStr), null, 2).split('\n');
  } catch {
    oldLines = oldStr.split('\n');
  }
  
  try {
    newLines = JSON.stringify(JSON.parse(newStr), null, 2).split('\n');
  } catch {
    newLines = newStr.split('\n');
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  const lookahead = 20; 

  while (i < oldLines.length && j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: 'equal', content: oldLines[i] });
      i++;
      j++;
    } else {
      let foundInNew = -1;
      for (let k = 1; k <= lookahead && j + k < newLines.length; k++) {
        if (oldLines[i] === newLines[j + k]) {
          foundInNew = k;
          break;
        }
      }

      let foundInOld = -1;
      for (let k = 1; k <= lookahead && i + k < oldLines.length; k++) {
        if (oldLines[i + k] === newLines[j]) {
          foundInOld = k;
          break;
        }
      }

      if (foundInNew !== -1 && (foundInOld === -1 || foundInNew <= foundInOld)) {
        for (let k = 0; k < foundInNew; k++) {
          result.push({ type: 'added', content: newLines[j++] });
        }
      } else if (foundInOld !== -1) {
        for (let k = 0; k < foundInOld; k++) {
          result.push({ type: 'removed', content: oldLines[i++] });
        }
      } else {
        result.push({ type: 'removed', content: oldLines[i++] });
        result.push({ type: 'added', content: newLines[j++] });
      }
    }
  }

  while (i < oldLines.length) {
    result.push({ type: 'removed', content: oldLines[i++] });
  }
  while (j < newLines.length) {
    result.push({ type: 'added', content: newLines[j++] });
  }

  return result;
}

interface ResponseDiffProps {
  currentResponse: HttpResponse;
  previousResponse: HttpResponse | null;
}

export default function ResponseDiff({ currentResponse, previousResponse }: ResponseDiffProps) {
  const [isSideBySide, setIsSideBySide] = useState(true);

  const diffLines = useMemo(() => {
    if (!previousResponse) return [];
    return simpleDiff(previousResponse.body, currentResponse.body);
  }, [currentResponse, previousResponse]);

  if (!previousResponse) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', padding: '24px', textAlign: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🕰️</div>
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>No History Found</h3>
        <p style={{ margin: 0, maxWidth: '300px' }}>This is the first response recorded for this request. Send it again to compare changes.</p>
      </div>
    );
  }

  if (diffLines.length === 0 || diffLines.every(l => l.type === 'equal')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--status-success)', padding: '24px', textAlign: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
        <h3 style={{ margin: '0 0 8px 0' }}>Responses Match Perfectly</h3>
        <p style={{ margin: 0, color: 'var(--text-tertiary)' }}>No regressions detected compared to the previous response.</p>
      </div>
    );
  }

  const leftLines: (DiffLine | null)[] = [];
  const rightLines: (DiffLine | null)[] = [];

  if (isSideBySide) {
    let i = 0;
    while (i < diffLines.length) {
      const current = diffLines[i];
      if (current.type === 'equal') {
        leftLines.push(current);
        rightLines.push(current);
        i++;
      } else if (current.type === 'removed') {
        if (i + 1 < diffLines.length && diffLines[i + 1].type === 'added') {
          leftLines.push(current);
          rightLines.push(diffLines[i + 1]);
          i += 2;
        } else {
          leftLines.push(current);
          rightLines.push(null);
          i++;
        }
      } else if (current.type === 'added') {
        leftLines.push(null);
        rightLines.push(current);
        i++;
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#f85149', borderRadius: '2px' }}></span>
            Previous Response
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#3fb950', borderRadius: '2px' }}></span>
            Current Response
          </div>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)', padding: '2px' }}>
          <button 
            onClick={() => setIsSideBySide(false)}
            style={{ 
              padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
              background: !isSideBySide ? 'var(--bg-surface)' : 'transparent',
              color: !isSideBySide ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600
            }}
          >
            <LayoutList size={14} />
            Unified
          </button>
          <button 
            onClick={() => setIsSideBySide(true)}
            style={{ 
              padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
              background: isSideBySide ? 'var(--bg-surface)' : 'transparent',
              color: isSideBySide ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600
            }}
          >
            <Columns size={14} />
            Split
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-deep)' }}>
        {isSideBySide ? (
          <div style={{ display: 'flex', minWidth: '100%', minHeight: '100%' }}>
            <div style={{ flex: 1, borderRight: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6', padding: '12px 0' }}>
                {leftLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', width: '100%', background: line?.type === 'removed' ? 'rgba(248,81,70,0.15)' : 'transparent', opacity: line ? 1 : 0.2, minHeight: '1.6em' }}>
                    <span style={{ width: '35px', textAlign: 'right', paddingRight: '8px', color: 'var(--text-tertiary)', userSelect: 'none', opacity: 0.4 }}>{line ? idx + 1 : ''}</span>
                    <pre style={{ margin: 0, padding: '0 8px', whiteSpace: 'pre-wrap', color: line?.type === 'removed' ? '#ffdcd7' : '#c9d1d9', flex: 1 }}>{line?.content || (line === null ? '' : ' ')}</pre>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6', padding: '12px 0' }}>
                {rightLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', width: '100%', background: line?.type === 'added' ? 'rgba(46,160,67,0.15)' : 'transparent', opacity: line ? 1 : 0.2, minHeight: '1.6em' }}>
                    <span style={{ width: '35px', textAlign: 'right', paddingRight: '8px', color: 'var(--text-tertiary)', userSelect: 'none', opacity: 0.4 }}>{line ? idx + 1 : ''}</span>
                    <pre style={{ margin: 0, padding: '0 8px', whiteSpace: 'pre-wrap', color: line?.type === 'added' ? '#aff5b4' : '#c9d1d9', flex: 1 }}>{line?.content || (line === null ? '' : ' ')}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: '1.6', padding: '12px 0' }}>
            {diffLines.map((line, idx) => (
              <div key={idx} style={{ display: 'flex', width: '100%', background: line.type === 'added' ? 'rgba(46,160,67,0.15)' : line.type === 'removed' ? 'rgba(248,81,70,0.15)' : 'transparent', borderLeft: `3px solid ${line.type === 'added' ? '#2ea043' : line.type === 'removed' ? '#f85149' : 'transparent'}` }}>
                <span style={{ width: '40px', textAlign: 'right', paddingRight: '12px', color: 'var(--text-tertiary)', userSelect: 'none', opacity: 0.5 }}>{idx + 1}</span>
                <span style={{ width: '20px', textAlign: 'center', color: line.type === 'added' ? '#3fb950' : line.type === 'removed' ? '#f85149' : 'var(--text-tertiary)' }}>{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
                <pre style={{ margin: 0, padding: '0 12px', whiteSpace: 'pre-wrap', color: line.type === 'added' ? '#aff5b4' : line.type === 'removed' ? '#ffdcd7' : '#c9d1d9' }}>{line.content || ' '}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
