# Pulse - API Client

A Postman alternative built with Tauri, Rust, and React.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Rust |
| Desktop Shell | Tauri 2 |
| Data Format | YAML, JSON |

## Project Structure

```
pulse-code/
├── src/                    # React frontend
│   ├── App.tsx            # Main application
│   ├── components/       # React components
│   │   └── TeamPanel.tsx # Team management UI
│   ├── hooks/            # Custom hooks
│   │   └── useTauri.ts  # Tauri command wrappers
│   └── types/            # TypeScript types
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs        # Tauri commands
│   │   ├── http/         # HTTP client
│   │   │   ├── client.rs # reqwest with connection pooling
│   │   │   ├── error.rs # Error types
│   │   │   └── types.rs  # HTTP structs
│   │   └── collections/  # Collections & teams
│   │       ├── loader.rs # YAML/JSON file I/O
│   │       ├── postman.rs # Postman import
│   │       ├── team.rs   # Team & Invitation types
│   │       ├── team_loader.rs # Team management
│   │       ├── email.rs  # Email sending (Resend/SendGrid)
│   │       └── types.rs  # Collection data structures
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── package.json
├── .env.example          # Environment template
└── README.md
```

## Features

### 1. HTTP Requests
- GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- Custom headers
- Request body (JSON)
- Response viewer with timing
- URL validation
- Connection pooling (reuses HTTP client)

### 2. Collections
- Save requests to YAML collections
- Import Postman collections (JSON)
- Auto-persisted to `~/.pulse/`

### 3. Environment Variables
- Multiple environments
- Variable syntax: `{{variable_name}}`
- Toggle variables on/off
- Auto-replacement in URL, headers, body
- Persisted automatically

### 4. Request History
- Automatic history tracking
- Last 100 requests
- Click to reload
- Persisted to `~/.pulse/history.json`

### 5. Team Collaboration
- Create teams with Owner/Admin/Member roles
- Send invitations via email
- Accept/Decline workflow
- Stored in `~/.pulse/teams.yaml`

### 6. User Settings
- Configurable name and email
- Request timeout settings
- SSL verification toggle
- Auto-saved to `~/.pulse/settings.json`

## Data Storage

All data stored in `~/.pulse/`:
```
~/.pulse/
├── settings.json      # User settings
├── environments.yaml  # Environment variables
├── history.json       # Request history
├── teams.yaml         # Team data
└── invitations.json   # Invitations
```

## Email Setup

### Mock Mode (Default)
```bash
# No setup needed - emails print to console
```

### Resend (Production)
```bash
cp .env.example .env
# Edit .env:
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxxxx
EMAIL_FROM=you@email.com
```

## Getting Started

### Prerequisites
- Node.js 18+
- Rust 1.70+
- npm or yarn

### Installation

```bash
# Install frontend
npm install

# Build Rust
cd src-tauri
cargo build
cd ..
```

### Development

```bash
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## Key Concepts

### Rust Modules
- `mod.rs` registers a folder as a module
- `pub` makes items accessible
- `use` imports from modules

### Tauri Commands
- `#[tauri::command]` exposes Rust to JavaScript
- `invoke()` calls from frontend
```rust
#[tauri::command]
fn my_command(arg: String) -> Result<String, String> {
    Ok(arg.to_uppercase())
}
```

### Serde Serialization
- `#[derive(Serialize, Deserialize)]` auto-generates conversion
- Works with structs and enums

### Async Rust
- `async` functions return Futures
- `.await` waits for result
- Used with `tokio` runtime

## Performance Optimizations

### Rust
- **HTTP Client Pooling**: Single `reqwest::Client` reused via `once_cell::Lazy`
- **Connection Pooling**: `pool_max_idle_per_host(10)`
- **Minimal Dependencies**: Only required tokio features
- **OnceLock**: Data directory computed once

### React
- **React.memo()**: Memoized components
- **useCallback**: Stable handler references
- **useMemo**: Computed values cached
- **crypto.randomUUID**: Secure ID generation

## API Commands

| Command | Description |
|---------|-------------|
| `send_http_request` | Send HTTP request |
| `load_collection` | Load YAML collection |
| `save_collection` | Save collection to YAML |
| `import_postman_collection` | Import Postman JSON |
| `load_environments` | Load environments |
| `save_environments` | Save environments |
| `load_history` | Load request history |
| `save_history` | Save request history |
| `get_user_settings` | Get user settings |
| `save_user_settings` | Save user settings |
| `create_team` | Create a new team |
| `get_teams` | Get all teams |
| `invite_to_team` | Send team invitation |
| `get_pending_invitations` | Get pending invites |
| `accept_invitation` | Accept invitation |
| `decline_invitation` | Decline invitation |

## Sample Files

| File | Purpose |
|------|---------|
| `sample-collection.yaml` | JSONPlaceholder test collection |
| `pulse-test-collection.json` | Postman-style tests |
| `sample-environments.yaml` | Dev/Staging/Prod environments |
| `sample-teams.yaml` | Sample team data |
| `league.postman_collection.json` | League API collection |
| `.env.example` | Email configuration template |

## Learning Resources

- [Rust Book](https://doc.rust-lang.org/book/)
- [Tauri 2.0 Docs](https://tauri.app/)
- [React Docs](https://react.dev/)
- [serde](https://serde.rs/)
- [Resend](https://resend.com/docs)
