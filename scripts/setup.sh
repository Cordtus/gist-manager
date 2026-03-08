#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Gist Manager...${NC}"

# Function to check if file exists and ask for confirmation
check_and_backup() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${YELLOW}⚠️  File $file already exists${NC}"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Create backup
            cp "$file" "$file.backup.$(date +%Y%m%d_%H%M%S)"
            echo -e "${GREEN}✅ Backup created: $file.backup.$(date +%Y%m%d_%H%M%S)${NC}"
            return 0
        else
            echo -e "${YELLOW}⏭️  Skipping $file${NC}"
            return 1
        fi
    fi
    return 0
}

# Function to validate GitHub credentials in env file
validate_github_creds() {
    local file=$1
    if [ -f "$file" ]; then
        if grep -q "your_github_client_id" "$file"; then
            echo -e "${RED}❌ Please update GitHub credentials in $file${NC}"
            return 1
        fi
    fi
    return 0
}

# Generate session secret
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null)

if [ -z "$SESSION_SECRET" ]; then
    echo -e "${RED}❌ Failed to generate session secret. Is Node.js installed?${NC}"
    exit 1
fi

echo -e "${GREEN}🔑 Generated session secret${NC}"

# Check for existing GitHub OAuth credentials
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

if [ -f ".env" ]; then
    GITHUB_CLIENT_ID=$(grep "GITHUB_CLIENT_ID=" .env | cut -d'=' -f2 | tr -d '"' | head -1)
    GITHUB_CLIENT_SECRET=$(grep "GITHUB_CLIENT_SECRET=" .env | cut -d'=' -f2 | tr -d '"' | head -1)
fi

# Prompt for GitHub credentials if not found or are default values
if [ -z "$GITHUB_CLIENT_ID" ] || [ "$GITHUB_CLIENT_ID" = "your_github_client_id" ]; then
    echo -e "${YELLOW}🔗 GitHub OAuth Setup Required${NC}"
    echo "Please provide your GitHub OAuth application credentials:"
    echo "Get them from: https://github.com/settings/developers"
    echo
    read -p "GitHub Client ID: " GITHUB_CLIENT_ID
fi

if [ -z "$GITHUB_CLIENT_SECRET" ] || [ "$GITHUB_CLIENT_SECRET" = "your_github_client_secret" ]; then
    read -s -p "GitHub Client Secret: " GITHUB_CLIENT_SECRET
    echo
fi

# Validate inputs
if [ -z "$GITHUB_CLIENT_ID" ] || [ -z "$GITHUB_CLIENT_SECRET" ]; then
    echo -e "${RED}❌ GitHub credentials are required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub credentials provided${NC}"

# Create root .env
if check_and_backup ".env"; then
    cat > .env << EOF
# GitHub OAuth
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET

# URLs  
REDIRECT_URI=http://localhost:3020/callback
FRONTEND_URL=http://localhost:3020

# Security
SESSION_SECRET=$SESSION_SECRET

# Environment
NODE_ENV=development
EOF
    echo -e "${GREEN}✅ Created root .env${NC}"
fi

# Create client .env
if check_and_backup "client/.env"; then
    mkdir -p client
    cat > client/.env << EOF
# GitHub OAuth (client-side)
REACT_APP_GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
REACT_APP_REDIRECT_URI=http://localhost:3020/callback
REACT_APP_BACKEND_URL=http://localhost:5000

# Development
GENERATE_SOURCEMAP=true
PORT=3020
EOF
    echo -e "${GREEN}✅ Created client/.env${NC}"
fi

# Create server .env
if check_and_backup "server/.env"; then
    mkdir -p server
    cat > server/.env << EOF
# GitHub OAuth
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET

# URLs
REDIRECT_URI=http://localhost:3020/callback
FRONTEND_URL=http://localhost:3020

# Security
SESSION_SECRET=$SESSION_SECRET

# Environment
NODE_ENV=development
PORT=5000
EOF
    echo -e "${GREEN}✅ Created server/.env${NC}"
fi

# Check if all required files exist
echo -e "${BLUE}🔍 Checking configuration...${NC}"

missing_files=()
[ ! -f ".env" ] && missing_files+=("root .env")
[ ! -f "client/.env" ] && missing_files+=("client/.env")
[ ! -f "server/.env" ] && missing_files+=("server/.env")

if [ ${#missing_files[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing configuration files: ${missing_files[*]}${NC}"
    exit 1
fi

# Validate GitHub credentials are not default values
invalid_configs=()
! validate_github_creds ".env" && invalid_configs+=("root .env")
! validate_github_creds "client/.env" && invalid_configs+=("client/.env")  
! validate_github_creds "server/.env" && invalid_configs+=("server/.env")

if [ ${#invalid_configs[@]} -gt 0 ]; then
    echo -e "${RED}❌ Please update GitHub credentials in: ${invalid_configs[*]}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All configuration files are ready${NC}"

# Check if dependencies are installed
echo -e "${BLUE}🔍 Checking dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Root dependencies not installed${NC}"
    echo "Run: yarn install"
    exit 1
fi

if [ ! -d "client/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Client dependencies not installed${NC}"
    echo "Run: yarn install"
    exit 1
fi

if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Server dependencies not installed${NC}"
    echo "Run: yarn install"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies are installed${NC}"

# Check if build exists
if [ ! -d "client/build" ]; then
    echo -e "${YELLOW}⚠️  Client build not found${NC}"
    echo "Building client..."
    yarn build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Client built successfully${NC}"
    else
        echo -e "${RED}❌ Client build failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Client build exists${NC}"
fi

# Final summary
echo
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify your GitHub OAuth app settings:"
echo "   - Homepage URL: http://localhost:3020"
echo "   - Callback URL: http://localhost:3020/callback"
echo
echo "2. Start development:"
echo -e "   ${GREEN}yarn dev${NC}"
echo
echo "3. Open your browser:"
echo "   - Frontend: http://localhost:3020"
echo "   - Backend:  http://localhost:5000"
echo
echo -e "${YELLOW}📝 Note: If you need to change GitHub credentials later,${NC}"
echo -e "${YELLOW}   edit the .env files directly or re-run this script.${NC}"
