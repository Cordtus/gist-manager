# Automatic Deployment Setup

This guide explains how to set up automatic deployments for the Gist Manager application.

## Overview

The system supports three deployment methods:
1. **Timer-based updates** - Checks for updates every 12 hours
2. **GitHub Webhooks** - Instant deployment on push to main
3. **Manual updates** - Run update script manually

## Current Setup Files

### 1. Update Service (`/etc/systemd/system/gist-manager-update.service`)

```ini
[Unit]
Description=Update Gist Manager code and rebuild
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/opt/gist-manager
User=root
Environment=HOME=/root
ExecStart=/bin/bash -c "\
  git fetch origin main && \
  LOCAL=$(git rev-parse @) && \
  REMOTE=$(git rev-parse @{u}) && \
  if [ \"$LOCAL\" = \"$REMOTE\" ]; then \
    echo 'No new commits; skipping update'; \
    exit 0; \
  fi && \
  echo 'New commits detected, updating...' && \
  git pull origin main && \
  cd client && \
  yarn install && \
  REACT_APP_BACKEND_URL='' yarn build && \
  rm -rf ../server/build && \
  cp -r build ../server/ && \
  cd ../server && \
  yarn install --production && \
  chown -R gistui:gistui /opt/gist-manager && \
  systemctl restart gist-manager.service && \
  echo 'Update complete, service restarted'"

StandardOutput=journal
StandardError=journal
```

### 2. Update Timer (`/etc/systemd/system/gist-manager-update.timer`)

```ini
[Unit]
Description=Timer to update Gist Manager every 12 hours

[Timer]
OnBootSec=10min
OnUnitActiveSec=12h
Persistent=true

[Install]
WantedBy=timers.target
```

## Installation Instructions

### Step 1: Update the systemd service files

```bash
# SSH into your server
ssh cordt@192.168.0.235

# Switch to root
sudo su

# Update the service file
cat > /etc/systemd/system/gist-manager-update.service << 'EOF'
[Unit]
Description=Update Gist Manager code and rebuild
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/opt/gist-manager
User=root
Environment=HOME=/root
ExecStart=/bin/bash -c "\
  git fetch origin main && \
  LOCAL=$(git rev-parse @) && \
  REMOTE=$(git rev-parse @{u}) && \
  if [ \"$LOCAL\" = \"$REMOTE\" ]; then \
    echo 'No new commits; skipping update'; \
    exit 0; \
  fi && \
  echo 'New commits detected, updating...' && \
  git pull origin main && \
  cd client && \
  yarn install && \
  REACT_APP_BACKEND_URL='' yarn build && \
  rm -rf ../server/build && \
  cp -r build ../server/ && \
  cd ../server && \
  yarn install --production && \
  chown -R gistui:gistui /opt/gist-manager && \
  systemctl restart gist-manager.service && \
  echo 'Update complete, service restarted'"

StandardOutput=journal
StandardError=journal
EOF

# Reload systemd
systemctl daemon-reload

# Enable the timer (if not already enabled)
systemctl enable gist-manager-update.timer
systemctl start gist-manager-update.timer
```

### Step 2: Install the manual update script

```bash
# Create scripts directory
mkdir -p /opt/gist-manager/scripts

# Copy the update script
cat > /opt/gist-manager/scripts/update-and-deploy.sh << 'EOF'
[paste contents of scripts/update-and-deploy.sh here]
EOF

# Make it executable
chmod +x /opt/gist-manager/scripts/update-and-deploy.sh
```

### Step 3: Set up GitHub Webhook (Optional)

1. Add webhook secret to environment:
```bash
echo "GITHUB_WEBHOOK_SECRET=your-secret-here" >> /opt/gist-manager/.env
```

2. Restart the service to load new environment:
```bash
systemctl restart gist-manager
```

3. In your GitHub repository:
   - Go to Settings → Webhooks → Add webhook
   - Payload URL: `https://gistmd.basementnodes.ca/api/webhook/github`
   - Content type: `application/json`
   - Secret: (use the same secret from step 1)
   - Events: Select "Just the push event"
   - Active: ✓

## Usage

### Manual Update
```bash
# As root or with sudo
/opt/gist-manager/scripts/update-and-deploy.sh
```

### Check Timer Status
```bash
systemctl status gist-manager-update.timer
systemctl list-timers | grep gist-manager
```

### View Update Logs
```bash
# View last update attempt
journalctl -u gist-manager-update.service -n 50

# Follow logs in real-time
journalctl -u gist-manager-update.service -f
```

### Test Update Service
```bash
# Manually trigger the update service
systemctl start gist-manager-update.service

# Check status
systemctl status gist-manager-update.service
```

### Test Webhook
```bash
# Check webhook health
curl https://gistmd.basementnodes.ca/api/webhook/health
```

## Troubleshooting

### Update fails with permission errors
```bash
# Fix ownership
chown -R gistui:gistui /opt/gist-manager
chmod -R 755 /opt/gist-manager
```

### Timer not running
```bash
systemctl enable gist-manager-update.timer
systemctl start gist-manager-update.timer
```

### Webhook not triggering
1. Check webhook secret is configured:
```bash
grep GITHUB_WEBHOOK_SECRET /opt/gist-manager/.env
```

2. Check webhook logs:
```bash
journalctl -u gist-manager | grep Webhook
```

3. Verify webhook endpoint:
```bash
curl https://gistmd.basementnodes.ca/api/webhook/health
```