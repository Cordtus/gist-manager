# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack JavaScript application for managing GitHub Gists with Markdown preview and file conversion capabilities. Uses React frontend with Express.js backend and GitHub OAuth authentication.

## Development Commands

```bash
# Install all dependencies (uses Yarn workspaces)
yarn install

# Start development servers (frontend on :3000, backend on :5000)
yarn dev

# Build client for production
yarn build

# Run production build
yarn serve:prod

# Test (React test suite)
yarn test

# Clean build artifacts and node_modules
yarn clean
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- GitHub OAuth credentials (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
- Session secret for security
- Frontend runs on port 3000, backend on port 5000 in development

## Architecture

### Authentication Flow
- GitHub OAuth 2.0 with authorization code flow
- Session-based authentication using express-session
- Tokens stored server-side, sessions managed via cookies
- AuthContext (`client/src/contexts/AuthContext.js`) manages client-side auth state

### State Management
- React Context API for global state:
  - `AuthContext` - user authentication and tokens
  - `ThemeContext` - UI theme preferences
  - `ToastContext` - notification system
- No Redux or external state management libraries

### API Structure
- RESTful endpoints under `/api/*`
- Controllers in `server/controllers/` handle business logic
- Routes in `server/routes/` define endpoints
- Key endpoints:
  - `/api/auth/github` - OAuth flow
  - `/api/gists` - CRUD operations for gists
  - `/api/shared-gists` - Community sharing features

### Data Storage
- Shared gists stored in filesystem at `data/shared-gists/`
- Sessions stored in `server/sessions/`
- No database - relies on GitHub API for gist data

### Frontend Architecture
- React 18 with React Router v6
- Tailwind CSS for styling with custom theme system
- Components organized by feature in `client/src/components/`
- Service layer in `client/src/services/` for API calls
- Markdown rendering with react-markdown and syntax highlighting

## Key Technical Decisions

- **Yarn Workspaces**: Monorepo structure with client and server packages
- **No TypeScript**: Pure JavaScript throughout
- **No Component Tests**: Test suite exists but no application-specific tests written
- **Session Storage**: File-based sessions, not using Redis/database
- **CSS Approach**: Mix of Tailwind utilities and custom CSS files
- **Build Tool**: Create React App (not ejected) with default Webpack config

## Common Development Tasks

When modifying gist operations:
- Update controller in `server/controllers/gistController.js`
- Modify API service in `client/src/services/api/gists.js`
- Update UI component (typically `GistEditor.js` or `GistList.js`)

When adding new routes:
- Define route in `server/routes/`
- Create controller in `server/controllers/`
- Add API service method in `client/src/services/api/`
- Update frontend routing in `App.js` if needed

## Code Conventions

- CommonJS modules in server code (`require`/`module.exports`)
- ES6 modules in client code (`import`/`export`)
- Async/await preferred over promises
- Error handling via try/catch with logging utilities
- React functional components with hooks (no class components)
- CSS files co-located with components they style

## Critical Component Relationships

### Main Editor Components
- `GistEditor.js` - Primary editing interface with split-panel markdown preview, multi-file support, and resizable panels
- `GistList.js` - Current implementation with advanced search, filtering, and inline editing
- `MyGists.js` - Alternative JSX implementation using Octokit directly (appears to be transitional)
- `Dashboard.js` - Entry point showing stats and recent gists

### Service Layer Architecture
- `services/api/github.js` - Two axios instances: one for backend (`api`), one for GitHub API (`githubApi`)
- `services/api/gists.js` - Implements per-token caching with 60s TTL
- Token management uses dual strategy: session-based primary, localStorage fallback
- Automatic 401 handling with token cleanup

### Key Implementation Details
- **Caching**: NodeCache on backend (5min TTL), client-side per-token cache (60s TTL)
- **Search**: Client-side full-text search implementation in GistList
- **Theming**: CSS variables-based with dark-first approach, light theme overrides
- **File Storage**: Shared gists stored as JSON at `data/shared-gists/index.json`
- **Session Management**: 24-hour expiration, in-memory storage (not scalable for production)