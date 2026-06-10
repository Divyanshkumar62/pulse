# Team Collaboration Testing Plan

This document outlines the end-to-end Quality Assurance (QA) strategy for the Team Collaboration features in Pulse. Testing these features requires verifying cloud-based team management and local Git-based synchronization mechanics.

---

## 1. Team & Workspace Management

### 1.1 Team Creation & CRUD
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Create Team Workspace** | 1. Open Team Panel / Switcher.<br>2. Click "Create New Team".<br>3. Enter name "QA Team" and save. | New team workspace is created. App switches context to this empty workspace. |
| **Rename Team** | 1. Open team settings/context menu.<br>2. Select Rename.<br>3. Change to "QA Team v2". | Name updates immediately in the UI and persists across reloads. |
| **Pin Team** | 1. Click "Pin" on a team workspace. | Team is moved to the top of the workspace list with a pin icon. |
| **Delete Team** | 1. Click "Delete".<br>2. Confirm in Danger Modal. | Team is removed. Context switches back to Personal Workspace. |

### 1.2 Invitations & Access Control
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Invite Member** | 1. In Team Panel, click "Invite Member".<br>2. Enter email and assign a Role (e.g., Viewer/Editor).<br>3. Send invite. | Invitation appears in the pending list for the recipient. |
| **Accept Invitation** | 1. Log in as recipient.<br>2. View pending invites.<br>3. Click "Accept". | Team appears in recipient's workspace list. Recipient can access shared collections. |
| **Decline Invitation** | 1. As recipient, click "Decline" on an invite. | Invite disappears/marked as declined. Sender sees updated status. |
| **Remove Member** | 1. As Team Admin, go to members list.<br>2. Click remove on a user. | User loses access immediately and cannot view the workspace anymore. |

---

## 2. Git Synchronization & Version Control

Pulse uses Git under the hood to synchronize team collections.

### 2.1 Remote Configuration
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Configure Remote** | 1. Open GitSync Widget (bottom/top bar).<br>2. Click Settings icon.<br>3. Enter valid GitHub/GitLab URL.<br>4. Save. | Success toast. Widget now points to `origin`. |
| **Invalid Remote** | 1. Enter malformed URL in remote settings.<br>2. Save. | Error toast specifying connection failure or invalid format. |

### 2.2 Standard Syncing (Happy Path)
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Detect Local Changes** | 1. Create a new collection or request.<br>2. Look at GitSync widget. | Widget shows a "badge/dot" indicating uncommitted changes (e.g., "1 change to sync"). |
| **Commit & Push** | 1. Click "Sync Now" or the Commit button.<br>2. Enter a commit message.<br>3. Submit. | Changes are pushed to the remote repository. Sync dot disappears. |
| **Pull Remote Changes** | 1. Another team member pushes a change.<br>2. You click "Sync Now". | App fetches remote, pulls changes, and auto-updates the UI with the new requests/folders. |

### 2.3 Conflict Resolution (Edge Cases)
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Merge Conflict Detection** | 1. User A edits Request X and pushes.<br>2. User B edits Request X (same line/field).<br>3. User B clicks "Sync Now". | Pull fails. App shows "Merge conflicts detected" toast. GitSync widget turns red and shows "Resolve" button. |
| **Conflict Resolver UI** | 1. Click "Resolve" on the GitSync widget. | The Conflict Resolver Modal opens, showing User A's changes vs User B's changes side-by-side. |
| **Resolve & Complete** | 1. In the Conflict Resolver, choose which changes to keep.<br>2. Click "Mark as Resolved". | App completes the Git rebase/merge, pushes to remote, and returns to a healthy synced state. |

---

## 3. Activity Tracking

### 3.1 Workspace Activity Log
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **View Commit History** | 1. Open Team Activity Feed.<br>2. Review list. | Should display chronological Git commits with author names, timestamps, and commit messages. |
| **Real-time Refresh** | 1. Push a new sync while Activity Feed is open. | New commit should automatically appear at the top of the feed. |

---

## 4. Edge Cases & Negative Testing

- **Offline Mode:** Attempt to sync while disconnected from the internet. Verify app doesn't crash and shows a clear "Network Error" toast.
- **Permission Denied (Git):** Attempt to push to a remote repository where the user's Git credentials lack write access. Verify proper HTTP 403/Permission denied toast.
- **Simultaneous Edits:** Two users actively typing in the same request body at the exact same time (if multiplayer WebSocket presence is enabled).
- **Missing Local Repo:** Manually delete the hidden `.git` folder inside the workspace data directory. The app should gracefully prompt to re-initialize or clone the repository.
