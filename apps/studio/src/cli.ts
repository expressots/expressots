#!/usr/bin/env node
/**
 * ExpressoTS Studio CLI
 * Main entry point for launching the Studio
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { Studio } from './studio.js';

// Read this package's own version from package.json so `--version` always
// matches the published artifact. Compiled output lives at dist/cli.js, so
// package.json is one directory up.
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'),
) as { version: string };

interface StartOptions {
  port: string;
  agentPort: string;
  dbPath: string;
  browser: boolean;
  src: string;
  standalone: boolean;
}

interface InfoOptions {
  src: string;
}

interface CleanOptions {
  dbPath: string;
}

interface EmitOpenApiOptions {
  src: string;
  out: string;
  title?: string;
  apiVersion?: string;
  failOnDrift?: string;
  globalPrefix?: string;
}

const program = new Command();

program
  .name('expressots-studio')
  .description('ExpressoTS Studio - Developer Experience Platform')
  .version(pkg.version);

program
  .command('start')
  .alias('s')
  .description('Start ExpressoTS Studio')
  .option('-p, --port <port>', 'UI port', '3333')
  .option('-a, --agent-port <port>', 'Agent WebSocket port', '3334')
  .option('-d, --db-path <path>', 'Database path', '.studio/studio.db')
  .option('--no-browser', 'Do not open browser automatically')
  .option('--src <path>', 'Source directory to scan', './src')
  .option('--standalone', 'Run in standalone mode (starts own agent)', false)
  .action(async (options: StartOptions) => {
    try {
      const studio = new Studio({
        uiPort: parseInt(options.port, 10),
        agentPort: parseInt(options.agentPort, 10),
        dbPath: options.dbPath,
        srcPath: options.src,
        standalone: options.standalone,
      });

      await studio.start();

      const agentStatus = options.standalone
        ? chalk.yellow('Standalone')
        : studio.isAgentConnected()
          ? chalk.green('Connected')
          : chalk.gray('Waiting for app...');

      console.log('');
      console.log(chalk.green('  Studio is running'));
      console.log('');
      console.log(`  UI      ${chalk.cyan(`http://localhost:${options.port}`)}`);
      console.log(`  Agent   ${agentStatus} ${chalk.gray(`ws://localhost:${options.agentPort}`)}`);
      console.log('');
      console.log(chalk.gray('  Press Ctrl+C to stop'));
      console.log('');

      if (options.browser !== false) {
        await open(`http://localhost:${options.port}`);
      }

      process.on('SIGINT', async () => {
        console.log('');
        await studio.stop();
        console.log(chalk.gray('  Studio stopped'));
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await studio.stop();
        process.exit(0);
      });

    } catch (error) {
      console.error(chalk.red('\n  Failed to start Studio:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show information about the current project')
  .option('--src <path>', 'Source directory to scan', './src')
  .action(async (options: InfoOptions) => {
    const { RouteScanner } = await import('@expressots/studio-agent');
    const spinner = ora('Scanning project...').start();

    try {
      const scanner = new RouteScanner(options.src);
      const structure = await scanner.scan();

      spinner.succeed(chalk.green('Project scanned successfully'));
      console.log('');
      console.log(chalk.cyan('📁 Project Structure:'));
      console.log('');
      console.log(chalk.white(`  Controllers: ${structure.controllers.length}`));
      console.log(chalk.white(`  Services: ${structure.services.length}`));
      console.log(chalk.white(`  Providers: ${structure.providers.length}`));
      console.log(chalk.white(`  Middleware: ${structure.middleware.length}`));
      console.log('');

      if (structure.controllers.length > 0) {
        console.log(chalk.cyan('🛣️  Routes:'));
        console.log('');
        
        const routes = scanner.getRoutes();
        for (const route of routes) {
          const methodColor = 
            route.method === 'GET' ? chalk.green :
            route.method === 'POST' ? chalk.blue :
            route.method === 'PUT' ? chalk.yellow :
            route.method === 'DELETE' ? chalk.red :
            chalk.white;
          
          console.log(`  ${methodColor(route.method.padEnd(7))} ${route.path}`);
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to scan project'));
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Clean Studio data')
  .option('-d, --db-path <path>', 'Database path', '.studio/studio.db')
  .action(async (options: CleanOptions) => {
    const fs = await import('fs');
    const path = await import('path');

    const dbPath = path.resolve(process.cwd(), options.dbPath);
    const studioDir = path.dirname(dbPath);

    if (fs.existsSync(studioDir)) {
      fs.rmSync(studioDir, { recursive: true });
      console.log(chalk.green('✓'), 'Studio data cleaned');
    } else {
      console.log(chalk.yellow('No Studio data found'));
    }
  });

program
  .command('emit-openapi')
  .description('Generate an OpenAPI 3.1 document from the project (static scan)')
  .option('--src <path>', 'Source directory to scan', './src')
  .option('-o, --out <path>', 'Output file path', 'openapi.json')
  .option('--title <title>', 'API title for info.title')
  .option('--api-version <version>', 'Restrict output to a single API version (e.g. 2)')
  .option(
    '--global-prefix <prefix>',
    'Global route prefix (e.g. /api). Auto-detected from setGlobalRoutePrefix when omitted.',
  )
  .option(
    '--fail-on-drift <specPath>',
    'Diff against a committed spec and exit non-zero on drift',
  )
  .action(async (options: EmitOpenApiOptions) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      RouteScanner,
      buildOpenApiDocument,
      diffOpenApiSpec,
      applyGlobalPrefix,
      detectGlobalPrefix,
    } = await import('@expressots/studio-agent');

    const spinner = ora('Scanning project...').start();
    try {
      const scanner = new RouteScanner(options.src);
      await scanner.scan();

      // Apply the app's global route prefix so the generated paths match
      // what the running app (and Studio) expose. The flag wins; otherwise
      // we recover it statically from `setGlobalRoutePrefix("…")`.
      const prefix =
        options.globalPrefix !== undefined
          ? options.globalPrefix
          : detectGlobalPrefix(options.src);
      const routes = applyGlobalPrefix(scanner.getRoutes(), prefix);
      if (prefix && options.globalPrefix === undefined) {
        spinner.text = `Detected global prefix "${prefix}"`;
      }

      // `info.version` tracks the host app's own version (its package.json),
      // not the framework version — the spec describes the user's API.
      let appVersion = '0.0.0';
      try {
        const projectPkg = JSON.parse(
          fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'),
        ) as { version?: string };
        if (projectPkg?.version) appVersion = projectPkg.version;
      } catch {
        // No readable package.json — keep the 0.0.0 default.
      }

      const doc = buildOpenApiDocument(routes, [], {
        title: options.title ?? 'ExpressoTS API',
        version: appVersion,
        apiVersion: options.apiVersion,
      });

      // Drift gate (CI): compare the freshly-scanned routes against a
      // committed spec. No recorded traffic is available in this headless
      // path, so only structural drift (routes/operations) is detected.
      if (options.failOnDrift) {
        const committedPath = path.resolve(process.cwd(), options.failOnDrift);
        let committed: Record<string, unknown>;
        try {
          committed = JSON.parse(fs.readFileSync(committedPath, 'utf8')) as Record<
            string,
            unknown
          >;
        } catch (error) {
          spinner.fail(chalk.red(`Could not read committed spec at ${committedPath}`));
          console.error(error instanceof Error ? error.message : error);
          process.exit(1);
          return;
        }

        const report = diffOpenApiSpec(committed, routes, [], {
          apiVersion: options.apiVersion,
        });
        if (report.findings.length > 0) {
          spinner.fail(
            chalk.red(`Spec drift detected: ${report.findings.length} finding(s)`),
          );
          for (const f of report.findings) {
            const tag =
              f.severity === 'error'
                ? chalk.red(f.severity.toUpperCase())
                : chalk.yellow(f.severity.toUpperCase());
            console.log(`  ${tag} ${f.message}`);
          }
          process.exit(1);
          return;
        }
      }

      const outPath = path.resolve(process.cwd(), options.out);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');

      const pathCount = Object.keys(doc.paths).length;
      spinner.succeed(
        chalk.green(
          `Wrote ${pathCount} path(s) to ${path.relative(process.cwd(), outPath)}`,
        ),
      );
      console.log(
        chalk.gray(
          `  Provenance: ${doc.info['x-expressots-generated']} — review before publishing as a contract.`,
        ),
      );
    } catch (error) {
      spinner.fail(chalk.red('Failed to generate OpenAPI document'));
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Default to start if no command is provided
program
  .action(() => {
    const startCmd = program.commands.find((cmd: Command) => cmd.name() === 'start');
    startCmd?.parse();
  });

program.parse();
