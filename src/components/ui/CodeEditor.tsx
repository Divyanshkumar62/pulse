import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'json';
  height?: string;
  placeholder?: string;
}

export default function CodeEditor({ value, onChange, language = 'javascript', height = '100%', placeholder }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        foldGutter(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        highlightSelectionMatches(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...closeBracketsKeymap,
          ...searchKeymap,
          ...lintKeymap,
        ]),
        language === 'javascript' ? javascript() : [],
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": { 
            height, 
            fontSize: "13px", 
            fontFamily: "var(--font-mono)",
            background: "transparent !important",
          },
          ".cm-gutters": {
            backgroundColor: "transparent !important",
            border: "none !important",
            color: "var(--text-tertiary)",
          },
          ".cm-content": {
              caretColor: "var(--accent-primary)",
          },
          ".cm-activeLine": {
              backgroundColor: "rgba(0, 112, 243, 0.05) !important",
          },
          ".cm-activeLineGutter": {
              backgroundColor: "rgba(0, 112, 243, 0.1) !important",
              color: "var(--accent-primary)",
          }
        })
      ]
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current
    });
    
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external changes
  useEffect(() => {
    if (viewRef.current) {
        const currentDoc = viewRef.current.state.doc.toString();
        if (currentDoc !== value) {
            viewRef.current.dispatch({
                changes: { from: 0, to: currentDoc.length, insert: value }
            });
        }
    }
  }, [value]);

  return (
    <div 
      className="pulse-code-editor glass-panel" 
      style={{ 
        height: '100%', 
        overflow: 'hidden', 
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div ref={containerRef} style={{ height: '100%' }} />
    </div>
  );
}
