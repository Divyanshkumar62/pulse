# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules:
- Read files first.
- Write the complete solution.
- Test once.
- No over-engineering.
- NEVER output filler phrases like "Sure!", "Here is the code", or "I hope this helps".
- Output ONLY the requested code or terminal commands.

## Project Overview

Pulse is a Postman alternative API client built with Tauri 2 (Rust + React 18 + TypeScript). It runs HTTP requests, manages collections, environments, and supports team collaboration.

## Common Commands

```bash
npm run tauri dev    # Run in development mode
npm run tauri build  # Build for production
npm run build        # Frontend build only (TypeScript + Vite)
npx vitest           # Run all tests
npx vitest run src/services/__tests__/curl.test.ts  # Run single test file
```

## Architecture

### Frontend Structure

- `src/stores/` - Zustand state management. Each domain has its own store:
  - `useAppStore.ts` - UI state (sidebar tab, modals, response panel size)
  - `useCollectionStore.ts` - Collections and requests
  - `useEnvStore.ts` - Environment variables
  - `useFlowStore.ts` - Flow builder state
  - `useTabStore.ts` - Open request tabs
  - `useSettingsStore.ts`, `useTeamStore.ts`, `useHistoryStore.ts`, `useMonitorStore.ts`, `useWorkspaceStore.ts`

- `src/components/` - React components organized by feature:
  - `layout/` - AppShell, NavSidebar, Header, StatusBar
  - `request/` - RequestBuilder, UrlBar, BodyEditor, HeadersEditor, AuthTab, GraphQLBuilder
  - `response/` - ResponseViewer, ResponseBody
  - `flow/` - FlowBuilder, FlowSidebar, NodeConfigPanel, nodes/ (RequestNode, LogicNode)
  - `collections/` - CollectionTree
  - `tabs/` - TabBar, TabContent
  - `modals/` - Various modal dialogs

- `src/services/` - Business logic: `curl.ts` (parser), `scriptRunner.ts`, `variableResolver.ts`, `importService.ts`, `graphql.ts`, `websocket.ts`

- `src/types/index.ts` - Shared TypeScript interfaces (Request, Collection, Environment, FlowNode, etc.)

### Rust Backend (`src-tauri/`)

- `src/lib.rs` - Tauri command handlers and app entry point
- `src/http/` - HTTP client (`client.rs`) and types
- `src/collections/` - Collections loader, teams, email, git sync, export (Postman/OpenAPI)
- `src/oauth.rs` - OAuth 2.0 PKCE flow

### Data Storage

All data persists to `~/.pulse/`:
- `settings.json` - User preferences
- `environments.yaml` - Environment variables
- `history.json` - Request history
- `collections/` - Saved collections in YAML
- `teams.yaml` - Team data
- `invitations.json` - Pending invitations

### Tauri Commands

Frontend calls Rust via `invoke()`. Key commands:
- `send_http_request` - Execute HTTP requests
- `load_collection`/`save_collection` - YAML collection I/O
- `import_postman_collection` - Import Postman JSON
- `export_collection` - Export to Postman v2.1 or OpenAPI v3
- Git commands: `git_init_repo`, `git_commit_changes`, `git_push_repo`, `git_pull_repo`
- Team commands: `create_team`, `invite_to_team`, `accept_invitation`

### Flow Builder

Uses `@xyflow/react` for visual flow programming. Flows are stored with nodes (request/logic/delay) and edges. The flow runner (`src/utils/flowRunner.ts`) executes flows sequentially.
