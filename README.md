# Gist Manager

Web application for creating, editing, and managing GitHub Gists with Markdown preview and format conversion.

## Features

- GitHub OAuth authentication
- Gist creation and editing with live Markdown preview
- Multi-file gist support
- Search and filtering of gists
- File format conversion (Markdown, HTML, plain text)
- Community gist sharing
- Responsive UI with dark/light mode support
- Syntax highlighting for code snippets

## Requirements

- Node.js 14+
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
   yarn install
   ```

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

## Running

Development mode:

```bash
yarn dev
```

Production mode:

```bash
yarn prod
```

Run existing production build:

```bash
yarn serve-prod
```

## API Structure

### Authentication Flow

- OAuth 2.0 authorization code flow
- Session-based authentication with secure cookies
- Token management with automatic refreshing

### Core Endpoints

- `/api/auth/github`: GitHub OAuth integration
- `/api/gists`: CRUD operations for gists
- `/api/shared-gists`: Community sharing functionality

## Project Structure

```ini
/
├── public/           # Static assets
├── src/              # React frontend
│   ├── components/   # UI components
│   ├── contexts/     # React contexts (auth, etc.)
│   ├── services/     # API service modules
│   ├── styles/       # CSS styles
│   └── utils/        # Utility functions
├── server/           # Express backend
│   ├── controllers/  # API controllers
│   └── routes/       # API routes
└── data/             # Application data storage
```

## License

GNU Affero General Public License v3.0
