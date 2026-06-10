# Pulse Hardening & Optimization Roadmap

This document outlines the strategic plan to transition Pulse from a feature-rich prototype to a production-grade, enterprise-ready API tool.

## 1. Performance Optimizations 🚀

| Feature | Issue | Proposed Solution | Status |
| :--- | :--- | :--- | :--- |
| **Collection Tree Virtualization** | High CPU/Memory usage with 100+ requests. | Implement `react-window` or custom virtual list for the sidebar. | ⚪ Planned |
| **Rust-Side Fuzzy Search** | Keystroke lag in Command Palette during indexing. | Move search logic to a Rust command using `fuzzy-matcher`. | ⚪ Planned |
| **Zustand Partial Subscriptions** | Unnecessary re-renders of the entire app shell. | Use specific selectors for store hooks to isolate re-renders. | ⚪ Planned |
| **Auto-Save Efficiency** | `JSON.stringify` on every tab change. | Implement dirty-checking and offload I/O to Rust background thread. | ⚪ Planned |

## 2. Security Hardening 🛡️

| Point | Vulnerability | Proposed Solution | Status |
| :--- | :--- | :--- | :--- |
| **Path Sanitization** | Potential Directory Traversal via Tauri commands. | Add strict path validation in Rust to keep ops within workspace. | ⚪ Planned |
| **Sensitive Data Masking** | Tokens/Secrets visible in plain-text logs and state. | Implement a `Secret` type that is masked in UI and encrypted on disk. | ⚪ Planned |
| **Content Security Policy** | Risk of XSS in custom JS scripts or HTML rendering. | Tighten Tauri CSP and sandbox the `Boa` execution context further. | ⚪ Planned |
| **Git Leak Prevention** | Accidentally committing environment-specific keys. | Build a `.pulse-ignore` engine that blocks sensitive patterns. | ⚪ Planned |

## 3. UI/UX Refinement & Polish ✨

| Feature | Improvisation | Proposed Solution | Status |
| :--- | :--- | :--- | :--- |
| **View Transitions** | Harsh "snapping" when switching layout panes. | Add subtle Framer Motion or CSS transitions for fluid feel. | ⚪ Planned |
| **Editor Reuse** | Frequent CodeMirror re-initialization. | Persistent editor instance or lightweight fallback for simple inputs. | ⚪ Planned |
| **Visual Feedback** | Lack of clear state indicators for async ops. | Add skeleton loaders and micro-animations for Git/Network tasks. | ⚪ Planned |

---

## Action Plan

### Phase 1: Performance Foundation
- [ ] Implement `VirtualList` for the sidebar collection tree.
- [ ] Migrate Command Palette search to Rust-side indexing.

### Phase 2: Security & Integrity
- [ ] Audit all Rust filesystem commands for path sanitization.
- [ ] Implement local-first masking for sensitive environment variables.

### Phase 3: Premium Polish
- [ ] Add layout transitions and interactive micro-animations.
- [ ] Refactor CodeEditor for better lifecycle management.
