import { useEffect, useRef, useMemo } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { editorManager } from './EditorManager';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'json';
  height?: string;
  placeholder?: string;
}

const customTheme = EditorView.theme({
  "&": { 
    height: "100%", 
    width: "100%",
    fontSize: "13px", 
    fontFamily: "var(--font-mono)",
    backgroundColor: "#0b0f16 !important",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-gutters": {
    backgroundColor: "#0b0f16 !important",
    border: "none !important",
    color: "var(--text-tertiary)",
    minWidth: "32px",
  },
  ".cm-content": {
    caretColor: "var(--accent-primary)",
    padding: "10px 0",
    width: "100%",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(0, 112, 243, 0.08) !important",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(0, 112, 243, 0.15) !important",
    color: "var(--accent-primary)",
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(0, 112, 243, 0.3) !important",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--accent-primary)",
  }
}, { dark: true });

export default function CodeEditor({ value, onChange, language = 'javascript', height = '100%', placeholder }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref updated to avoid re-initializing listener on every change
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const extensions = useMemo(() => [
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
    language === 'json' ? json() : javascript(),
    oneDark,
    customTheme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    }),
  ], [language]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Acquire an editor from the manager
    const view = editorManager.acquire(containerRef.current, value, extensions);
    viewRef.current = view;

    return () => {
      editorManager.release(view);
      viewRef.current = null;
    };
    // extensions is a dependency here because if it changes (e.g. language), we should re-acquire
    // actually, acquire will re-initialize the state anyway.
  }, [extensions]); // Re-acquire if language changes

  // Sync external changes (only if it's not the user typing)
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
        width: '100%',
        overflow: 'hidden', 
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        background: '#0b0f16',
      }}
    >
      <div ref={containerRef} style={{ height: '100%' }} />
    </div>
  );
}
