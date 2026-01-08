import fs from "fs";
import path from "path";
import chalk from "chalk";
import type { MigrationOptions } from "../form";

interface MigrationPath {
	from: string;
	to: string;
	description: string;
	complexity: string;
}

export async function generateGenericMigration(
	outputDir: string,
	options: MigrationOptions,
	migration?: MigrationPath
): Promise<void> {
	console.log(chalk.yellow(`  Generating ${options.from} → ${options.to} migration...`));

	// Generate generic checklist
	const checklist = generateGenericChecklist(options, migration);
	fs.writeFileSync(
		path.join(outputDir, "MIGRATION_CHECKLIST.md"),
		checklist,
		"utf-8"
	);
	console.log(chalk.green("    ✓ Created MIGRATION_CHECKLIST.md"));

	// Generate environment mapping template
	const envMapping = generateEnvMappingTemplate(options);
	fs.writeFileSync(
		path.join(outputDir, "env-mapping.md"),
		envMapping,
		"utf-8"
	);
	console.log(chalk.green("    ✓ Created env-mapping.md"));

	// Generate migration notes
	const notes = generateMigrationNotes(options, migration);
	fs.writeFileSync(
		path.join(outputDir, "MIGRATION_NOTES.md"),
		notes,
		"utf-8"
	);
	console.log(chalk.green("    ✓ Created MIGRATION_NOTES.md"));
}

function generateGenericChecklist(options: MigrationOptions, migration?: MigrationPath): string {
	const complexity = migration?.complexity || "medium";
	
	return `# Migration Checklist: ${options.from} → ${options.to}

**Complexity**: ${complexity}

## Pre-Migration

- [ ] Document current infrastructure configuration
- [ ] Export all environment variables
- [ ] Backup databases and persistent data
- [ ] Document current DNS configuration
- [ ] List all external service dependencies

## Target Platform Setup

- [ ] Create account on ${options.to}
- [ ] Set up CLI tools if available
- [ ] Configure authentication
- [ ] Create new project/application

## Application Migration

- [ ] Prepare application configuration for ${options.to}
- [ ] Update build scripts if necessary
- [ ] Configure deployment pipeline
- [ ] Set up environment variables

## Database Migration

- [ ] Provision database on ${options.to}
- [ ] Export data from source database
- [ ] Import data to target database
- [ ] Verify data integrity
- [ ] Update DATABASE_URL configuration

## Networking & DNS

- [ ] Configure custom domain on ${options.to}
- [ ] Set up SSL/TLS certificates
- [ ] Update DNS records
- [ ] Verify domain propagation

## Testing

- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Verify all API endpoints
- [ ] Test database connectivity
- [ ] Check external service integrations

## Go-Live

- [ ] Schedule maintenance window
- [ ] Deploy to production
- [ ] Update DNS to point to new platform
- [ ] Monitor for 24-48 hours
- [ ] Verify all functionality

## Post-Migration

- [ ] Document new infrastructure
- [ ] Update team runbooks
- [ ] Decommission old infrastructure
- [ ] Update monitoring and alerts
`;
}

function generateEnvMappingTemplate(options: MigrationOptions): string {
	return `# Environment Variable Mapping: ${options.from} → ${options.to}

## Instructions

1. Export environment variables from ${options.from}
2. Map them to ${options.to} equivalents
3. Set up variables on the new platform

## Variable Template

| Source Variable | Target Variable | Value/Reference | Notes |
|-----------------|-----------------|-----------------|-------|
| DATABASE_URL | DATABASE_URL | | Connection string |
| REDIS_URL | REDIS_URL | | Cache connection |
| NODE_ENV | NODE_ENV | production | |
| PORT | PORT | 3000 | May be set automatically |
| API_KEY | API_KEY | | Secret |
| | | | |

## Platform-Specific Variables

Some platforms inject their own variables. Check ${options.to} documentation for:

- Automatic PORT assignment
- Database connection strings
- Service discovery variables
- Platform metadata

## Secrets Management

Consider using a secrets manager:
- AWS Secrets Manager
- HashiCorp Vault
- Doppler
- 1Password Secrets

## Exporting from ${options.from}

\`\`\`bash
# Example commands - adjust for your source platform
# Heroku
heroku config --app your-app --shell > .env.backup

# Docker Compose
docker-compose config | grep -A 100 environment > env-backup.txt

# Kubernetes
kubectl get configmap your-config -o yaml > configmap-backup.yaml
kubectl get secret your-secret -o yaml > secret-backup.yaml
\`\`\`
`;
}

function generateMigrationNotes(options: MigrationOptions, migration?: MigrationPath): string {
	return `# Migration Notes: ${options.from} → ${options.to}

## Overview

This document contains notes and considerations for migrating from ${options.from} to ${options.to}.

${migration ? `
**Complexity**: ${migration.complexity}
**Description**: ${migration.description}
` : ''}

## Key Differences

### Compute Model
Document the differences in compute model between platforms:
- Containers vs VMs vs Serverless
- Scaling approach
- Cold start behavior

### Networking
- How services communicate
- Load balancing
- SSL/TLS handling

### Storage
- Persistent storage options
- Database services
- File storage

### Deployment
- CI/CD integration
- Rollback mechanisms
- Blue-green deployments

## Potential Issues

1. **Platform-specific features**: Some features from ${options.from} may not exist on ${options.to}
2. **Performance differences**: Initial performance may differ
3. **Cost structure**: Pricing models may be different
4. **Vendor lock-in**: Watch for platform-specific services

## Resources

- ${options.to} documentation
- Migration guides
- Community forums
- Support channels

## Rollback Plan

If migration fails:

1. Revert DNS to original platform
2. Re-enable ${options.from} services
3. Investigate issues
4. Plan remediation
5. Retry migration

## Timeline Estimate

- Preparation: 1-2 days
- Migration: 1-4 hours (depending on complexity)
- Monitoring: 24-48 hours
- Cleanup: 1 day

## Sign-off

- [ ] Development team reviewed
- [ ] Operations team reviewed
- [ ] Stakeholders notified
- [ ] Rollback plan tested
`;
}
