// GitHub webhook handler for automatic deployments
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const logger = require('../utils/logger');
const router = express.Router();

// Verify GitHub webhook signature
const verifyWebhookSignature = (payload, signature, secret) => {
  if (!signature || !secret) return false;
  
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const expectedSignature = `sha256=${hash}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// POST /api/webhook/github
router.post('/github', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  // If webhook secret is not configured, reject
  if (!secret) {
    logger.warn('Webhook secret not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  // Verify signature
  const payload = JSON.stringify(req.body);
  if (!verifyWebhookSignature(payload, signature, secret)) {
    logger.warn('Invalid webhook signature received');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Check if this is a push to main branch
  if (req.body.ref !== 'refs/heads/main') {
    logger.debug(`Ignoring push to ${req.body.ref}`);
    return res.json({ message: 'Not main branch, ignoring' });
  }

  logger.info('Valid push to main branch detected', {
    commit: req.body.after?.substring(0, 7),
    pusher: req.body.pusher?.name
  });

  // Trigger update in the background
  res.json({ message: 'Deployment triggered' });

  // Run update script
  exec('systemctl start gist-manager-update.service', (error, stdout, stderr) => {
    if (error) {
      logger.error('Failed to trigger update service', { error: error.message });
      return;
    }
    logger.info('Update service triggered successfully');
    if (stdout) logger.debug('Update stdout', { stdout });
    if (stderr) logger.warn('Update stderr', { stderr });
  });
});

// GET /api/webhook/health
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    webhook_configured: !!process.env.GITHUB_WEBHOOK_SECRET
  });
});

module.exports = router;