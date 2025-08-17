# Gist Manager - Complete Architecture Blueprint

## Project Overview
Full-stack JavaScript application for managing GitHub Gists with enhanced markdown editing, file conversion, and community sharing features. Built with React frontend and Express.js backend using GitHub OAuth for authentication.

## Technology Stack

### Frontend
- **React 18.2** - Component-based UI framework
- **React Router v6** - Client-side routing
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Axios** - HTTP client for API communication
- **React Markdown** - Markdown rendering with GFM support
- **React Syntax Highlighter** - Code syntax highlighting
- **Showdown/Turndown** - Markdown/HTML conversion

### Backend
- **Express.js 4.21** - Web application framework
- **Express Session** - Session management
- **Helmet** - Security headers middleware
- **Winston** - Logging framework
- **Node Cache** - In-memory caching
- **File System** - JSON-based data persistence

### Development Tools
- **Yarn Workspaces** - Monorepo management
- **Create React App** - Build tooling (not ejected)
- **Nodemon** - Development server auto-restart
- **PostCSS** - CSS processing pipeline
- **CRACO** - CRA configuration override

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Component Layer                       │   │
│  │  Dashboard | GistEditor | SharedGists | etc.    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Context Layer (Global State)            │   │
│  │    AuthContext | ThemeContext | ToastContext    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Service Layer                      │   │
│  │   API Services | File Services | Utilities      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Express.js Backend                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Middleware Stack                     │   │
│  │  Helmet | CORS | Session | Body Parser | Logger │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Route Handlers                     │   │
│  │    /api/auth | /api/gists | /api/shared-gists   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Controllers                        │   │
│  │   gistController | sharedGistsController        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    External Services                     │
│        GitHub API          |        File System          │
└─────────────────────────────────────────────────────────┘
```

## Component Architecture

### Core Components (21 total)

#### Layout & Navigation
- **Layout** - Main application shell with theme support
- **Header** - Top navigation bar with auth status and theme toggle
- **Sidebar** - Left navigation menu with route highlighting

#### Content Management
- **Dashboard** - Home page with stats and recent gists
- **GistEditor** - Rich markdown editor with split preview
  - Multi-file support with tabs
  - Resizable panels (horizontal/vertical)
  - Markdown toolbar with formatting shortcuts
  - Real-time preview with syntax highlighting
- **GistList** - Advanced gist browser with search/filter
  - Client-side full-text search
  - Multi-criteria filtering
  - Inline editing
  - Pagination
- **MyGists** - Alternative gist listing using Octokit

#### Sharing Features
- **SharedGistList** - Browse community-shared gists
- **SharedGistDetail** - View shared gist with file navigation

#### Utilities
- **FileConverter** - Multi-format file conversion tool
- **UserProfile** - GitHub profile and statistics
- **ThemeColorSelector** - Theme preference UI
- **ThemeSandbox** - Theme testing environment
- **DeleteGist** - Gist deletion with confirmation
- **ConfirmationDialog** - Reusable modal dialog

#### Common Components
- **Toast** - Notification system component
- **Spinner** - Loading indicator
- **MarkdownPreview** - Enhanced markdown renderer

#### Authentication
- **Callback** - OAuth callback handler

## State Management

### Global State (React Context)

#### AuthContext
```javascript
{
  user: Object,        // GitHub user profile
  token: String,       // GitHub access token
  loading: Boolean,    // Auth loading state
  error: String,       // Auth error messages
  isAuthenticated: Boolean
}
```

#### ThemeContext
```javascript
{
  theme: 'light' | 'dark',
  systemPreference: String,
  toggleTheme: Function,
  setThemeMode: Function
}
```

#### ToastContext
```javascript
{
  toasts: Array,
  success: Function,
  error: Function,
  warning: Function,
  info: Function
}
```

### Local Component State
- Form inputs and UI interactions
- Component-specific data (gist lists, file content)
- Derived/computed state (filtered data, metrics)
- Pagination and view preferences

## API Architecture

### Backend Endpoints

#### Authentication (`/api/auth/`)
- `GET /api/auth/github/login` - Initiate OAuth flow
- `POST /api/auth/github` - Exchange code for token
- `POST /api/auth/logout` - Destroy session
- `GET /api/auth/status` - Check auth status

#### Gist Management (`/api/gists/`)
- `GET /api/gists` - List all user gists
- `POST /api/gists` - Create new gist
- `GET /api/gists/:id` - Get specific gist
- `PATCH /api/gists/:id` - Update gist
- `DELETE /api/gists/:id` - Delete gist

#### Shared Gists (`/api/shared-gists/`)
- `GET /api/shared-gists` - List shared gists
- `POST /api/shared-gists` - Share a gist
- `DELETE /api/shared-gists/:gistId` - Unshare gist
- `GET /api/shared-gists/check/:gistId` - Check share status
- `GET /api/shared-gists/user` - User's shared gists

### Service Layer

#### API Services
- **auth.js** - GitHub OAuth authentication
- **github.js** - Axios instance configuration
- **gists.js** - Gist CRUD operations with caching
- **sharedGists.js** - Community sharing features

#### Utilities
- **fileService.js** - Markdown/HTML conversion
- **logger.js** - Centralized logging and error handling
- **errorTracking.js** - Error tracking system
- **dateUtils.js** - Date formatting utilities
- **describeGist.js** - Smart description inference

## Data Flow

### Authentication Flow
```
1. User clicks login
2. Frontend redirects to GitHub OAuth
3. GitHub redirects to /callback with code
4. Frontend sends code to backend
5. Backend exchanges code for token
6. Token stored in session
7. User data fetched and stored
8. Frontend updates auth context
```

### Gist Operations Flow
```
1. Component initiates action
2. Service layer prepares request
3. Axios sends to GitHub API or backend
4. Response processed with error handling
5. Cache invalidated if mutation
6. Component state updated
7. Toast notification shown
```

### Shared Gist Flow
```
1. User toggles share on public gist
2. Frontend calls shareGist service
3. Backend validates ownership
4. Gist metadata saved to file system
5. Index file updated
6. Response sent to frontend
7. UI updates share status
```

## Security Architecture

### Frontend Security
- Token storage in localStorage with expiration
- Automatic token cleanup on 401 responses
- HTTPS-only in production
- CSP headers from backend

### Backend Security
- Helmet.js for security headers
- CORS with whitelisted origins
- Session-based authentication
- Secure cookies (httpOnly, sameSite)
- Input validation on all endpoints
- Rate limiting via GitHub API

### Authentication Security
- OAuth 2.0 authorization code flow
- State parameter for CSRF protection
- Token never exposed in URLs
- 24-hour session expiration
- Automatic logout on token invalidation

## Styling Architecture

### CSS Strategy
- **Tailwind CSS** for utility classes
- **CSS Variables** for theming
- **Component CSS** for complex styles
- **Dark-first** design approach

### Theme System
```css
/* CSS Variables define the theme */
--color-primary: #3B82F6;
--color-surface: #1E2328;
--color-text-primary: #F7FAFC;
/* ... 50+ variables */
```

### File Organization
```
styles/
├── theme.css           # CSS variable definitions
├── index.css          # Global styles + Tailwind
├── gistEditor.css     # Editor-specific styles
├── markdownPreview.css # Markdown rendering
└── markdownExtras.css  # Enhanced markdown features
```

## Performance Optimizations

### Frontend
- Component memoization with React.memo
- useCallback for event handlers
- Lazy loading for routes
- Client-side caching with TTL
- Debounced search inputs
- Virtual scrolling for long lists

### Backend
- NodeCache with 5-minute TTL
- GitHub API response caching
- File-based session storage
- Gzip compression
- Static asset caching headers

## Data Persistence

### GitHub Gists
- Primary storage: GitHub API
- Cache layer: NodeCache (5-min TTL)
- No local database required

### Shared Gists
- Storage: File system JSON
- Location: `/data/shared-gists/index.json`
- Structure:
```json
{
  "gists": [{
    "id": "github_gist_id",
    "sharedId": "uuid",
    "userId": "github_user_id",
    "username": "github_username",
    "sharedAt": "ISO timestamp",
    "updatedAt": "ISO timestamp",
    "description": "string",
    "files": {}
  }],
  "lastUpdated": "ISO timestamp"
}
```

### Sessions
- Storage: Express-session (in-memory)
- Expiration: 24 hours
- Content: User profile, GitHub token

## File Structure

```
gist-manager/
├── client/                    # React frontend
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API services
│   │   ├── styles/           # CSS files
│   │   ├── utils/            # Utility functions
│   │   ├── App.js           # Main app component
│   │   └── index.js         # App entry point
│   ├── package.json
│   └── tailwind.config.js
├── server/                   # Express backend
│   ├── controllers/          # Business logic
│   ├── routes/              # API routes
│   ├── data/                # File storage
│   ├── sessions/            # Session storage
│   ├── server.js            # Server entry point
│   └── package.json
├── data/                    # Shared data directory
│   └── shared-gists/        # Shared gist storage
├── package.json             # Root package (workspaces)
├── yarn.lock
├── .env.example
└── README.md
```

## Development Workflow

### Setup
1. Clone repository
2. Copy `.env.example` to `.env`
3. Configure GitHub OAuth credentials
4. Run `yarn install`
5. Run `yarn dev`

### Common Commands
```bash
yarn dev         # Start development servers
yarn build       # Build for production
yarn serve:prod  # Run production build
yarn test        # Run tests
yarn clean       # Clean build artifacts
```

### Code Patterns
- CommonJS in server (`require`/`module.exports`)
- ES6 modules in client (`import`/`export`)
- Async/await for asynchronous operations
- Functional components with hooks
- Error boundaries for error handling

## Known Issues and Limitations

### Current Limitations
- No database (file-based persistence only)
- No real-time updates (polling required)
- Limited to GitHub API rate limits
- Session storage in-memory (not scalable)
- No automated tests implemented

### Future Enhancements
- Database integration (PostgreSQL/MongoDB)
- WebSocket support for real-time updates
- Redis for session storage
- Comprehensive test suite
- CI/CD pipeline
- Docker containerization
- GraphQL API option

## Critical Dependencies

### Security Updates Required
- Regular dependency audits with `yarn audit`
- Keep Express.js and React updated
- Monitor GitHub API changes
- Update security middleware regularly

### Key Package Versions
- React: 18.2.0
- Express: 4.21.1
- Tailwind CSS: 3.4.15
- Axios: 1.7.7
- React Router: 6.28.0

## Deployment Considerations

### Environment Variables
- `GITHUB_CLIENT_ID` - OAuth app ID
- `GITHUB_CLIENT_SECRET` - OAuth secret
- `SESSION_SECRET` - Session encryption
- `NODE_ENV` - Environment mode
- `FRONTEND_URL` - Frontend domain
- `REDIRECT_URI` - OAuth callback URL

### Production Setup
1. Build frontend: `yarn build`
2. Set NODE_ENV=production
3. Configure reverse proxy (nginx)
4. Enable HTTPS with SSL certificates
5. Set secure cookie flags
6. Configure proper CORS origins
7. Set up monitoring and logging

## Monitoring and Maintenance

### Logging
- Winston logger with file rotation
- Error logs: `server/error.log`
- Combined logs: `server/combined.log`
- Frontend errors tracked in localStorage (dev)

### Health Checks
- `/api/health` endpoint (implement)
- GitHub API status monitoring
- Session storage monitoring
- File system space monitoring

### Backup Strategy
- Regular backup of `/data/shared-gists/`
- Session data is ephemeral
- GitHub gists are source of truth
- Configuration backup (.env files)

---

This blueprint provides a complete understanding of the Gist Manager codebase architecture, enabling reliable and effective development and maintenance of the application.