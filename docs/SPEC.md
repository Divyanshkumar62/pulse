# Pulse API Client — Design & Feature Specification

## 1. Vision & Goals

**Status**: Professional-grade workspace achieved.
Pulse is now a high-performance, team-native API client that exceeds Postman in speed and UX fluidity.

---

## 2. Design Language (Implemented)

The "Electric Blue" design system is fully implemented and enforced via CSS variables in `src/styles/tokens.css`.

### 2.1 Spacing & Typography
- **Grid**: 8px base grid.
- **Fonts**: Inter (Sans) and JetBrains Mono (Code/Mono).

---

## 3. Layout Architecture (Implemented)

### 3.1 3-Panel Shell
The `AppShell` provides a stable, resizable environment for API development.
- **Sidebar**: Resizable, virtualized for performance.
- **Tabs**: State-persisted tab system for multitasking.
- **Request/Response**: Vertical split with specialized editors.

---

## 4. Feature Implementation Details

### 4.1 Request Builder
- **UrlBar**: Integrated method selector and environment variable resolution.
- **Editors**: Headers, Params, and Body editors powered by CodeMirror 6.
- **Sync**: Real-time synchronization between URL query params and the Params table.

### 4.2 Response Viewer
- **Response Headers Area**: Real-time status, 200ms+ timing, and payload size.
- **Body Viewer**: Virtualized JSON/XML viewer with search support.

### 4.3 Collections & Teams
- **Persistence**: Collections are saved as YAML in `~/.pulse/`.
- **Teams**: Collaborative workspaces with role-based invitations.

### 4.4 Productivity Suite
- **Command Palette**: Ctrl+K accessible from anywhere. Now supports pasting cURL commands directly to import them instantly.
- **Shortcuts**: Comprehensive keyboard coverage.
- **Code Gen**: Instant cURL and Fetch exports.
- **cURL Import**: Dedicated parser (`CurlParser`) to map existing CLI commands to structured requests.

### 4.5 Managed Authentication (OAuth 2.0)
- **Token Acquisition**: Fully managed Authorization Code + PKCE loopback flow.
- **Auto-Injection**: Managed tokens (Bearer, OAuth) are automatically resolved and injected into outgoing required headers.
- **Storage**: Auth configurations are cleanly nested inside the generic `Request` boundaries, synchronizing across tabs.

---

## 5. Technical Stack

| Category | Technology |
|----------|------------|
| **Core** | Tauri 2 + Rust |
| **Frontend** | React 18 + TypeScript |
| **State** | Zustand |
| **Editor** | CodeMirror 6 |
| **HTTP** | Reqwest (Rust) |
| **Performance**| VirtualList (Custom) |

---

## 6. Next Generation Features (Phase 5)

Planned extensions including GraphQL, WebSockets, and Pre-request scripting.
