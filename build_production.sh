#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Building PayVia Gateway for Hostinger (payvia360.com)..."
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT_DIR/dist_production"

# 1. Clean previous build
rm -rf "$DIST_DIR"
rm -f "$ROOT_DIR/payvia360-deploy.zip"
mkdir -p "$DIST_DIR"

# 2. Build Frontend (Vite + React)
echo "\n📦 [1/4] Building Frontend..."
cd "$ROOT_DIR/frontend"
npm install
npm run build

# 3. Build Backend (TypeScript -> JS)
echo "\n📦 [2/4] Building Backend..."
cd "$ROOT_DIR/backend"
npm install
npm run build

# 4. Prepare Production Distribution Folder
echo "\n📦 [3/4] Packaging deployment bundle..."
mkdir -p "$DIST_DIR/backend"
mkdir -p "$DIST_DIR/frontend"

# Copy backend files
cp -r "$ROOT_DIR/backend/dist" "$DIST_DIR/backend/dist"
cp "$ROOT_DIR/backend/package.json" "$DIST_DIR/backend/package.json"
cp "$ROOT_DIR/backend/.env.production" "$DIST_DIR/backend/.env"
if [ -d "$ROOT_DIR/backend/data" ]; then
  cp -r "$ROOT_DIR/backend/data" "$DIST_DIR/backend/data"
fi

# Copy frontend build output
cp -r "$ROOT_DIR/frontend/dist" "$DIST_DIR/frontend/dist"
cp -r "$ROOT_DIR/frontend/dist" "$DIST_DIR/public_html"

# Copy ecosystem configuration & server launcher
cp "$ROOT_DIR/ecosystem.config.cjs" "$DIST_DIR/ecosystem.config.cjs"

# Create root package.json for Hostinger hPanel Node.js Application Manager
cat << 'EOF' > "$DIST_DIR/package.json"
{
  "name": "payvia360-production",
  "version": "1.0.0",
  "description": "PayVia Gateway Production Deployment on Hostinger (payvia360.com)",
  "main": "backend/dist/server.js",
  "scripts": {
    "start": "node backend/dist/server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "qrcode": "^1.5.3",
    "uuid": "^9.0.1",
    "ws": "^8.17.0"
  }
}
EOF

# Copy .htaccess to public_html and root
if [ -f "$ROOT_DIR/frontend/public/.htaccess" ]; then
  cp "$ROOT_DIR/frontend/public/.htaccess" "$DIST_DIR/public_html/.htaccess"
  cp "$ROOT_DIR/frontend/public/.htaccess" "$DIST_DIR/.htaccess"
fi

# 5. Create Zip Archive for Hostinger File Manager Upload
echo "\n📦 [4/4] Creating payvia360-deploy.zip..."
cd "$DIST_DIR"
zip -r "$ROOT_DIR/payvia360-deploy.zip" ./* .htaccess

echo "\n=========================================================="
echo "✅ Build Complete! Deployment archive ready:"
echo "📁 $ROOT_DIR/payvia360-deploy.zip"
echo "=========================================================="
