#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Validating Gist Manager setup...${NC}"

errors=()
warnings=()

# Check Node.js version
node_version=$(node -v 2>/dev/null | sed 's/v//')
if [ -z "$node_version" ]; then
    errors+=("Node.js is not installed")
else
    major_version=$(echo $node_version | cut -d. -f1)
    if [ "$major_version" -lt 16 ]; then
        errors+=("Node.js version $node_version is too old (requires 16+)")
    else
        echo -e "${GREEN}✅ Node.js $node_version${NC}"
    fi
fi

# Check Yarn
if ! command -v yarn &> /dev/null; then
    errors+=("Yarn is not installed")
else
    echo -e "${GREEN}✅ Yarn $(yarn -v)${NC}"
fi

# Check environment files
env_files=(".env" "client/.env" "server/.env")
for file in "${env_files[@]}"; do
    if [ ! -f "$file" ]; then
        errors+=("Missing $file")
    else
        if grep -q "your_github_client_id" "$file"; then
            errors+=("GitHub credentials not configured in $file")
        else
            echo -e "${GREEN}✅ $file configured${NC}"
        fi
    fi
done

# Check dependencies
dep_dirs=("node_modules" "client/node_modules" "server/node_modules")
for dir in "${dep_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        warnings+=("Dependencies not installed in $dir")
    else
        echo -e "${GREEN}✅ Dependencies in $dir${NC}"
    fi
done

# Check build
if [ ! -d "client/build" ]; then
    warnings+=("Client build not found")
else
    echo -e "${GREEN}✅ Client build exists${NC}"
fi

# Check if ports are available
if command -v lsof &> /dev/null; then
    if lsof -i:3020 &> /dev/null; then
        warnings+=("Port 3020 is already in use")
    fi
    if lsof -i:5000 &> /dev/null; then
        warnings+=("Port 5000 is already in use")
    fi
fi

# Report results
echo
if [ ${#errors[@]} -gt 0 ]; then
    echo -e "${RED}❌ Errors found:${NC}"
    for error in "${errors[@]}"; do
        echo -e "${RED}  • $error${NC}"
    done
    echo
fi

if [ ${#warnings[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings:${NC}"
    for warning in "${warnings[@]}"; do
        echo -e "${YELLOW}  • $warning${NC}"
    done
    echo
fi

if [ ${#errors[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 Setup validation complete!${NC}"
    if [ ${#warnings[@]} -eq 0 ]; then
        echo -e "${GREEN}Ready to run: yarn dev${NC}"
    else
        echo -e "${YELLOW}You may want to address the warnings above${NC}"
    fi
    exit 0
else
    echo -e "${RED}Please fix the errors above before proceeding${NC}"
    exit 1
fi
