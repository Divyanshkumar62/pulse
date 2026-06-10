# Pulse API Client - Quick Start Card

## Start the App
```bash
npm run tauri dev
```

## Test APIs (JSONPlaceholder)

| Action | URL | Method | Body |
|--------|-----|--------|------|
| Get all posts | `https://jsonplaceholder.typicode.com/posts` | GET | - |
| Get one post | `https://jsonplaceholder.typicode.com/posts/1` | GET | - |
| Create post | `https://jsonplaceholder.typicode.com/posts` | POST | `{"title":"Test","body":"Content","userId":1}` |
| Update post | `https://jsonplaceholder.typicode.com/posts/1` | PUT | `{"id":1,"title":"Updated","body":"New","userId":1}` |
| Delete post | `https://jsonplaceholder.typicode.com/posts/1` | DELETE | - |

## Environment Variables
```
{{variable_name}} → automatically replaced
```

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Enter | Send request (in URL bar) |

## Data Location
```
~/.pulse/
├── settings.json      # User settings
├── environments.yaml # Environment variables
├── history.json      # Request history
├── teams.yaml        # Team data
└── invitations.json  # Invitations
```

## Sidebar Tabs
1. **Collections** - Saved requests
2. **History** - Recent requests
3. **Env** - Environment variables
4. **Teams** - Team collaboration
5. **⚙️** - User settings

## Import Postman
Click **📥 Import Postman** → Select `.json` file

## Test Checklist
- [ ] GET request works
- [ ] POST request works
- [ ] Headers can be added
- [ ] Body editor works
- [ ] Collections save
- [ ] Environment variables work
- [ ] History tracks requests
- [ ] Postman import works
- [ ] Team creation works
- [ ] Invitations work
