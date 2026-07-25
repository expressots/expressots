/**
 * @expressots/mcp-server
 * 
 * MCP Server for ExpressoTS Studio
 * Provides AI-powered code generation and optimization tools
 */

export { createMCPServer, runMCPServer } from './server.js';
export type { MCPServerConfig } from './server.js';

// Export tools for direct usage
export { generateCrud } from './tools/generate-crud.js';
export { generateDto } from './tools/generate-dto.js';
export { addMiddleware } from './tools/add-middleware.js';
export { generateTest } from './tools/generate-test.js';
export { analyzeCode } from './tools/analyze-code.js';

// Export types
export * from './types/index.js';
