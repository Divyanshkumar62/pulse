import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { foldGutter, codeFolding, foldKeymap } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { WrapText } from 'lucide-react';

export default function ResponseBody({ content, contentType }: { content: string, contentType: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isLineWrapped, setIsLineWrapped] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    let lang = json();
    if (contentType.includes('xml') || contentType.includes('html')) {
      lang = xml();
    }

    // Try to prettify JSON
    let displayContent = content;
    if (contentType.includes('json')) {
      try {
        displayContent = JSON.stringify(JSON.parse(content), null, 2);
      } catch (e) { /* ignore */ }
    }

    const extensions = [
      lineNumbers(),
      foldGutter(),
      codeFolding(),
      keymap.of(foldKeymap),
      lang,
      oneDark,
      EditorState.readOnly.of(true),
      EditorView.theme({
        "&": { height: "100%", fontSize: "12px", fontFamily: "var(--font-mono)", backgroundColor: "#0b0f16 !important" },
        ".cm-gutters": { backgroundColor: "#0b0f16 !important", border: "none", color: "var(--text-tertiary)" },
        ".cm-activeLineGutter": { backgroundColor: "#0b0f16" },
        ".cm-activeLine": { backgroundColor: "#0b0f16" },
        ".cm-foldGutter .cm-gutterElement": { cursor: "pointer", color: "var(--text-tertiary)" },
        ".cm-foldGutter .cm-gutterElement:hover": { color: "var(--accent-primary)" }
      })
    ];

    if (isLineWrapped) {
      extensions.push(EditorView.lineWrapping);
    }

    const startState = EditorState.create({
      doc: displayContent,
      extensions
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    });
    
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [content, contentType, isLineWrapped]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div 
        className="response-body-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid var(--border-subtle)',
          gap: '8px'
        }}
      >
        <button
          onClick={() => setIsLineWrapped(!isLineWrapped)}
          title={isLineWrapped ? "Disable line wrapping" : "Enable line wrapping"}
          style={{
            background: isLineWrapped ? 'var(--accent-subtle)' : 'transparent',
            border: '1px solid ' + (isLineWrapped ? 'var(--accent-primary)' : 'var(--border-subtle)'),
            color: isLineWrapped ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            borderRadius: '4px',
            padding: '3px 6px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <WrapText size={13} />
          <span>Wrap</span>
        </button>
      </div>
      <div ref={editorRef} style={{ flex: 1, overflow: 'hidden', borderRadius: '0 0 4px 4px', backgroundColor: '#0b0f16' }} />
    </div>
  );
}
