import { EditorView } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';

/**
 * EditorManager handles the reuse of CodeMirror instances to prevent 
 * expensive re-initialization during tab switches.
 */
class EditorManager {
  private static instance: EditorManager;
  private pool: EditorView[] = [];
  private inUse = new Set<EditorView>();

  private constructor() {}

  static getInstance(): EditorManager {
    if (!EditorManager.instance) {
      EditorManager.instance = new EditorManager();
    }
    return EditorManager.instance;
  }

  /**
   * Acquires an editor instance from the pool or creates a new one.
   */
  acquire(parent: HTMLElement, doc: string, extensions: Extension[]): EditorView {
    let view: EditorView;

    if (this.pool.length > 0) {
      view = this.pool.pop()!;
      // Reconfigure the editor with new state
      view.setState(EditorState.create({
        doc,
        extensions
      }));
      parent.appendChild(view.dom);
    } else {
      view = new EditorView({
        state: EditorState.create({
          doc,
          extensions
        }),
        parent
      });
    }

    this.inUse.add(view);
    return view;
  }

  /**
   * Releases an editor instance back to the pool.
   */
  release(view: EditorView) {
    if (this.inUse.has(view)) {
      this.inUse.delete(view);
      // Detach from DOM
      view.dom.remove();
      this.pool.push(view);
    }
  }
}

export const editorManager = EditorManager.getInstance();
