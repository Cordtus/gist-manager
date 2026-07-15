# Gist Manager

Modern web application for creating, editing, and managing GitHub Gists with advanced features and customizable theming.

## Features

### Core Functionality
- **GitHub OAuth authentication** - Secure login with GitHub account
- **Gist management** - Create, edit, delete, and organize your gists
- **Multi-file support** - Manage multiple files within a single gist
- **Smart title generation** - Automatic descriptive titles from file metadata
- **Live Markdown preview** - Real-time preview while editing Markdown files
- **Advanced search** - Search by title, filename, content with filters
- **Community sharing** - Share and discover gists from other users

### Theme System
- **Modern CSS variable-based theming** - Consistent design across the app
- **Theme presets** - Light, Dark, Terminal, Retro, and Retro Dark themes
- **Theme Sandbox** - Visual theme editor with live preview
- **Customizable colors** - Modify 12+ color properties including:
  - Primary colors (buttons, links, highlights)
  - Background and surface colors
  - Text hierarchy colors
  - UI elements (borders, success, warning, danger)

### User Experience
- **Responsive design** - Works on desktop, tablet, and mobile
- **Collapsible sidebar** - Space-efficient navigation
- **Toast notifications** - User-friendly feedback system
- **File format conversion** - Convert between Markdown, HTML, and plain text
- **Syntax highlighting** - Code display with language detection
- **Per-user cache isolation** - Enhanced security and performance

## Requirements

- Node.js 18+
- Bun (production uses `/opt/bun/bin/bun`)
- GitHub account
- GitHub OAuth application credentials

## Installation

1. Clone repository:
   ```bash
   git clone git@github.com:cordtus/gist-manager.git
   cd gist-manager
   ```

2. Install dependencies:
   ```bash
   bun install --frozen-lockfile
   ```
   This will install dependencies for both client and server workspaces.

3. Configure environment:
   Create `.env` file with:

   ```ini
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   PORT=5000
   NODE_ENV=development
   VITE_GITHUB_CLIENT_ID=your_client_id
   VITE_REDIRECT_URI=http://localhost:3020/callback
   ```

## Running the Application

### Development Mode
Start both client and server in development mode:
```bash
bun run dev
```

### Production Build
Create optimized production build:
```bash
bun run --cwd client build
```

Serve production build:
```bash
bun run start
```

### Individual Services
Start server only:
```bash
bun run --cwd server start
```

Start client only:
```bash
bun run --cwd client start
```

### Testing
Run test suite:
```bash
cd client && bun ../node_modules/vitest/vitest.mjs run
```

### Cleanup
Remove all dependencies and build files:
```bash
bun run clean
```

## Architecture

### Authentication
- **OAuth 2.0** - GitHub authorization code flow
- **Session management** - Secure HTTP-only cookies
- **Token caching** - Per-user isolated cache with security boundaries
- **Automatic token refresh** - Seamless user experience

### API Endpoints

#### Authentication
- `GET /api/auth/github/login` - Get OAuth authorization URL
- `POST /api/auth/github` - Exchange authorization code for token
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - Clear session and cache

#### Gist Management
- `GET /api/gists` - Fetch authenticated user's gists
- `GET /api/gists/:id` - Get specific gist
- `POST /api/gists` - Create new gist
- `PATCH /api/gists/:id` - Update existing gist
- `DELETE /api/gists/:id` - Delete gist

#### Community Features
- `GET /api/shared-gists` - Browse all shared gists
- `POST /api/shared-gists` - Share a gist
- `GET /api/shared-gists/check/:gistId` - Check if gist is shared
- `GET /api/shared-gists/user` - Get user's shared gists
- `DELETE /api/shared-gists/:gistId` - Unshare a gist

## Project Structure

```
gist-manager/
├── client/                    # React frontend workspace
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── common/      # Reusable UI components
│   │   │   ├── markdown/    # Markdown rendering
│   │   │   └── ...         # Feature components
│   │   ├── contexts/        # React contexts
│   │   │   ├── AuthContext.js
│   │   │   ├── ThemeContext.js
│   │   │   └── ToastContext.js
│   │   ├── services/        # API service layer
│   │   │   └── api/        # API endpoints
│   │   ├── styles/          # CSS and theme files
│   │   │   ├── index.css
│   │   │   ├── modern-theme.css
│   │   │   └── ...        # Component styles
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                   # Express backend workspace
│   ├── controllers/         # Request handlers
│   ├── routes/             # API route definitions
│   ├── server.js           # Main server file
│   └── package.json
├── data/                    # Persistent data storage
│   └── sharedGists.json    # Community gists database
└── package.json            # Root workspace configuration
```

## Key Technologies

### Frontend
- **React 18** - Modern React with hooks and Context API
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality React component library
- **CSS Variables** - Dynamic theming system
- **Lucide React** - Modern icon library
- **Prism.js** - Syntax highlighting

### Backend
- **Express.js** - Web framework
- **express-session** - Session management
- **node-cache** - In-memory caching with TTL
- **axios** - HTTP client
- **helmet** - Security headers
- **winston** - Structured logging
- **cors** - Cross-origin support

### Testing
- **Vitest** - Fast, modern test runner
- **React Testing Library** - Component testing
- **jsdom** - DOM simulation

## Security Features

- **Per-user cache isolation** - Prevents cross-user data leakage
- **Secure session management** - HTTP-only cookies with proper SameSite settings
- **Token validation** - Ensures tokens are valid before API calls
- **CORS configuration** - Restricts API access to authorized origins
- **Environment variable protection** - Sensitive data kept in `.env` files

## Production on `nodev2:tgbot`

The production checkout lives at `/opt/gist-manager` in the `tgbot` LXC container (`10.70.48.203`). `gist-manager.service` runs the server as `gistui:gistui` on port `5000`; Caddy continues to publish the existing `https://gistmd.basementnodes.ca` hostname and proxies it to `10.70.48.203:5000`.

### Files, ownership, and secrets

Keep the checkout, executable scripts, dependencies, and `server/build` root-owned. The root updater executes from this tree, so `gistui` must not be able to replace any source or script. Only application data and logs are service-writable:

```bash
sudo install -d -o root -g gistui -m 0755 /opt/gist-manager
sudo chown -R root:root /opt/gist-manager
sudo install -d -o gistui -g gistui -m 0750 /opt/gist-manager/data /opt/gist-manager/logs
sudo install -d -o root -g root -m 0755 /etc/gist-manager
sudo touch /etc/gist-manager/gist-manager.env
sudo touch /etc/gist-manager/gist-manager-updater.env
sudo chown root:root /etc/gist-manager/gist-manager.env /etc/gist-manager/gist-manager-updater.env
sudo chmod 0600 /etc/gist-manager/gist-manager.env /etc/gist-manager/gist-manager-updater.env
```

Populate `/etc/gist-manager/gist-manager.env` without printing its values to logs:

```ini
GITHUB_CLIENT_ID=existing_oauth_client_id
GITHUB_CLIENT_SECRET=existing_oauth_client_secret
PORT=5000
NODE_ENV=production
```

The root updater must not inherit the OAuth client secret, PATs, session secrets, or other production credentials while it executes fetched dependency hooks and the Vite build. Put only the public build-time values in `/etc/gist-manager/gist-manager-updater.env`:

```ini
VITE_GITHUB_CLIENT_ID=existing_oauth_client_id
VITE_REDIRECT_URI=https://gistmd.basementnodes.ca/callback
```

The GitHub OAuth application's homepage and callback must remain `https://gistmd.basementnodes.ca` and `https://gistmd.basementnodes.ca/callback`. A host change or mismatched `VITE_REDIRECT_URI` breaks login. `gist-manager.service` loads only `gist-manager.env`; `gist-manager-updater.service` loads only `gist-manager-updater.env`.

### Initial deployment and cutover

Install and validate the target while all target units remain inactive:

```bash
sudo bash <<'ROOT'
set -euo pipefail
set -a
. /etc/gist-manager/gist-manager-updater.env
set +a
cd /opt/gist-manager
/opt/bun/bin/bun install --frozen-lockfile
/opt/bun/bin/bun run --cwd client build
rm -rf server/build
cp -a client/build server/build
chown -R root:root node_modules server/build
ROOT
sudo systemctl disable --now gist-manager.service gist-manager-updater.timer 2>/dev/null || true
sudo install -o root -g root -m 0644 gist-manager.service gist-manager-updater.service gist-manager-updater.timer /etc/systemd/system/
sudo systemctl daemon-reload
! sudo systemctl is-enabled --quiet gist-manager.service
! sudo systemctl is-enabled --quiet gist-manager-updater.timer
! sudo systemctl is-active --quiet gist-manager.service
! sudo systemctl is-active --quiet gist-manager-updater.timer
```

Do not start the target service until the Pi service is stopped and the final mutable-data copy is complete. The shared-gist index is authoritative mutable state even if the current minimal server does not modify it. Back it up before transfer, restore the whole directory, and compare both the file digest and parsed JSON before cutover:

```bash
sudo cp -a /opt/gist-manager/data/shared-gists /opt/gist-manager/data/shared-gists.pre-migration
sha256sum /opt/gist-manager/data/shared-gists/index.json
jq type /opt/gist-manager/data/shared-gists/index.json
sudo chown -R gistui:gistui /opt/gist-manager/data
sudo find /opt/gist-manager/data -type d -exec chmod 0750 {} +
sudo find /opt/gist-manager/data -type f -exec chmod 0640 {} +
```

After final transfer, start locally and verify it before changing Caddy:

```bash
sudo systemctl enable --now gist-manager.service
curl -fsS http://127.0.0.1:5000/ >/dev/null
sudo systemctl enable --now gist-manager-updater.timer
```

Back up the live Caddyfile both in the Caddy container and on the workstation before editing it. Following the existing site-block pattern, change only the `gistmd.basementnodes.ca` upstream from the Pi address to `10.70.48.203:5000`, run `caddy validate`, reload Caddy without restarting it, and verify the public hostname and OAuth callback flow.

### Automatic updates and recovery

`gist-manager-updater.timer` runs every 12 hours and invokes `scripts/update-production.sh`. The updater refuses dirty or non-`main` checkouts, requires the current revision to be an ancestor of `origin/main`, and merges with `--ff-only`. It installs the frozen dependency graph and builds the client before atomically renaming `server/build.next` to `server/build`, retaining `server/build.previous` until deployment succeeds. It records whether the app was active before updating: an active app is restarted and verified, while an inactive app remains inactive. It never starts, stops, enables, or disables the updater timer.

Check the published branch without fetching, building, or restarting:

```bash
sudo /opt/gist-manager/scripts/update-production.sh --check
```

If build or deployment fails, the script restores the prior Git revision, dependencies, and build. If there was no prior `server/build`, rollback removes the failed new build and restores that absence. A failed service restart also triggers a restart of the restored release, but only when the app was active before the update. Exit status `70` means automatic rollback was incomplete and requires manual intervention; inspect the updater journal before doing anything else:

```bash
sudo journalctl -u gist-manager-updater.service -n 200 --no-pager
sudo systemctl status gist-manager.service --no-pager
sudo git -C /opt/gist-manager status --short --branch
```

Never discard a dirty production checkout. Capture `git status`, the commits not present on `origin/main`, and binary-safe patches before deciding whether the changes belong in the canonical repository.

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing patterns and conventions
- New features include appropriate documentation
- Changes maintain backward compatibility
- Security best practices are followed

## License

GNU Affero General Public License v3.0
