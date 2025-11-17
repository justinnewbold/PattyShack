#!/usr/bin/env node
/**
 * Automated Vercel Deployment Monitor & Fixer
 *
 * Monitors Vercel deployments, detects errors, and automatically applies fixes
 * until deployment succeeds.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class VercelDeploymentFixer {
  constructor() {
    this.maxAttempts = 10;
    this.attemptCount = 0;
    this.fixesApplied = [];
    this.projectPath = process.cwd();
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'
    };

    const prefix = {
      info: 'ℹ',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };

    console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getLatestDeployment() {
    try {
      this.log('Fetching latest deployment...');
      const result = execSync('vercel ls --json', {
        encoding: 'utf8',
        cwd: this.projectPath
      });

      const deployments = JSON.parse(result);
      if (deployments && deployments.length > 0) {
        return deployments[0];
      }
      return null;
    } catch (error) {
      this.log(`Failed to get deployments: ${error.message}`, 'error');
      return null;
    }
  }

  async getDeploymentLogs(deploymentUrl) {
    try {
      this.log('Fetching deployment logs...');
      const result = execSync(`vercel logs ${deploymentUrl}`, {
        encoding: 'utf8',
        cwd: this.projectPath,
        timeout: 30000
      });
      return result;
    } catch (error) {
      // Logs command may fail, return error output
      return error.stdout || error.stderr || error.message;
    }
  }

  analyzeError(logs) {
    const errors = [];

    // Pattern: Double frontend path
    if (logs.includes('frontend/frontend/package.json')) {
      errors.push({
        type: 'DOUBLE_PATH',
        pattern: 'frontend/frontend',
        message: 'Double frontend path detected',
        fix: 'fixDoubleFrontendPath'
      });
    }

    // Pattern: ENOENT errors
    if (logs.includes('ENOENT') || logs.includes('no such file or directory')) {
      errors.push({
        type: 'ENOENT',
        message: 'File not found error',
        fix: 'fixFileNotFound'
      });
    }

    // Pattern: Module not found
    const moduleMatch = logs.match(/Cannot find module '(.+?)'/);
    if (moduleMatch) {
      errors.push({
        type: 'MODULE_NOT_FOUND',
        module: moduleMatch[1],
        message: `Module not found: ${moduleMatch[1]}`,
        fix: 'fixMissingModule'
      });
    }

    // Pattern: Build command failed
    if (logs.includes('Command') && logs.includes('exited with')) {
      errors.push({
        type: 'BUILD_COMMAND_FAILED',
        message: 'Build command failed',
        fix: 'fixBuildCommand'
      });
    }

    // Pattern: npm install failed
    if (logs.includes('npm ERR!') || logs.includes('npm error')) {
      errors.push({
        type: 'NPM_ERROR',
        message: 'npm error detected',
        fix: 'fixNpmError'
      });
    }

    // Pattern: Vite build errors
    if (logs.includes('vite') && (logs.includes('error') || logs.includes('failed'))) {
      errors.push({
        type: 'VITE_BUILD_ERROR',
        message: 'Vite build error',
        fix: 'fixViteBuild'
      });
    }

    return errors;
  }

  async fixDoubleFrontendPath() {
    this.log('Applying fix: Double frontend path', 'warning');

    try {
      const vercelConfig = JSON.parse(
        fs.readFileSync('vercel.json', 'utf8')
      );

      // Fix installCommand
      if (vercelConfig.installCommand && vercelConfig.installCommand.includes('--prefix')) {
        vercelConfig.installCommand = 'npm install && (cd frontend && npm install)';
        this.log('Updated installCommand to use subshell');
      }

      // Fix buildCommand
      if (vercelConfig.buildCommand && vercelConfig.buildCommand.includes('--prefix')) {
        vercelConfig.buildCommand = 'npm run build';
        this.log('Updated buildCommand to use npm script');
      }

      fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2) + '\n');

      await this.commitAndPush('fix: Remove --prefix to prevent path doubling');
      return true;
    } catch (error) {
      this.log(`Fix failed: ${error.message}`, 'error');
      return false;
    }
  }

  async fixFileNotFound() {
    this.log('Applying fix: File not found', 'warning');

    // Check directory structure
    if (!fs.existsSync('frontend')) {
      this.log('Frontend directory missing!', 'error');
      return false;
    }

    if (!fs.existsSync('frontend/package.json')) {
      this.log('frontend/package.json missing!', 'error');
      return false;
    }

    // Verify vercel.json configuration
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

    let changed = false;

    // Ensure correct output directory
    if (vercelConfig.outputDirectory !== 'frontend/dist') {
      vercelConfig.outputDirectory = 'frontend/dist';
      changed = true;
    }

    if (changed) {
      fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2) + '\n');
      await this.commitAndPush('fix: Correct output directory path');
      return true;
    }

    return false;
  }

  async fixMissingModule(error) {
    const moduleName = error.module;
    this.log(`Applying fix: Install missing module ${moduleName}`, 'warning');

    try {
      execSync(`npm install ${moduleName}`, {
        stdio: 'inherit',
        cwd: this.projectPath
      });
      await this.commitAndPush(`fix: Add missing dependency ${moduleName}`);
      return true;
    } catch (e) {
      this.log(`Failed to install ${moduleName}`, 'error');
      return false;
    }
  }

  async fixBuildCommand() {
    this.log('Applying fix: Build command', 'warning');

    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

    // Use npm scripts from package.json
    vercelConfig.buildCommand = 'npm run build';
    vercelConfig.installCommand = 'npm install && (cd frontend && npm install)';

    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2) + '\n');
    await this.commitAndPush('fix: Simplify build commands to use npm scripts');
    return true;
  }

  async fixNpmError() {
    this.log('Applying fix: npm error', 'warning');

    // Check if package-lock.json exists and might be corrupt
    if (fs.existsSync('package-lock.json')) {
      this.log('Regenerating package-lock.json...');
      fs.unlinkSync('package-lock.json');
      execSync('npm install', { stdio: 'inherit', cwd: this.projectPath });
      await this.commitAndPush('fix: Regenerate package-lock.json');
      return true;
    }

    return false;
  }

  async fixViteBuild() {
    this.log('Applying fix: Vite build error', 'warning');

    // Check frontend package.json
    const frontendPkgPath = path.join('frontend', 'package.json');
    if (!fs.existsSync(frontendPkgPath)) {
      this.log('frontend/package.json not found', 'error');
      return false;
    }

    // Ensure vite is installed
    try {
      execSync('npm install vite --prefix frontend', {
        stdio: 'inherit',
        cwd: this.projectPath
      });
      await this.commitAndPush('fix: Ensure Vite is installed');
      return true;
    } catch (e) {
      return false;
    }
  }

  async commitAndPush(message) {
    try {
      execSync('git add -A', { cwd: this.projectPath });
      execSync(`git commit -m "${message}"`, { cwd: this.projectPath });
      execSync('git push', { cwd: this.projectPath });
      this.log(`Committed and pushed: ${message}`, 'success');
    } catch (error) {
      // Might fail if no changes
      this.log(`Commit/push: ${error.message}`, 'warning');
    }
  }

  async waitForDeployment(deploymentUrl, maxWait = 300000) {
    this.log('Waiting for deployment to complete...');
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        const result = execSync(`vercel inspect ${deploymentUrl} --json`, {
          encoding: 'utf8',
          cwd: this.projectPath
        });

        const deployment = JSON.parse(result);

        if (deployment.readyState === 'READY') {
          this.log('Deployment succeeded!', 'success');
          return { success: true, deployment };
        } else if (deployment.readyState === 'ERROR') {
          this.log('Deployment failed', 'error');
          return { success: false, deployment };
        }

        await this.sleep(5000); // Wait 5 seconds before checking again
      } catch (error) {
        this.log('Error checking deployment status', 'warning');
        await this.sleep(5000);
      }
    }

    return { success: false, timeout: true };
  }

  async runFixLoop() {
    this.log('🚀 Starting Automated Vercel Deployment Fixer', 'info');
    this.log(`Max attempts: ${this.maxAttempts}\n`);

    while (this.attemptCount < this.maxAttempts) {
      this.attemptCount++;
      this.log(`\n═══ Attempt ${this.attemptCount}/${this.maxAttempts} ═══\n`, 'info');

      // Get latest deployment
      const deployment = await this.getLatestDeployment();

      if (!deployment) {
        this.log('No deployments found. Triggering new deployment...', 'warning');
        try {
          execSync('git push', { stdio: 'inherit', cwd: this.projectPath });
          await this.sleep(10000);
          continue;
        } catch (error) {
          this.log('Failed to trigger deployment', 'error');
          break;
        }
      }

      this.log(`Deployment URL: ${deployment.url}`);
      this.log(`State: ${deployment.state}`);

      // Wait for deployment to complete
      const result = await this.waitForDeployment(deployment.url);

      if (result.success) {
        this.log('\n🎉 DEPLOYMENT SUCCESSFUL! 🎉\n', 'success');
        this.log(`Fixes applied: ${this.fixesApplied.length}`);
        this.fixesApplied.forEach((fix, i) => {
          this.log(`  ${i + 1}. ${fix}`);
        });
        return true;
      }

      // Get logs and analyze errors
      const logs = await this.getDeploymentLogs(deployment.url);
      const errors = this.analyzeError(logs);

      if (errors.length === 0) {
        this.log('No recognized errors found in logs', 'warning');
        this.log('\nDeployment logs excerpt:');
        console.log(logs.substring(0, 500));
        break;
      }

      this.log(`\nFound ${errors.length} error(s):`);
      errors.forEach((err, i) => {
        this.log(`  ${i + 1}. ${err.type}: ${err.message}`, 'warning');
      });

      // Apply fixes
      let fixApplied = false;
      for (const error of errors) {
        if (this[error.fix]) {
          const success = await this[error.fix](error);
          if (success) {
            this.fixesApplied.push(error.message);
            fixApplied = true;
            this.log(`Fix applied successfully!`, 'success');
            break; // Apply one fix at a time
          }
        }
      }

      if (!fixApplied) {
        this.log('No fixes could be applied', 'error');
        break;
      }

      // Wait before next attempt
      this.log('\nWaiting 15 seconds before next check...');
      await this.sleep(15000);
    }

    if (this.attemptCount >= this.maxAttempts) {
      this.log(`\n❌ Max attempts (${this.maxAttempts}) reached without success`, 'error');
    }

    return false;
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new VercelDeploymentFixer();

  fixer.runFixLoop().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = VercelDeploymentFixer;
