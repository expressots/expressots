#!/usr/bin/env node
/**
 * ExpressoTS MCP Server CLI
 * Run the MCP server from command line
 */

import { runMCPServer } from './server.js';

async function main() {
  const projectRoot = process.argv[2] || process.cwd();

  console.error('Starting ExpressoTS MCP Server...');
  console.error(`Project root: ${projectRoot}`);

  await runMCPServer({
    name: 'expressots-mcp-server',
    version: '0.1.0',
    projectRoot,
  });
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
