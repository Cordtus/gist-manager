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
   yarn install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your GitHub OAuth credentials:

   ```shell
   REACT_APP_GITHUB_CLIENT_ID=your_client_id
   REACT_APP_GITHUB_CLIENT_SECRET=your_client_secret
   ```

## Running the Application

(*optional*) Start server+application in development mode:

   ```shell
   yarn dev
   ```

2. Start the backend server:

   ```shell
   yarn server
   ```

3. In a new terminal, build and start the React frontend:

   ```shell
   yarn build
   yarn start
   ```

4. Open `http://localhost:3000` in your browser.

## Testing

To run tests:

```shell
yarn test
```

## Contributing

To contribute please make a PR. I hope to maintain this one longer than the other short-lived free-to-use Gist manager prjects.

## License

This project is licensed under the GNU Affero General Public License v3.0. See the [LICENSE](https://github.com/Cordtus/gist-manager/blob/main/LICENSE) file for details.
