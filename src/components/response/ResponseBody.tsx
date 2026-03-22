import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';

export default function ResponseBody({ content, contentType }: { content: string, contentType: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

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

    const startState = EditorState.create({
      doc: displayContent,
      extensions: [
        lineNumbers(),
        lang,
        oneDark,
        EditorState.readOnly.of(true),
        EditorView.theme({
          "&": { height: "100%", fontSize: "12px", fontFamily: "var(--font-mono)" },
        })
      ]
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
  }, [content, contentType]);

  return <div ref={editorRef} style={{ height: '100%', overflow: 'hidden', borderRadius: '4px' }} />;
}
