# Gist Manager

Gist Manager is a web application for managing GitHub Gists with additional features like file conversion and templating.

## Features

- GitHub OAuth integration
- Create, read, update, and delete GitHub Gists
- Convert various file formats to/from Markdown
- Use templates for quick Gist creation

## Prerequisites

- Node.js (v14 or later)
- npm or Yarn package manager
- GitHub account and OAuth application

## Installation

1. Clone the repository:

   ```shell
   git clone https://github.com/yourusername/gist-manager.git
   cd gist-manager
   ```

2. Install dependencies:

   ```shell
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your GitHub OAuth credentials:

   ```shell
   REACT_APP_GITHUB_CLIENT_ID=your_client_id
   REACT_APP_GITHUB_CLIENT_SECRET=your_client_secret
   ```

## Running the Application

1. Start the backend server:

   ```shell
   npm run server
   ```

2. In a new terminal, start the React frontend:

   ```shell
   npm start
   ```

3. Open `http://localhost:3000` in your browser.

## Testing

To run tests:

```shell
npm test
```

## Contributing

To contribute please make a PR. I hope to maintain this one longer than the other short-lived free-to-use Gist manager prjects.

## License

[Add license information here]
