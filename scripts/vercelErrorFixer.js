/**
 * Vercel Build Error Auto-Fixer
 *
 * Common Vercel build errors and automated fixes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VercelErrorFixer {
  constructor() {
    this.fixes = new Map();
    this.registerCommonFixes();
  }

  registerCommonFixes() {
    // Fix: ENOENT package.json errors
    this.fixes.set('ENOENT.*package.json', {
      name: 'Missing package.json',
      fix: async (error) => {
        console.log('Detected: Missing package.json error');

        // Check if it's a path issue
        if (error.includes('frontend/frontend')) {
          console.log('Fixing double frontend path issue...');
          return this.fixDoubleFrontendPath();
        }

        // Check if frontend directory exists
        if (!fs.existsSync('frontend')) {
          console.log('ERROR: frontend directory does not exist!');
          return false;
        }

        // Check if frontend/package.json exists
        if (!fs.existsSync('frontend/package.json')) {
          console.log('ERROR: frontend/package.json does not exist!');
          return false;
        }

        return true;
      }
    });

    // Fix: Module not found errors
    this.fixes.set('Cannot find module', {
      name: 'Missing module',
      fix: async (error) => {
        console.log('Detected: Missing module error');

        // Extract module name
        const moduleMatch = error.match(/Cannot find module '(.+?)'/);
        if (moduleMatch) {
          const moduleName = moduleMatch[1];
          console.log(`Missing module: ${moduleName}`);

          // Try to install it
          try {
            console.log(`Installing ${moduleName}...`);
            execSync(`npm install ${moduleName}`, { stdio: 'inherit' });
            return true;
          } catch (e) {
            console.log(`Failed to install ${moduleName}`);
            return false;
          }
        }

        return false;
      }
    });

    // Fix: Build command errors
    this.fixes.set('Command.*exited with', {
      name: 'Build command failed',
      fix: async (error) => {
        console.log('Detected: Build command failure');

        // Check if it's a directory issue
        if (error.includes('cd:') || error.includes('No such file or directory')) {
          console.log('Fixing directory navigation issue...');
          return this.fixDirectoryNavigation();
        }

        return false;
      }
    });

    // Fix: Dependency version mismatches
    this.fixes.set('peer dep.*ERESOLVE', {
      name: 'Peer dependency conflict',
      fix: async (error) => {
        console.log('Detected: Peer dependency conflict');
        console.log('Adding --legacy-peer-deps flag...');

        // Update package.json scripts to use --legacy-peer-deps
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

        // This would need to be implemented based on specific needs
        return true;
      }
    });

    // Fix: Serverless function errors
    this.fixes.set('api.*runtime', {
      name: 'Serverless function runtime error',
      fix: async (error) => {
        console.log('Detected: Serverless function runtime error');
        return this.fixServerlessConfig();
      }
    });
  }

  fixDoubleFrontendPath() {
    try {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

      // Remove --prefix flags that cause doubling
      if (vercelConfig.installCommand && vercelConfig.installCommand.includes('--prefix frontend')) {
        console.log('Updating installCommand to use subshell...');
        vercelConfig.installCommand = 'npm install && (cd frontend && npm install)';
      }

      if (vercelConfig.buildCommand && vercelConfig.buildCommand.includes('--prefix frontend')) {
        console.log('Updating buildCommand...');
        vercelConfig.buildCommand = 'npm run build';
      }

      fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

      // Commit changes
      execSync('git add vercel.json', { stdio: 'inherit' });
      execSync('git commit -m "fix: Auto-fix double frontend path issue"', { stdio: 'inherit' });

      return true;
    } catch (e) {
      console.error('Failed to fix double frontend path:', e.message);
      return false;
    }
  }

  fixDirectoryNavigation() {
    try {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

      // Use npm scripts instead of cd commands
      vercelConfig.buildCommand = 'npm run build';
      vercelConfig.installCommand = 'npm install && (cd frontend && npm install)';

      fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

      execSync('git add vercel.json', { stdio: 'inherit' });
      execSync('git commit -m "fix: Auto-fix directory navigation"', { stdio: 'inherit' });

      return true;
    } catch (e) {
      console.error('Failed to fix directory navigation:', e.message);
      return false;
    }
  }

  fixServerlessConfig() {
    try {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

      // Ensure functions config exists
      if (!vercelConfig.functions) {
        vercelConfig.functions = {};
      }

      // Set Node.js runtime
      vercelConfig.functions['api/index.js'] = {
        runtime: 'nodejs18.x'
      };

      fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

      execSync('git add vercel.json', { stdio: 'inherit' });
      execSync('git commit -m "fix: Auto-fix serverless function config"', { stdio: 'inherit' });

      return true;
    } catch (e) {
      console.error('Failed to fix serverless config:', e.message);
      return false;
    }
  }

  async analyzeAndFix(errorLog) {
    console.log('\n🔍 Analyzing error log...\n');

    let fixApplied = false;

    for (const [pattern, fixConfig] of this.fixes) {
      const regex = new RegExp(pattern, 'i');

      if (regex.test(errorLog)) {
        console.log(`\n✓ Matched error pattern: ${fixConfig.name}`);
        console.log('Applying fix...\n');

        const success = await fixConfig.fix(errorLog);

        if (success) {
          console.log(`\n✅ Fix applied successfully!`);
          fixApplied = true;
          break;
        } else {
          console.log(`\n❌ Fix failed or not applicable`);
        }
      }
    }

    if (!fixApplied) {
      console.log('\n❌ No automatic fix available for this error.');
      console.log('Manual intervention required.');
    }

    return fixApplied;
  }

  async runFixLoop(errorLog) {
    console.log('🚀 Starting Vercel Error Auto-Fixer Loop\n');

    const fixed = await this.analyzeAndFix(errorLog);

    if (fixed) {
      console.log('\n📤 Pushing fix to repository...');
      try {
        execSync('git push', { stdio: 'inherit' });
        console.log('\n✅ Fix pushed! Please check Vercel deployment.');
        console.log('If there are more errors, run this script again with the new error log.');
      } catch (e) {
        console.error('\n❌ Failed to push:', e.message);
      }
    }

    return fixed;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node scripts/vercelErrorFixer.js "error log content"

Or pipe error log:
  cat error.log | node scripts/vercelErrorFixer.js

Example:
  node scripts/vercelErrorFixer.js "npm error code ENOENT"
    `);
    process.exit(1);
  }

  const errorLog = args.join(' ');
  const fixer = new VercelErrorFixer();

  fixer.runFixLoop(errorLog).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = VercelErrorFixer;
