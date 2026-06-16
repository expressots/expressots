#!/usr/bin/env node
/**
 * ExpressoTS MCP Server CLI
 * Run the MCP server from command line
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runMCPServer } from './server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'),
) as { version: string };

async function main() {
  const projectRoot = process.argv[2] || process.cwd();

  console.error('Starting ExpressoTS MCP Server...');
  console.error(`Project root: ${projectRoot}`);

  await runMCPServer({
    name: 'expressots-mcp-server',
    version: pkg.version,
    projectRoot,
  });
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
