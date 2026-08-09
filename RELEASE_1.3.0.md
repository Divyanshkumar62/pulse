# Release Notes - v1.3.0

We are excited to announce the release of Pulse v1.3.0, introducing major new feature additions and robust enhancements to optimize the API development and testing experience.

---

## ⚡ Real-Time Streaming Engine (WS, SSE, gRPC)
* **Unified Stream Timeline**: A consolidated tab displaying connection logs, live stream status, and frames sent/received in real-time.
* **WebSocket Support**: Establish persistent bi-directional WebSocket connections directly from the UI with frame formatting.
* **Server-Sent Events (SSE)**: Stream event streams asynchronously with clean event parsing and timeline integration.
* **gRPC Support**: Visual client interface supporting long-lived gRPC streaming operations powered by non-blocking background workers.

---

## 🌐 Advanced Mock Servers & Webhook Tunnels
* **Dynamic Parameterized Routes**: Support for parameterized path pattern routing (e.g. `/api/users/:id`).
* **Response Delays**: Integrated configurable route latency triggers (`delay_ms`) to simulate network latency.
* **Zero-Config Webhook Tunnels**: Expose local mock servers to the public internet securely using an embedded Cloudflare Tunnel sidecar with automatic cross-platform executable mappings and cleanup handles.
* **Network Binding Polish**: Bound mock server listener sockets to `0.0.0.0` ensuring webhook traffic routes cleanly across OS boundaries (such as Windows/WSL) without loopback resolution drops.

---

## 🔄 Environment Regression Matrix
* **Concurrent Environment Testing**: Simultaneously invoke identical HTTP requests against two separate environments (e.g., Staging vs Production) using `tokio::join!`.
* **Side-by-Side Diff UI**: Render color-coded JSON payload differences (red/green) and dynamic latency metrics (`⚡ Production is 120ms faster`).
* **Virtualized Performance**: Headless virtualization using `@tanstack/react-virtual` ensures zero-block UI updates and maintains a stable 60fps scrolling speed even with 100,000+ line JSON payloads.

---

## 🔍 OpenAPI Spec Drift Detection
* **Real-Time Schema Validation**: Background Tokio worker automatically runs schema validations against defined OpenAPI specs.
* **Visual Drift Warnings**: Triggers UI validation warning status badges and line-by-line schema mismatch highlights inside a dedicated `SpecDiffDrawer`.

---

## 🐛 Bug Fixes & UX Polish
* **Streaming UI Consolidation**: Strip duplicate WebSocket connection controls from the top URL bar to keep the workspace clean and focused.
* **Elevated Dropdowns**: Polish the method selector dropdown with high `z-index`, box-shadow, and scroll overflow.
* **Viewport Centering & Highlights**: Fixed search matching, view area scroll centering, and added theme-styled glowing blue search highlights for CodeMirror editors.
* **Collection Tree Polish**: Retained expand/collapse collection and folder state on app restart and auto-opened folders upon importing requests.
