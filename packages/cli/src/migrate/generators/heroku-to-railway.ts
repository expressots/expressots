import fs from "fs";
import path from "path";
import chalk from "chalk";
import type { MigrationOptions } from "../form";
import {
	loadMigrationTemplate,
	buildMigrationVars,
	logTemplateSource,
} from "./template-loader";

export async function generateHerokuToRailway(
	outputDir: string,
	options: MigrationOptions,
): Promise<void> {
	console.log(chalk.yellow("  Generating Heroku → Railway migration..."));
	const vars = buildMigrationVars(options);

	// Generate railway.json
	const railwayConfig = {
		$schema: "https://railway.app/railway.schema.json",
		build: {
			builder: "NIXPACKS",
		},
		deploy: {
			startCommand: String(vars.startCommand),
			healthcheckPath: "/health",
			healthcheckTimeout: 300,
			restartPolicyType: "ON_FAILURE",
			restartPolicyMaxRetries: 10,
		},
	};

	fs.writeFileSync(
		path.join(outputDir, "railway.json"),
		JSON.stringify(railwayConfig, null, 2),
		"utf-8",
	);
	console.log(chalk.green("    ✓ Created railway.json"));

	// Generate environment variable mapping
	if (options.includeSecrets) {
		const envMapping = generateEnvMapping();
		fs.writeFileSync(
			path.join(outputDir, "env-mapping.md"),
			envMapping,
			"utf-8",
		);
		console.log(chalk.green("    ✓ Created env-mapping.md"));
	}

	// Generate migration checklist (try remote template first)
	const checklistResult = await loadMigrationTemplate(
		"heroku",
		"railway",
		"checklist",
		vars,
		() => generateChecklist(options),
	);
	logTemplateSource("MIGRATION_CHECKLIST.md", checklistResult.source);
	fs.writeFileSync(
		path.join(outputDir, "MIGRATION_CHECKLIST.md"),
		checklistResult.content,
		"utf-8",
	);
	console.log(chalk.green("    ✓ Created MIGRATION_CHECKLIST.md"));

	// Generate migration scripts (cross-platform)
	const nodeScript = generateMigrationScriptNode();
	fs.writeFileSync(path.join(outputDir, "migrate.js"), nodeScript, "utf-8");
	console.log(chalk.green("    ✓ Created migrate.js (cross-platform)"));

	// Also generate bash script for Unix users
	const bashScript = generateMigrationScriptBash();
	fs.writeFileSync(path.join(outputDir, "migrate.sh"), bashScript, "utf-8");
	console.log(chalk.green("    ✓ Created migrate.sh (Unix/Mac)"));
}

function generateEnvMapping(): string {
	return `# Environment Variable Mapping: Heroku → Railway

## Common Variable Translations

| Heroku Variable | Railway Variable | Notes |
|-----------------|------------------|-------|
| \`DATABASE_URL\` | \`DATABASE_URL\` | Same format, Railway provides PostgreSQL |
| \`REDIS_URL\` | \`REDIS_URL\` | Same format |
| \`PORT\` | \`PORT\` | Railway sets this automatically |
| \`NODE_ENV\` | \`NODE_ENV\` | Set to \`production\` |
| \`HEROKU_APP_NAME\` | \`RAILWAY_SERVICE_NAME\` | Service name |

## Database Migration

If using Heroku Postgres:
1. Export data: \`heroku pg:backups:capture --app your-app\`
2. Download: \`heroku pg:backups:download --app your-app\`
3. Import to Railway PostgreSQL instance

## Steps to Set Environment Variables

\`\`\`bash
# List Heroku config vars
heroku config --app your-app

# Set Railway variables via CLI
railway variables set KEY=value

# Or use Railway dashboard
# https://railway.app/project/[project-id]/settings
\`\`\`
`;
}

function generateChecklist(options: MigrationOptions): string {
	return `# Migration Checklist: Heroku → Railway

## Pre-Migration

- [ ] Export Heroku environment variables: \`heroku config --app your-app > .env.heroku\`
- [ ] Backup database if applicable
- [ ] Document current Heroku add-ons
- [ ] Note current dyno configuration

## Automated Migration Script

Run the cross-platform migration script:
\`\`\`bash
# Set your app name
export HEROKU_APP_NAME=your-app   # Mac/Linux
set HEROKU_APP_NAME=your-app      # Windows CMD
$env:HEROKU_APP_NAME="your-app"   # Windows PowerShell

# Run migration
node migrate.js
\`\`\`

## Railway Setup (Manual)

- [ ] Create Railway account at https://railway.app
- [ ] Install Railway CLI: \`npm install -g @railway/cli\`
- [ ] Login: \`railway login\`
- [ ] Create new project: \`railway init\`

## Configuration

- [ ] Copy \`railway.json\` to your project root
- [ ] Set environment variables in Railway dashboard
- [ ] Configure custom domain (if needed)

## Database Migration

- [ ] Provision PostgreSQL on Railway
- [ ] Export Heroku database
- [ ] Import to Railway PostgreSQL
- [ ] Update \`DATABASE_URL\`

## Deployment

- [ ] Deploy: \`railway up\`
- [ ] Verify deployment in Railway dashboard
- [ ] Test application endpoints
- [ ] Monitor logs: \`railway logs\`

## DNS & Domain

- [ ] Add custom domain in Railway
- [ ] Update DNS records
- [ ] Verify SSL certificate

## Post-Migration

- [ ] Monitor for 24-48 hours
- [ ] Disable Heroku app
- [ ] Delete Heroku resources after verification

## Rollback Plan

If issues occur:
1. Re-enable Heroku app
2. Point DNS back to Heroku
3. Investigate and fix Railway deployment
`;
}

function generateMigrationScriptNode(): string {
	return `#!/usr/bin/env node
/**
 * Migration Script: Heroku → Railway
 * Generated by ExpressoTS CLI
 * Cross-platform (Windows, macOS, Linux)
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HEROKU_APP = process.env.HEROKU_APP_NAME || 'your-app';

function run(cmd, options = {}) {
    console.log(\`  Running: \${cmd}\`);
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: 'inherit', ...options });
    } catch (error) {
        if (!options.ignoreError) {
            console.error(\`  Error: \${error.message}\`);
            process.exit(1);
        }
    }
}

function checkCommand(cmd) {
    try {
        execSync(\`\${cmd} --version\`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

async function main() {
    console.log('\\n🚀 Starting Heroku → Railway Migration\\n');

    // Check prerequisites
    if (!checkCommand('railway')) {
        console.error('❌ Railway CLI required. Install: npm i -g @railway/cli');
        process.exit(1);
    }

    // Export Heroku config (if heroku CLI available)
    if (checkCommand('heroku')) {
        console.log('📦 Exporting Heroku configuration...');
        try {
            const config = execSync(\`heroku config --app \${HEROKU_APP} --shell\`, { encoding: 'utf-8' });
            fs.writeFileSync('.env.heroku', config);
            console.log('  ✓ Exported to .env.heroku');
        } catch {
            console.log('  ⚠ Could not export Heroku config. Set HEROKU_APP_NAME env var.');
        }
    } else {
        console.log('⚠ Heroku CLI not found. Skipping config export.');
        console.log('  Manually export your environment variables.');
    }

    // Initialize Railway project
    console.log('\\n🚂 Initializing Railway project...');
    run('railway init', { ignoreError: true });

    // Import environment variables
    if (fs.existsSync('.env.heroku')) {
        console.log('\\n🔐 Setting up environment variables...');
        const envContent = fs.readFileSync('.env.heroku', 'utf-8');
        const lines = envContent.split('\\n');
        
        for (const line of lines) {
            const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
            if (match) {
                const [, key, value] = match;
                console.log(\`  Setting \${key}...\`);
                run(\`railway variables set "\${key}=\${value}"\`, { ignoreError: true });
            }
        }
    }

    // Deploy
    console.log('\\n🚀 Deploying to Railway...');
    run('railway up');

    console.log('\\n✅ Migration complete!');
    console.log('   Check your deployment at: https://railway.app/dashboard\\n');
}

main().catch(console.error);
`;
}

function generateMigrationScriptBash(): string {
	return `#!/bin/bash
# Migration Script: Heroku → Railway
# Generated by ExpressoTS CLI
# For Unix/macOS - Windows users: use migrate.js instead

set -e

echo "🚀 Starting Heroku → Railway Migration"

# Check prerequisites
command -v railway >/dev/null 2>&1 || { echo "Railway CLI required. Install: npm i -g @railway/cli"; exit 1; }
command -v heroku >/dev/null 2>&1 || { echo "Heroku CLI required."; exit 1; }

# Export Heroku config
echo "📦 Exporting Heroku configuration..."
heroku config --app \${HEROKU_APP_NAME:-your-app} --shell > .env.heroku

# Initialize Railway project
echo "🚂 Initializing Railway project..."
railway init

# Copy environment variables
echo "🔐 Setting up environment variables..."
while IFS='=' read -r key value; do
    if [[ ! -z "$key" && ! "$key" =~ ^# ]]; then
        echo "  Setting $key..."
        railway variables set "$key=$value"
    fi
done < .env.heroku

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Migration complete!"
echo "   Check your deployment at: https://railway.app/dashboard"
`;
}
