# Pulse V2: Core Evolution Roadmap

This document tracks the progress of the high-priority "Next-Level" features designed to position Pulse as a leader in local-first API collaboration.

## Status Overview

| Pillar | Feature | Status | Priority |
| :--- | :--- | :--- | :--- |
| **B** | **Live Documentation Engine** | 🟢 Completed | Critical |
| **D** | **Mock-to-API Bridge** | 🟢 Completed | High |
| **C** | **Visual Logic Flow Testing** | 🟢 Completed | Medium |
| **E** | **Git 'Change Review' Dashboard** | 🟢 Completed | Medium |
| **F** | **Global Search & 'Pulse Command'** | 🟢 Completed | Medium |
| **A** | **Shared Secret Vault** | ⚪ On Hold | High |

---

## Pillar F: Global Search & 'Pulse Command' 🟢
**Objective**: A unified command palette for instant navigation and action execution across all workspaces.

### Tasks
- [x] Implement **Cross-Workspace Search**: Find any request across all repositories.
- [x] Add **App Commands**: Switch tabs, toggle sidebars, and open settings via keyboard.
- [x] Implement **Category Grouping** for better visual organization.
- [x] Add **Shortcut Indicators** for power users (e.g., Ctrl+T, Ctrl+,).
- [x] Support **Fuzzy Filtering** for titles, subtitles, and categories.
- [x] Enhanced **cURL Import Mode** with dedicated UI.

---

## Pillar E: Git 'Change Review' Dashboard 🟢
**Objective**: Provide a visual side-by-side comparison of API changes before they are committed, enhancing team collaboration and preventing accidental overwrites.

### Tasks
- [x] Implement backend diffing logic in Rust (git log/show).
- [x] Add **Side-by-Side (Split) View** to `GitDiffModal`.
- [x] Add **Unified View** toggle for traditional diffing.
- [x] Integrate "Inspect Changes" action into `GitSync` widget.
- [x] Add **Changelog Preview** for modified/new/conflicted files.
- [x] Implement **Discard Changes** functionality per-file.

---

## Pillar C: Visual Logic Flow Testing 🟢
**Objective**: Transform automated testing into a visual, node-based experience for teams.

### Tasks
- [x] Implement high-performance JS Logic Engine in Rust.
- [x] Add `Assertion` node type for response validation.
- [x] Implement `Passed/Failed` and `True/False` branching handles.
- [x] Add **Golden Path Highlighting**: Edges glow when active.
- [x] Implement real-time variable injection into logic context.
- [x] Add flow execution state reset logic.

---

## Pillar D: Mock-to-API Bridge 🟢
**Objective**: Enable seamless backend simulation for frontend-driven development.

### Tasks
- [x] Add "Create Mock from Request" action in `UrlBar`.
- [x] Implement dynamic path parsing and route creation in `useMockStore`.
- [x] Add default Mock Server auto-generation logic.
- [x] Integrate `Server` icon indicators for mock actions.
- [ ] Implement dynamic response simulation based on request parameters (Planned).

---

## Historical Context: Collaboration Phase 1 ✅
- **Social Activity Feed**: Git log parsing for team "social proof".
- **Soft Locks**: Git-based presence indicators to prevent conflicts.
- **Member Management**: Owner-controlled roster and count visibility.
- **Gravatar Integration**: Visual identity for teammates.
