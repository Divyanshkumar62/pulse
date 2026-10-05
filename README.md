# pulse

> Cross-platform desktop telemetry and service health monitor built with Tauri, Rust, and TypeScript.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Desktop: Tauri](https://img.shields.io/badge/Desktop-Tauri%20%28Rust%29-FFC131.svg)](src-tauri/)
[![Frontend: Vite](https://img.shields.io/badge/Frontend-Vite%20%2B%20TypeScript-646CFF.svg)](src/)
[![Version](https://img.shields.io/badge/Release-v1.4.0-success.svg)](RELEASE_1.4.0.md)

---

## Overview

`pulse` is a high-performance desktop application for developers and system administrators to monitor infrastructure health, microservice heartbeats, and local runtime processes. Built on **Tauri**, it leverages a native Rust backend for memory efficiency (<30MB RAM) paired with a reactive TypeScript interface.

### Key Capabilities
* **Low-Overhead Heartbeat Polling:** Asynchronous polling intervals with minimal system load.
* **Native Desktop Integration:** System tray support, background notifications, and auto-start capabilities across Windows, macOS, and Linux.
* **Environment Diagnostic Suite:** Live inspects socket latency, memory usage spikes, and response anomaly spikes.
* **Configurable Telemetry:** Declarative target configurations supporting multi-environment profiles (local, staging, production).

---

## Architecture & Codebase Layout

```
pulse/
├── src-tauri/          # Native Rust backend (Tauri application lifecycle & OS integration)
├── src/                # Reactive frontend interface (TypeScript, Vite)
├── samples/            # Pre-configured monitoring target profiles
├── docs/               # System documentation and protocol specs
└── RELEASE_1.4.0.md    # Changelog and verified release notes
```

---

## Quickstart

### Prerequisites
* Rust toolchain (stable)
* Node.js 20+
* OS build dependencies for Tauri (C++ build tools on Windows / webkit2gtk on Linux)

### Development Setup
```bash
# Clone the repository
git clone https://github.com/Divyanshkumar62/pulse.git
cd pulse

# Install UI dependencies
npm install

# Run application in Tauri development mode
npm run tauri dev
```

### Production Build
```bash
# Compile native standalone desktop installer/executable
npm run tauri build
```

The compiled binaries will be output to `src-tauri/target/release/bundle/`.

---

## License
Distributed under the [MIT License](LICENSE).
