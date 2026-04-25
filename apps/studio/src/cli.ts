#!/usr/bin/env node
/**
 * ExpressoTS Studio CLI
 * Main entry point for launching the Studio
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { Studio } from './studio.js';

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

const program = new Command();

program
  .name('expressots-studio')
  .description('ExpressoTS Studio - Developer Experience Platform')
  .version('0.1.0');

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
    const spinner = ora('Starting ExpressoTS Studio...').start();

    try {
      const studio = new Studio({
        uiPort: parseInt(options.port, 10),
        agentPort: parseInt(options.agentPort, 10),
        dbPath: options.dbPath,
        srcPath: options.src,
        standalone: options.standalone,
      });

      await studio.start();

      spinner.succeed(chalk.green('ExpressoTS Studio is running!'));
      
      console.log('');
      console.log(chalk.cyan('  ⚡ Studio UI:'), chalk.white(`http://localhost:${options.port}`));
      if (options.standalone) {
        console.log(chalk.yellow('  🔧 Mode:'), chalk.white('Standalone (agent runs here)'));
      } else if (studio.isAgentConnected()) {
        console.log(chalk.green('  ✅ Agent:'), chalk.white('Connected to your app'));
      } else {
        console.log(chalk.gray('  ⏳ Agent:'), chalk.white('Waiting for your app...'));
      }
      console.log(chalk.cyan('  📡 Agent URL:'), chalk.white(`ws://localhost:${options.agentPort}`));
      console.log('');
      console.log(chalk.gray('  Press Ctrl+C to stop'));
      console.log('');

      if (options.browser !== false) {
        await open(`http://localhost:${options.port}`);
      }

      // Handle shutdown
      process.on('SIGINT', async () => {
        console.log('');
        const stopSpinner = ora('Stopping ExpressoTS Studio...').start();
        await studio.stop();
        stopSpinner.succeed(chalk.green('ExpressoTS Studio stopped'));
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await studio.stop();
        process.exit(0);
      });

    } catch (error) {
      spinner.fail(chalk.red('Failed to start ExpressoTS Studio'));
      console.error(error instanceof Error ? error.message : error);
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

// Default to start if no command is provided
program
  .action(() => {
    const startCmd = program.commands.find((cmd: Command) => cmd.name() === 'start');
    startCmd?.parse();
  });

// Show banner
console.log('');
console.log(chalk.cyan('  ⚡ ExpressoTS Studio'));
console.log(chalk.gray('     Developer Experience Platform'));
console.log('');

program.parse();
