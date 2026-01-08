import fs from "fs";
import path from "path";
import chalk from "chalk";
import type { MigrationOptions } from "../form";

export async function generateComposeToRailway(
	outputDir: string,
	options: MigrationOptions
): Promise<void> {
	console.log(chalk.yellow("  Generating Docker Compose → Railway migration..."));

	// Generate railway.json
	const railwayConfig = {
		$schema: "https://railway.app/railway.schema.json",
		build: {
			builder: "DOCKERFILE",
			dockerfilePath: "Dockerfile",
		},
		deploy: {
			startCommand: "npm start",
			healthcheckPath: "/health",
			healthcheckTimeout: 300,
			restartPolicyType: "ON_FAILURE",
			restartPolicyMaxRetries: 10,
		},
	};

	fs.writeFileSync(
		path.join(outputDir, "railway.json"),
		JSON.stringify(railwayConfig, null, 2),
		"utf-8"
	);
	console.log(chalk.green("    ✓ Created railway.json"));

	// Generate service mapping
	const serviceMapping = generateServiceMapping();
	fs.writeFileSync(
		path.join(outputDir, "service-mapping.md"),
		serviceMapping,
		"utf-8"
	);
	console.log(chalk.green("    ✓ Created service-mapping.md"));

	// Generate checklist
	const checklist = generateRailwayFromComposeChecklist();
	fs.writeFileSync(
		path.join(outputDir, "MIGRATION_CHECKLIST.md"),
		checklist,
		"utf-8"
	);
	console.log(chalk.green("    ✓ Created MIGRATION_CHECKLIST.md"));
}

function generateServiceMapping(): string {
	return `# Service Mapping: Docker Compose → Railway

## How Docker Compose Services Map to Railway

| Compose Service | Railway Service | Notes |
|-----------------|-----------------|-------|
| Your app service | Railway Web Service | Main application |
| postgres/mysql | Railway Database | Use Railway templates |
| redis | Railway Redis | Use Railway Redis template |
| nginx | Not needed | Railway handles routing |

## Database Services

Railway provides managed databases. Instead of running in a container:

1. **PostgreSQL**: Add PostgreSQL service from Railway dashboard
2. **MySQL**: Add MySQL service from Railway dashboard
3. **Redis**: Add Redis service from Railway dashboard
4. **MongoDB**: Add MongoDB service from Railway dashboard

The connection strings are automatically injected as environment variables.

## Volumes

Railway handles persistent storage differently:

- **Database data**: Managed by Railway database services
- **File uploads**: Consider using S3/R2/GCS instead
- **Logs**: Available in Railway dashboard

## Environment Variables

Docker Compose environment variables should be set in Railway:

\`\`\`bash
# Using Railway CLI
railway variables set DATABASE_URL=\${{Postgres.DATABASE_URL}}
railway variables set REDIS_URL=\${{Redis.REDIS_URL}}
\`\`\`

Or use the Railway dashboard for variable management.
`;
}

function generateRailwayFromComposeChecklist(): string {
	return `# Migration Checklist: Docker Compose → Railway

## Pre-Migration

- [ ] Review docker-compose.yml services
- [ ] List all environment variables
- [ ] Identify database and cache services
- [ ] Ensure Dockerfile is working

## Railway Setup

- [ ] Create Railway account
- [ ] Install CLI: \`npm install -g @railway/cli\`
- [ ] Login: \`railway login\`
- [ ] Create project: \`railway init\`

## Service Migration

### Main Application
- [ ] Copy railway.json to project
- [ ] Deploy: \`railway up\`
- [ ] Verify deployment

### Database (if applicable)
- [ ] Add PostgreSQL/MySQL from Railway dashboard
- [ ] Note the connection string variable
- [ ] Update app to use Railway database URL

### Redis (if applicable)
- [ ] Add Redis from Railway dashboard
- [ ] Update REDIS_URL to use Railway variable

## Environment Variables

- [ ] Set all required environment variables
- [ ] Use \`\${{ServiceName.VARIABLE}}\` for service references
- [ ] Verify with \`railway variables\`

## Volumes & Persistent Data

- [ ] Migrate file uploads to S3/R2 if applicable
- [ ] Export database data and import to Railway

## Networking

- [ ] Configure custom domain (optional)
- [ ] Railway handles SSL automatically

## Post-Migration

- [ ] Verify all endpoints
- [ ] Monitor logs: \`railway logs\`
- [ ] Stop docker-compose locally
`;
}
