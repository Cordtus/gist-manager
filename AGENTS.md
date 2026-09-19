# Repository Guidelines

## Build, Test, and Development Commands

Bun workspaces (`client/`, `server/`); Node 24+ required. Install with the checked-in lockfile.

```fish
bun install --frozen-lockfile  # Install workspace dependencies
bun run dev                    # Client on :3020 (proxies /api -> :5000) + server on :5000
bun run test                   # WARNING: Vitest watch mode, does not exit
bun run --cwd client test:run  # One-shot suite (what CI runs)
bun run --cwd client test:run -- src/services/api/auth.test.js  # Single file
bun test scripts/update-production.test.ts  # Updater tests (bun:test; root test script does not run these)
bun run lint                   # Biome check of client/src + server
bun run --cwd client build     # Vite build; fails if entry JS exceeds 350 KiB
bun run build                  # Client build then cp client/build -> server/
```

Vite reads env from the repo root (`envDir` in `client/vite.config.js`), not `client/.env`. OAuth builds need `VITE_GITHUB_CLIENT_ID` and `VITE_REDIRECT_URI` (CI uses dummy values).

## Architecture

- `server/index.js` is a minimal token proxy: `POST /api/auth/token` plus SPA fallback. All gist CRUD goes client -> GitHub API directly; there are no server routes, sessions, or caches to extend.
- OAuth is client-side PKCE (`contexts/AuthContext.jsx`); tokens live in `sessionStorage`. Cache identity is the user ID, never a token.
- Gist reads flow through `services/api/gists.js` (per-user paged in-memory cache with ETags).

## Project Structure

`client/` React/Vite app: feature components in `src/components/`, shared state in `src/contexts/`, API clients in `src/services/`, styles in `src/styles/`, tests beside sources as `*.test.jsx`. Keep feature CSS imported by the owning feature so lazy route splitting stays effective. Production deployment and updater behavior are documented in `README.md`.

## Coding Style

Biome enforces tabs, single quotes, 100-column lines, and trailing commas. Components/contexts use PascalCase filenames, hooks `use*`, utilities/API modules camelCase. Prefer context-owned data flows over duplicate component fetches. Never write credentials, tokens, or complete private-file contents to IndexedDB, logs, fixtures, or commits.

## Testing

Vitest + React Testing Library (jsdom), setup in `src/test/setup.js`. Assert an observable user or API outcome and name the realistic wrong behavior it rejects; avoid tests that only assert imports, text, call counts, or source structure. Start behavior changes with a failing focused test, then run the nearest suite, `bun run lint`, and the client build. Reset storage and mocks in setup; no network access or timing sleeps.

## Commits & PRs

Short imperative subjects (`feat: add paged gist cache service`, `fix: coalesce forced gist refreshes`). Keep commits focused. PRs should explain user-visible behavior, cache/auth implications, test/build evidence, and include screenshots for UI changes. Never commit deployment credentials or local env files.
