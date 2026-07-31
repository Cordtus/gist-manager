# Repository Guidelines

## Project Structure & Module Organization

`client/` is the React/Vite app: feature components live in `src/components/`, shared session and collection state in `src/contexts/`, API clients in `src/services/`, and styles in `src/styles/`. Keep feature CSS imported by the feature that owns it so route splitting remains effective. `server/` is the Express workspace; persistent shared-gist data belongs under `data/`, never in source modules. Root scripts coordinate the Bun workspaces.

## Build, Test, and Development Commands

Use Bun with the checked-in lockfile:

```fish
bun install --frozen-lockfile  # Install workspace dependencies
bun run dev                    # Run client and server together
bun run test                   # Run the client Vitest suite
bun run lint                   # Check client and server with Biome
bun run build                  # Build the client and copy it for the server
```

For a focused client test, run `bun ../node_modules/vitest/vitest.mjs run src/path/file.test.jsx` from `client/`. The production build enforces a 350 KiB initial-JavaScript budget; keep non-dashboard routes lazy-loaded and put heavyweight editor/viewer dependencies behind those routes.

## Coding Style & Naming Conventions

Use the existing JavaScript/JSX conventions: tabs, single quotes, trailing commas, and named functions or descriptive callbacks. Components and contexts use PascalCase filenames (`GistDataContext.jsx`); hooks begin with `use`; utilities and API modules use camelCase filenames. Prefer context-owned data flows over duplicate component fetches. Cache identity must use the user ID, never an OAuth token; do not write credentials, tokens, or complete private-file contents to IndexedDB, logs, fixtures, or commits.

## Testing Guidelines

Use Vitest and React Testing Library. Test an observable user or API outcome and name the realistic wrong behavior it rejects. Start production behavior changes with a failing focused test, then run the nearest suite, `bun run lint`, and the client build. Avoid tests that only assert imports, text, call counts, or source structure. Reset storage and mocks in test setup; do not rely on network access or timing sleeps.

## Commit & Pull Request Guidelines

Recent history uses short imperative subjects such as `feat: add paged gist cache service` and `fix: coalesce forced gist refreshes`. Keep commits focused. PRs should explain user-visible behavior, cache/auth implications, tests and build evidence, and include screenshots for UI changes. Never add deployment credentials or local environment files.
