#!/usr/bin/env node
/**
 * Fully Automated Vercel Deployment Monitor & Fixer
 * Uses Vercel API to fetch errors and fix automatically
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

const VERCEL_TOKEN = 'VJzwLF96o9SHgZX2yBibJsBH';
const PROJECT_NAME = 'PattyShack';

class AutomatedVercelFixer {
  constructor() {
    this.maxAttempts = 15;
    this.attemptCount = 0;
    this.fixesApplied = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    const prefix = { info: 'ℹ', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async vercelApi(endpoint, method = 'GET') {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.vercel.com',
        path: endpoint,
        method: method,
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async getLatestDeployment() {
    try {
      this.log('Fetching latest deployment from Vercel API...');

      // Get user info first to find team/user ID
      const user = await this.vercelApi('/v2/user');

      if (user.error) {
        this.log(`API Error: ${user.error.message}`, 'error');
        return null;
      }

      this.log(`Authenticated as: ${user.username || user.email}`);

      // Get deployments
      const deployments = await this.vercelApi('/v6/deployments?limit=5');

      if (deployments.error) {
        this.log(`Failed to get deployments: ${deployments.error.message}`, 'error');
        return null;
      }

      if (!deployments.deployments || deployments.deployments.length === 0) {
        this.log('No deployments found', 'warning');
        return null;
      }

      // Find the most recent deployment
      const latest = deployments.deployments[0];
      this.log(`Latest deployment: ${latest.url}`);
      this.log(`State: ${latest.state} | Ready State: ${latest.readyState}`);

      return latest;
    } catch (error) {
      this.log(`Error fetching deployment: ${error.message}`, 'error');
      return null;
    }
  }

  async getDeploymentLogs(deploymentId) {
    try {
      this.log('Fetching build logs...');

      const logs = await this.vercelApi(`/v2/deployments/${deploymentId}/events`);

      if (logs.error) {
        this.log(`Failed to get logs: ${logs.error.message}`, 'error');
        return '';
      }

      // Combine all log messages
      let logText = '';
      if (Array.isArray(logs)) {
        logText = logs.map(event => event.text || event.payload?.text || '').join('\n');
      }

      return logText;
    } catch (error) {
      this.log(`Error fetching logs: ${error.message}`, 'error');
      return '';
    }
  }

  analyzeError(logs) {
    const errors = [];

    // Pattern: Double frontend path
    if (logs.includes('frontend/frontend')) {
      errors.push({
        type: 'DOUBLE_PATH',
        message: 'Double frontend/frontend path detected',
        fix: 'fixDoubleFrontendPath',
        priority: 1
      });
    }

    // Pattern: ENOENT
    if (logs.includes('ENOENT') || logs.includes('no such file or directory')) {
      errors.push({
        type: 'ENOENT',
        message: 'File not found error',
        fix: 'fixFileNotFound',
        priority: 2
      });
    }

    // Pattern: Build command failed
    if (logs.includes('exited with')) {
      errors.push({
        type: 'BUILD_FAILED',
        message: 'Build command failed',
        fix: 'fixBuildCommand',
        priority: 3
      });
    }

    // Pattern: npm error
    if (logs.includes('npm error') || logs.includes('npm ERR!')) {
      errors.push({
        type: 'NPM_ERROR',
        message: 'npm installation error',
        fix: 'fixNpmError',
        priority: 2
      });
    }

    // Sort by priority
    return errors.sort((a, b) => a.priority - b.priority);
  }

  async fixDoubleFrontendPath() {
    this.log('FIX: Removing --prefix flags causing path doubling', 'warning');

    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

    vercelConfig.installCommand = 'npm install && (cd frontend && npm install)';
    vercelConfig.buildCommand = 'npm run build';

    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2) + '\n');

    await this.commitAndPush('fix: Remove path doubling in vercel config');
    return true;
  }

  async fixFileNotFound() {
    this.log('FIX: Correcting file paths', 'warning');

    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

    // Ensure correct paths
    vercelConfig.outputDirectory = 'frontend/dist';
    vercelConfig.installCommand = 'npm install && (cd frontend && npm install)';
    vercelConfig.buildCommand = 'npm run build';

    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2) + '\n');

    await this.commitAndPush('fix: Correct file paths in vercel config');
    return true;
  }

  async fixBuildCommand() {
    this.log('FIX: Simplifying build commands', 'warning');

    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

    vercelConfig.buildCommand = 'npm run build';
    vercelConfig.installCommand = 'npm install && (cd frontend && npm install)';

    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2) + '\n');

    await this.commitAndPush('fix: Simplify build command');
    return true;
  }

  async fixNpmError() {
    this.log('FIX: Regenerating package-lock', 'warning');

    if (fs.existsSync('package-lock.json')) {
      fs.unlinkSync('package-lock.json');
      execSync('npm install', { stdio: 'inherit' });
      await this.commitAndPush('fix: Regenerate package-lock.json');
      return true;
    }

    return false;
  }

  async commitAndPush(message) {
    try {
      execSync('git add -A', { stdio: 'pipe' });
      execSync(`git commit -m "${message}"`, { stdio: 'pipe' });
      execSync('git push', { stdio: 'inherit' });
      this.log(`Pushed fix: ${message}`, 'success');
      this.fixesApplied.push(message);
    } catch (error) {
      this.log(`Git operation: ${error.message}`, 'warning');
    }
  }

  async waitForBuildCompletion(deploymentId, maxWait = 180000) {
    this.log('Waiting for build to complete...');
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await this.sleep(10000); // Check every 10 seconds

      try {
        const deployment = await this.vercelApi(`/v13/deployments/${deploymentId}`);

        if (!deployment || deployment.error) {
          continue;
        }

        const state = deployment.readyState;
        this.log(`Build status: ${state}`);

        if (state === 'READY') {
          this.log('✨ BUILD SUCCEEDED! ✨', 'success');
          return { success: true };
        } else if (state === 'ERROR') {
          return { success: false };
        }
      } catch (error) {
        this.log(`Status check error: ${error.message}`, 'warning');
      }
    }

    return { success: false, timeout: true };
  }

  async runAutomatedLoop() {
    this.log('\n🤖 FULLY AUTOMATED VERCEL FIXER STARTED\n', 'success');
    this.log(`Max attempts: ${this.maxAttempts}`);
    this.log(`Token: ${VERCEL_TOKEN.substring(0, 10)}...`);
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    while (this.attemptCount < this.maxAttempts) {
      this.attemptCount++;
      this.log(`\n╔════ Attempt ${this.attemptCount}/${this.maxAttempts} ════╗\n`, 'info');

      // Get latest deployment
      const deployment = await this.getLatestDeployment();

      if (!deployment) {
        this.log('No deployment found, waiting 30s...', 'warning');
        await this.sleep(30000);
        continue;
      }

      // Check if already successful
      if (deployment.readyState === 'READY') {
        this.log('\n🎉 DEPLOYMENT ALREADY SUCCESSFUL! 🎉\n', 'success');
        this.log(`URL: https://${deployment.url}`);
        return true;
      }

      // If building, wait for completion
      if (deployment.readyState === 'QUEUED' || deployment.readyState === 'BUILDING') {
        const result = await this.waitForBuildCompletion(deployment.uid);

        if (result.success) {
          this.log('\n🎉 BUILD SUCCESSFUL! 🎉\n', 'success');
          this.log(`Total fixes applied: ${this.fixesApplied.length}`);
          this.fixesApplied.forEach((fix, i) => {
            this.log(`  ${i + 1}. ${fix}`);
          });
          return true;
        }
      }

      // Get logs if failed
      this.log('\nFetching error logs...');
      const logs = await this.getDeploymentLogs(deployment.uid);

      if (!logs) {
        this.log('No logs available yet, waiting...', 'warning');
        await this.sleep(20000);
        continue;
      }

      // Show log excerpt
      this.log('\n--- Error Log Excerpt ---');
      console.log(logs.substring(logs.length - 500));
      this.log('--- End Excerpt ---\n');

      // Analyze errors
      const errors = this.analyzeError(logs);

      if (errors.length === 0) {
        this.log('No recognized error patterns found', 'warning');
        this.log('Waiting 30s before retry...');
        await this.sleep(30000);
        continue;
      }

      this.log(`\nDetected ${errors.length} error(s):`);
      errors.forEach((err, i) => {
        this.log(`  ${i + 1}. [${err.type}] ${err.message}`, 'warning');
      });

      // Apply highest priority fix
      const errorToFix = errors[0];
      this.log(`\nApplying fix for: ${errorToFix.type}`);

      if (this[errorToFix.fix]) {
        const success = await this[errorToFix.fix](errorToFix);

        if (success) {
          this.log('✓ Fix applied and pushed!', 'success');
          this.log('Waiting 30s for new deployment...');
          await this.sleep(30000);
        } else {
          this.log('✗ Fix failed', 'error');
          await this.sleep(15000);
        }
      } else {
        this.log(`No fix handler for: ${errorToFix.fix}`, 'error');
        break;
      }
    }

    if (this.attemptCount >= this.maxAttempts) {
      this.log(`\n❌ Max attempts reached without success`, 'error');
    }

    return false;
  }
}

// Run immediately
const fixer = new AutomatedVercelFixer();
fixer.runAutomatedLoop()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
