# ⚡ Pulse
### *The Next-Gen, Local-First API Client*

Pulse is a modern, lightweight, and blazing-fast API client designed as a local-first, privacy-respecting alternative to Postman. Built from the ground up on top of **Tauri v2, Rust, and React**, Pulse provides a seamless, native experience for testing HTTP and WebSocket APIs, building automated request flows, and collaborating with Git.

---

## ✨ Features

- **🌊 Visual Flow Builder**: Build and execute complex API testing workflows visually. Chain requests, parse responses, inject variables, and validate assertions with a node-based interface.
- **🔑 Native OS Keychain Security**: Your secrets (tokens, passwords, API keys) are never stored in plain text. Pulse integrates directly with the OS Credential Manager (Windows Credential Manager, macOS Keychain, Linux Secret Service) to encrypt and safeguard sensitive variables.
- **📁 Git-backed Workspaces**: Collaborate seamlessly. Workspaces are structured as simple, standard file folders that you can commit, branch, and push directly using git. No proprietary sync servers required.
- **🛡️ Zero-Telemetry Privacy**: Your data belongs to you. Pulse executes fully locally on your machine, makes direct API calls without proxy servers, and collects absolutely zero telemetry, tracking, or analytics.

---

## 🛠️ Tech Stack

- **Tauri v2**: Core shell, window management, and native system plugins.
- **Rust**: Blazing-fast HTTP request engine, mock servers, and cryptographic operations.
- **React & TypeScript**: Interactive, fluid user interface with modern styling.
- **Zustand**: Clean, reactive global state management.
- **Boa Engine**: High-performance JavaScript execution sandbox for pre-request and post-request test scripts.

---

## 🚀 Installation & Development

To run Pulse in development mode or build it for production on your local machine, ensure you have the following prerequisites installed:
- [Node.js](https://nodejs.org/) (v18+)
- [Rust & Cargo](https://www.rust-lang.org/learn/get-started) (v1.75+)

### 1. Clone the Repository
```bash
git clone https://github.com/Divyanshkumar62/pulse.git
cd pulse
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run in Development Mode
Start the development server with hot-reloading for both the frontend UI and the Rust backend:
```bash
npm run tauri dev
```

### 4. Build Production Bundle
To build a production-ready package (e.g., `.exe` on Windows, `.dmg`/`.app` on macOS, or `.deb` on Linux):
```bash
npm run tauri build
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
