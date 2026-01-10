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
- **Three theme modes** - Light, Dark, and Custom themes
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

- Node.js 18+ (recommended) or 14+ (minimum)
- Yarn package manager
- GitHub account
- GitHub OAuth application credentials

## Installation

1. Clone repository:
   ```bash
   git clone https://github.com/yourusername/gist-manager.git
   cd gist-manager
   ```

2. Install dependencies:
   ```bash
   yarn install:all
   ```
   This will install dependencies for both client and server workspaces.

3. Configure environment:
   Create `.env` file with:

   ```ini
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   REDIRECT_URI=http://localhost:3000/callback
   FRONTEND_URL=http://localhost:3000
   SESSION_SECRET=your_secure_random_string
   NODE_ENV=development
   
   REACT_APP_GITHUB_CLIENT_ID=your_client_id
   REACT_APP_REDIRECT_URI=http://localhost:3000/callback
   REACT_APP_BACKEND_URL=http://localhost:3000
   ```

## Running the Application

### Development Mode
Start both client and server in development mode:
```bash
yarn dev
```

### Production Build
Create optimized production build:
```bash
yarn build:prod
```

Serve production build:
```bash
yarn serve:prod
```

### Individual Services
Start server only:
```bash
yarn start:server
```

Start client only:
```bash
yarn start:client
```

### Testing
Run test suite:
```bash
yarn test
```

### Cleanup
Remove all dependencies and build files:
```bash
yarn clean
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

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing patterns and conventions
- New features include appropriate documentation
- Changes maintain backward compatibility
- Security best practices are followed

## License

GNU Affero General Public License v3.0
