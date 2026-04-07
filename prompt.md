Role: Lead Frontend UX Architect. We are doing a precision pass on the Collection Tree's interactivity and empty states. The current creation and renaming workflows violate standard file-tree UX (like VS Code or Postman).

Core Mission: Fix the inline creation hierarchy, implement standard double-click-to-rename functionality, and clean up the empty state UI.

Directive 1: UI Cleanup & Empty State
Remove Duplicate CTA: Look at the Collections sidebar. Remove the large, primary "Create Collection" button located directly below the search bar.

Enhance Empty State: In the empty state area (where it says "No collections yet"), keep the "Create Collection" button there, but add a premium, themed SVG icon (e.g., an empty wireframe folder or a subtle plus graphic) above the text to make the empty state visually appealing.

Directive 2: Proper Inline Creation Hierarchy
The Bug: When creating a new folder or request inside an existing collection/folder, the temporary input field for naming it appears at the very top of the sidebar.

The Fix: The inline naming input must mount exactly where the new item will live.

If I click "Add Request" inside "Collection A", a new text input row must appear indented beneath "Collection A".

Ensure this applies to Folders as well. Folder creation must no longer auto-create with a default name; it must mount an inline text input to let the user name it first, exactly like the request creation flow.

Directive 3: VS Code / Postman Rename UX
The Bug: The rename functionality is currently broken across Collections, Folders, and Requests.

The Fix (Unified isEditing State):

Trigger 1 (Context Menu): Clicking "Rename" from the ... menu must transform the entity's name text into a focused inline text input.

Trigger 2 (Double-Click): Implement an onDoubleClick event listener on the entity name that triggers the exact same inline edit mode.

Behavior: While in edit mode, the input should have a subtle Electric Blue focus ring. Pressing Enter or clicking outside the input (onBlur) should save the new name and exit edit mode. Pressing Escape should cancel the edit and revert to the original name.

Execution: Provide a concise Implementation Plan detailing how you will refactor the Collection Tree state to support inline hierarchical rendering and the unified isEditing state before writing the code.