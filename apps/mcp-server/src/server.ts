/**
 * ExpressoTS MCP Server
 * Exposes AI-powered code generation and optimization tools via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

import { generateCrud } from './tools/generate-crud.js';
import { generateDto } from './tools/generate-dto.js';
import { addMiddleware } from './tools/add-middleware.js';
import { generateTest } from './tools/generate-test.js';
import { analyzeCode } from './tools/analyze-code.js';
import type {
  GenerateCrudOptions,
  GenerateDtoOptions,
  AddMiddlewareOptions,
  GenerateTestOptions,
  ProjectContext,
} from './types/index.js';

/** MCP Server configuration */
export interface MCPServerConfig {
  name: string;
  version: string;
  projectRoot?: string;
}

/** Create and configure the MCP server */
export function createMCPServer(config: MCPServerConfig): Server {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  const projectRoot = config.projectRoot || process.cwd();

  // Define available tools
  const tools: Tool[] = [
    {
      name: 'generate_crud',
      description: 'Generate CRUD operations (controller, service, DTO, tests) for an entity',
      inputSchema: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            description: 'The name of the entity (e.g., "User", "Product")',
          },
          entityPlural: {
            type: 'string',
            description: 'Plural form of the entity name (optional)',
          },
          withValidation: {
            type: 'boolean',
            description: 'Include class-validator decorators (default: true)',
          },
          withTests: {
            type: 'boolean',
            description: 'Generate test files (default: true)',
          },
          withDto: {
            type: 'boolean',
            description: 'Generate DTO files (default: true)',
          },
          basePath: {
            type: 'string',
            description: 'Base route path (default: /{entity-plural})',
          },
          outputDir: {
            type: 'string',
            description: 'Output directory (default: src)',
          },
        },
        required: ['entity'],
      },
    },
    {
      name: 'generate_dto',
      description: 'Generate a Data Transfer Object with validation',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the DTO class',
          },
          fields: {
            type: 'array',
            description: 'Array of field definitions',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['string', 'number', 'boolean', 'date', 'array', 'object'],
                },
                required: { type: 'boolean' },
                validation: {
                  type: 'object',
                  properties: {
                    min: { type: 'number' },
                    max: { type: 'number' },
                    minLength: { type: 'number' },
                    maxLength: { type: 'number' },
                    pattern: { type: 'string' },
                    email: { type: 'boolean' },
                    url: { type: 'boolean' },
                  },
                },
              },
              required: ['name', 'type'],
            },
          },
          validation: {
            type: 'boolean',
            description: 'Include validation decorators (default: true)',
          },
          outputDir: {
            type: 'string',
            description: 'Output directory (default: src/dtos)',
          },
        },
        required: ['name', 'fields'],
      },
    },
    {
      name: 'add_middleware',
      description: 'Generate middleware for authentication, CORS, rate limiting, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['auth', 'cors', 'rate-limit', 'logging', 'validation', 'custom'],
            description: 'Type of middleware to generate',
          },
          name: {
            type: 'string',
            description: 'Custom name for the middleware',
          },
          route: {
            type: 'string',
            description: 'Route to apply middleware to (optional)',
          },
          options: {
            type: 'object',
            description: 'Middleware-specific options',
          },
        },
        required: ['type'],
      },
    },
    {
      name: 'generate_test',
      description: 'Generate unit, integration, or e2e tests for a file',
      inputSchema: {
        type: 'object',
        properties: {
          targetFile: {
            type: 'string',
            description: 'Path to the file to generate tests for',
          },
          testType: {
            type: 'string',
            enum: ['unit', 'integration', 'e2e'],
            description: 'Type of tests to generate',
          },
          outputDir: {
            type: 'string',
            description: 'Output directory for tests (default: test)',
          },
        },
        required: ['targetFile', 'testType'],
      },
    },
    {
      name: 'analyze_code',
      description: 'Analyze code for issues, security vulnerabilities, and improvement suggestions',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to analyze',
          },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'get_project_context',
      description: 'Get context about the current ExpressoTS project structure',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'read_file',
      description: 'Read the contents of a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'list_files',
      description: 'List files in a directory matching a pattern',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Glob pattern to match files (e.g., "src/**/*.ts")',
          },
        },
        required: ['pattern'],
      },
    },
  ];

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'generate_crud': {
          const result = generateCrud(args as unknown as GenerateCrudOptions);
          return {
            content: [
              {
                type: 'text',
                text: formatGeneratedCode(result),
              } as TextContent,
            ],
          };
        }

        case 'generate_dto': {
          const result = generateDto(args as unknown as GenerateDtoOptions);
          return {
            content: [
              {
                type: 'text',
                text: formatGeneratedCode(result),
              } as TextContent,
            ],
          };
        }

        case 'add_middleware': {
          const result = addMiddleware(args as unknown as AddMiddlewareOptions);
          return {
            content: [
              {
                type: 'text',
                text: formatGeneratedCode(result),
              } as TextContent,
            ],
          };
        }

        case 'generate_test': {
          const result = generateTest(args as unknown as GenerateTestOptions);
          return {
            content: [
              {
                type: 'text',
                text: formatGeneratedCode(result),
              } as TextContent,
            ],
          };
        }

        case 'analyze_code': {
          const filePath = (args as { filePath: string }).filePath;
          const absolutePath = path.resolve(projectRoot, filePath);
          const result = analyzeCode(absolutePath);
          return {
            content: [
              {
                type: 'text',
                text: formatAnalysisResult(result),
              } as TextContent,
            ],
          };
        }

        case 'get_project_context': {
          const context = await getProjectContext(projectRoot);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(context, null, 2),
              } as TextContent,
            ],
          };
        }

        case 'read_file': {
          const filePath = (args as { path: string }).path;
          const absolutePath = path.resolve(projectRoot, filePath);
          const content = fs.readFileSync(absolutePath, 'utf-8');
          return {
            content: [
              {
                type: 'text',
                text: content,
              } as TextContent,
            ],
          };
        }

        case 'write_file': {
          const { path: filePath, content } = args as { path: string; content: string };
          const absolutePath = path.resolve(projectRoot, filePath);
          
          // Ensure directory exists
          const dir = path.dirname(absolutePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(absolutePath, content);
          return {
            content: [
              {
                type: 'text',
                text: `File written: ${filePath}`,
              } as TextContent,
            ],
          };
        }

        case 'list_files': {
          const pattern = (args as { pattern: string }).pattern;
          const files = await glob(pattern, { cwd: projectRoot });
          return {
            content: [
              {
                type: 'text',
                text: files.join('\n'),
              } as TextContent,
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          } as TextContent,
        ],
        isError: true,
      };
    }
  });

  // Handle list resources request
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [];

    // Add package.json as a resource
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      resources.push({
        uri: 'file://package.json',
        name: 'package.json',
        description: 'Project package.json file',
        mimeType: 'application/json',
      });
    }

    // Add expressots.config as a resource
    const configPath = path.join(projectRoot, 'expressots.config.ts');
    if (fs.existsSync(configPath)) {
      resources.push({
        uri: 'file://expressots.config.ts',
        name: 'expressots.config.ts',
        description: 'ExpressoTS configuration file',
        mimeType: 'text/typescript',
      });
    }

    return { resources };
  });

  // Handle read resource request
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const filePath = uri.replace('file://', '');
    const absolutePath = path.resolve(projectRoot, filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    return {
      contents: [
        {
          uri,
          mimeType: filePath.endsWith('.json') ? 'application/json' : 'text/plain',
          text: content,
        },
      ],
    };
  });

  return server;
}

/** Format generated code result for display */
function formatGeneratedCode(result: { files: any[]; summary: string }): string {
  let output = `## ${result.summary}\n\n`;

  for (const file of result.files) {
    output += `### ${file.action.toUpperCase()}: ${file.path}\n\n`;
    output += '```typescript\n';
    output += file.content;
    output += '\n```\n\n';
  }

  return output;
}

/** Format analysis result for display */
function formatAnalysisResult(result: any): string {
  let output = `## Analysis: ${result.file}\n\n`;

  if (result.issues.length > 0) {
    output += '### Issues\n\n';
    for (const issue of result.issues) {
      const lineInfo = issue.line ? ` (line ${issue.line})` : '';
      output += `- **${issue.type.toUpperCase()}**${lineInfo}: ${issue.message}\n`;
    }
    output += '\n';
  }

  if (result.suggestions.length > 0) {
    output += '### Suggestions\n\n';
    for (const suggestion of result.suggestions) {
      output += `- **${suggestion.type}**: ${suggestion.message}\n`;
      if (suggestion.fix) {
        output += `  - Fix: \`${suggestion.fix}\`\n`;
      }
    }
  }

  if (result.issues.length === 0 && result.suggestions.length === 0) {
    output += '✅ No issues or suggestions found.\n';
  }

  return output;
}

/** Get project context for AI */
async function getProjectContext(projectRoot: string): Promise<ProjectContext> {
  const context: ProjectContext = {
    rootDir: projectRoot,
    srcDir: path.join(projectRoot, 'src'),
    controllers: [],
    services: [],
    entities: [],
    dtos: [],
    middleware: [],
    dependencies: {},
  };

  // Find controllers
  const controllerFiles = await glob('src/**/*controller*.ts', { cwd: projectRoot });
  context.controllers = controllerFiles;

  // Find services/usecases
  const serviceFiles = await glob('src/**/*{service,usecase}*.ts', { cwd: projectRoot });
  context.services = serviceFiles;

  // Find entities
  const entityFiles = await glob('src/**/*entity*.ts', { cwd: projectRoot });
  context.entities = entityFiles;

  // Find DTOs
  const dtoFiles = await glob('src/**/*dto*.ts', { cwd: projectRoot });
  context.dtos = dtoFiles;

  // Find middleware
  const middlewareFiles = await glob('src/**/*middleware*.ts', { cwd: projectRoot });
  context.middleware = middlewareFiles;

  // Read package.json for dependencies
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    context.dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
  }

  return context;
}

/** Run the MCP server */
export async function runMCPServer(config?: Partial<MCPServerConfig>): Promise<void> {
  const server = createMCPServer({
    name: config?.name || 'expressots-mcp-server',
    version: config?.version || '0.1.0',
    projectRoot: config?.projectRoot,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
