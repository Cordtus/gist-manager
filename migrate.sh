#!/bin/bash
set -euo pipefail

REPO_ROOT="/opt/gist-manager"
CLIENT="$REPO_ROOT/client"

echo "=== CRA to Vite migration ==="

cd "$REPO_ROOT"

# ── 1. Update client/package.json ─────────────────────────────────────────────
echo "Updating package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$CLIENT/package.json', 'utf8'));

// Remove CRA deps
delete pkg.dependencies['react-scripts'];

// Remove babel (craco leftover)
delete pkg.devDependencies['@babel/core'];

// Ensure vite deps present
pkg.devDependencies['vite'] = pkg.devDependencies['vite'] || '^5.0.0';
pkg.devDependencies['@vitejs/plugin-react'] = pkg.devDependencies['@vitejs/plugin-react'] || '^4.0.0';

// Rewrite scripts
pkg.scripts = {
  ...pkg.scripts,
  'start': 'vite',
  'build': 'vite build',
  'preview': 'vite preview',
  'test': 'vitest',
  'test:ui': 'vitest --ui',
  'test:run': 'vitest run',
  'test:coverage': 'vitest run --coverage',
};
delete pkg.scripts['eject'];

fs.writeFileSync('$CLIENT/package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('package.json updated');
"

# ── 2. Create vite.config.js ──────────────────────────────────────────────────
echo "Creating vite.config.js..."
cat > "$CLIENT/vite.config.js" << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3020,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  define: {
    // Polyfill process.env for any libraries that use it
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});
EOF

# ── 3. Move index.html to client root and update it ───────────────────────────
echo "Moving index.html..."
cp "$CLIENT/public/index.html" "$CLIENT/index.html"

# Remove %PUBLIC_URL% references and inject vite entry script
node -e "
const fs = require('fs');
let html = fs.readFileSync('$CLIENT/index.html', 'utf8');

// Remove %PUBLIC_URL% from hrefs/srcs
html = html.replace(/%PUBLIC_URL%\//g, '/');
html = html.replace(/%PUBLIC_URL%/g, '');

// Remove the CRA comment blocks
html = html.replace(/<!--[\s\S]*?-->/g, '');

// Add vite entry point before </body>
html = html.replace('</body>', '  <script type=\"module\" src=\"/src/index.jsx\"></script>\n</body>');

fs.writeFileSync('$CLIENT/index.html', html);
console.log('index.html updated');
"

# ── 4. Rename REACT_APP_ env vars to VITE_ in source files ───────────────────
echo "Renaming env vars in source files..."

# All JS/JSX files under src
find "$CLIENT/src" -type f \( -name "*.js" -o -name "*.jsx" \) | while read -r file; do
  if grep -q "REACT_APP_" "$file"; then
    sed -i \
      -e 's/process\.env\.REACT_APP_/import.meta.env.VITE_/g' \
      -e 's/process\.env\.NODE_ENV/import.meta.env.MODE/g' \
      "$file"
    echo "  Updated: $file"
  fi
done

# ── 5. Update .env file ───────────────────────────────────────────────────────
echo "Updating .env file..."
if [ -f "$REPO_ROOT/.env" ]; then
  sed -i 's/^REACT_APP_/VITE_/g' "$REPO_ROOT/.env"
  echo "  .env updated"
fi

if [ -f "$REPO_ROOT/.env.example" ]; then
  sed -i 's/^REACT_APP_/VITE_/g' "$REPO_ROOT/.env.example"
  echo "  .env.example updated"
fi

# ── 6. Update updater service build command ───────────────────────────────────
echo "Updating systemd updater service..."
SVCFILE="/etc/systemd/system/gist-manager-updater.service"
sed -i "s/REACT_APP_BACKEND_URL='' bun run build/VITE_BACKEND_URL='' bun run build/g" "$SVCFILE"
systemctl daemon-reload
echo "  Service updated and reloaded"

# ── 7. Remove craco.config.js if still present ───────────────────────────────
if [ -f "$CLIENT/craco.config.js" ]; then
  rm "$CLIENT/craco.config.js"
  echo "Removed craco.config.js"
fi

# ── 8. Install dependencies with bun ─────────────────────────────────────────
echo "Installing dependencies..."
cd "$CLIENT"
bun install

# ── 9. Test build ─────────────────────────────────────────────────────────────
echo "Running test build..."
VITE_BACKEND_URL='' bun run build

echo "Build succeeded, copying to server..."
rm -rf "$REPO_ROOT/server/build"
cp -r "$CLIENT/build" "$REPO_ROOT/server/"

chown -R gistui:gistui "$REPO_ROOT"

# ── 10. Git commit ────────────────────────────────────────────────────────────
echo "Committing..."
cd "$REPO_ROOT"
git add -A
git commit -m "chore: migrate from CRA to Vite, yarn to bun"

echo ""
echo "=== Migration complete ==="
echo "Restart gist-manager.service to serve the new build:"
echo "  systemctl restart gist-manager.service"
