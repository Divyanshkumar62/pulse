# Pulse - API Client

A fast, lightweight Postman alternative built with Tauri, Rust, and React.

![Pulse](https://img.shields.io/badge/Version-0.1.0-blue)
![Rust](https://img.shields.io/badge/Rust-1.70+-orange)
![React](https://img.shields.io/badge/React-18-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.0-blue)

## Features

### Core Features
- **HTTP Requests**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Collections**: Save and organize API requests in YAML format
- **Import**: Import existing Postman collections (JSON)
- **Environment Variables**: Support for dev/staging/prod environments with `{{variable}}` syntax
- **Request History**: Auto-tracked history with one-click reload (persisted to `~/.pulse/`)
- **Dark Theme**: Modern, eye-friendly dark interface
- **User Settings**: Configurable name, email, and request preferences

### Team Collaboration
- Create teams and manage members
- Send team invitations via email (Resend/SendGrid)
- Role-based access (Owner, Admin, Member)
- Accept/Decline invitation workflow
- Invitations stored in `~/.pulse/invitations.json`

## Screenshots

*Coming soon*

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Desktop Shell | Tauri 2 |
| Backend | Rust |
| Build Tool | Vite |
| Data Format | YAML, JSON |

## Installation

### Prerequisites
- Node.js 18+
- Rust 1.70+
- npm or yarn

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/pulse.git
cd pulse

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

The executable will be generated in `src-tauri/target/release/`.

## Project Structure

```
pulse/
├── src/                      # React frontend
│   ├── App.tsx              # Main application
│   ├── components/          # React components
│   ├── hooks/              # Custom hooks
│   └── types/              # TypeScript types
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Tauri commands
│   │   ├── http/           # HTTP client
│   │   └── collections/     # Collections, teams, email
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── package.json
├── README.md
└── .env.example            # Environment template
```

## Data Storage

All data is stored in `~/.pulse/`:
```
~/.pulse/
├── settings.json      # User settings
├── environments.yaml  # Environment variables
├── history.json       # Request history
├── teams.yaml         # Team data
└── invitations.json   # Invitations
```

## Usage

### Making API Requests

1. Select HTTP method (GET, POST, etc.)
2. Enter URL
3. Add headers if needed
4. Add body for POST/PUT/PATCH
5. Click **Send**

### Using Collections

1. Click **"+ New Collection"**
2. Enter collection name
3. Click **Save** on any request to add it
4. Import Postman collections with **"Import Postman Collection"**

### Environment Variables

1. Go to **Env** tab
2. Select or create environment
3. Add variables: `base_url`, `api_key`, etc.
4. Use `{{variable_name}}` in URLs, headers, or body
5. Variables auto-replace before sending
6. Settings persist automatically

### Team Collaboration

1. Go to **Teams** tab
2. Create a team
3. Click **"+ Invite"** to invite members
4. Invitations include email with accept/decline links

### User Settings

1. Click **⚙️** tab in sidebar
2. Configure your name and email
3. Set default timeout and SSL preferences
4. Settings save automatically

## Email Configuration

### Mock Mode (Default)
Emails are printed to console for testing. No setup required.

### Resend (Recommended)
1. Get API key from [Resend](https://resend.com/api-keys)
2. Copy `.env.example` to `.env`
3. Set values:
   ```
   EMAIL_PROVIDER=resend
   EMAIL_API_KEY=re_xxxxxx
   EMAIL_FROM=your@email.com
   ```

### SendGrid
1. Get API key from [SendGrid](https://app.sendgrid.com/settings/api_keys)
2. Copy `.env.example` to `.env`
3. Set values:
   ```
   EMAIL_PROVIDER=sendgrid
   EMAIL_API_KEY=SG.xxxxxx
   EMAIL_FROM=your@email.com
   ```

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

## Development

### Running Tests

```bash
# API tests
node test-apis.js
```

### Code Quality

```bash
# TypeScript linting
npm run lint

# Format code
npm run format
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - Build smaller, faster desktop apps
- [reqwest](https://docs.rs/reqwest/) - Rust HTTP client
- [React](https://react.dev/) - JavaScript library for UI
- [JSONPlaceholder](https://jsonplaceholder.typicode.com/) - Free fake API for testing
- [Resend](https://resend.com/) - Email API for developers

## Roadmap

- [ ] GraphQL support
- [ ] WebSocket testing
- [ ] Request chaining/dependencies
- [ ] Cloud sync for collections
- [ ] Custom app icons
- [ ] Plugin system
