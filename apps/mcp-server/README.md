# @expressots/mcp-server

MCP (Model Context Protocol) Server for ExpressoTS Studio. Provides AI-powered code generation and optimization tools that understand ExpressoTS idioms and best practices.

## Features

- **CRUD Generation**: Generate complete CRUD operations with controllers, services, DTOs, and tests
- **DTO Generation**: Create Data Transfer Objects with validation
- **Middleware Generation**: Generate auth, CORS, rate limiting, and custom middleware
- **Test Generation**: Create unit, integration, and e2e tests
- **Code Analysis**: Detect issues, security vulnerabilities, and improvement opportunities

## Installation

```bash
npm install @expressots/mcp-server
```

## Usage as MCP Server

### Configure in Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "expressots": {
      "command": "npx",
      "args": ["@expressots/mcp-server", "/path/to/your/project"]
    }
  }
}
```

### Run Standalone

```bash
npx expressots-mcp /path/to/your/project
```

## Available Tools

### generate_crud

Generate CRUD operations for an entity:

```json
{
  "entity": "User",
  "withValidation": true,
  "withTests": true,
  "basePath": "/users"
}
```

### generate_dto

Generate a DTO with validation:

```json
{
  "name": "CreateUser",
  "fields": [
    { "name": "email", "type": "string", "validation": { "email": true } },
    { "name": "password", "type": "string", "validation": { "minLength": 8 } },
    { "name": "name", "type": "string", "required": true }
  ]
}
```

### add_middleware

Generate middleware:

```json
{
  "type": "auth",
  "options": { "strategy": "jwt" }
}
```

Supported types: `auth`, `cors`, `rate-limit`, `logging`, `validation`, `custom`

### generate_test

Generate tests for a file:

```json
{
  "targetFile": "src/useCases/user/user.controller.ts",
  "testType": "e2e"
}
```

### analyze_code

Analyze code for issues:

```json
{
  "filePath": "src/useCases/user/user.usecase.ts"
}
```

### get_project_context

Get information about the project structure:

```json
{}
```

### read_file / write_file / list_files

File system operations for reading, writing, and listing files.

## Programmatic Usage

You can also use the tools directly in your code:

```typescript
import { generateCrud, generateDto, analyzeCode } from '@expressots/mcp-server';

// Generate CRUD
const crud = generateCrud({
  entity: 'Product',
  withValidation: true,
  withTests: true,
});

// Generate DTO
const dto = generateDto({
  name: 'CreateProduct',
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'price', type: 'number', validation: { min: 0 } },
  ],
});

// Analyze code
const analysis = analyzeCode('src/services/product.service.ts');
```

## Security

The MCP server only has access to files within the project root directory. All file paths are resolved relative to the project root.

## License

MIT © ExpressoTS
