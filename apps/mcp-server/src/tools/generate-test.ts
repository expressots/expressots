/**
 * Test Generator Tool
 * Generates unit, integration, and e2e tests for ExpressoTS components
 */

import * as fs from 'fs';
import type { GenerateTestOptions, GeneratedCode } from '../types/index.js';

/** Convert string to PascalCase */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/** Convert string to camelCase */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Detect file type from path */
function detectFileType(filePath: string): 'controller' | 'service' | 'usecase' | 'middleware' | 'unknown' {
  const lower = filePath.toLowerCase();
  if (lower.includes('controller')) return 'controller';
  if (lower.includes('service')) return 'service';
  if (lower.includes('usecase')) return 'usecase';
  if (lower.includes('middleware')) return 'middleware';
  return 'unknown';
}

/** Extract class name from file content */
function extractClassName(content: string): string | null {
  const match = content.match(/(?:export\s+)?class\s+(\w+)/);
  return match ? match[1] : null;
}

/** Extract methods from class */
function extractMethods(content: string): string[] {
  const methods: string[] = [];
  const regex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] !== 'constructor') {
      methods.push(match[1]);
    }
  }
  return methods;
}

/** Generate tests for a file */
export function generateTest(options: GenerateTestOptions): GeneratedCode {
  const { targetFile, testType, outputDir = 'test' } = options;

  // Read the target file
  let content: string;
  try {
    content = fs.readFileSync(targetFile, 'utf-8');
  } catch {
    return {
      files: [],
      summary: `Could not read file: ${targetFile}`,
    };
  }

  const className = extractClassName(content);
  if (!className) {
    return {
      files: [],
      summary: `Could not find class in: ${targetFile}`,
    };
  }

  const fileType = detectFileType(targetFile);
  const methods = extractMethods(content);

  let testContent: string;
  let testPath: string;

  switch (testType) {
    case 'unit':
      testContent = generateUnitTest(className, fileType, methods, targetFile);
      testPath = `${outputDir}/${className.toLowerCase()}.spec.ts`;
      break;
    case 'integration':
      testContent = generateIntegrationTest(className, fileType, methods, targetFile);
      testPath = `${outputDir}/integration/${className.toLowerCase()}.integration.spec.ts`;
      break;
    case 'e2e':
      testContent = generateE2ETest(className, fileType, methods, targetFile);
      testPath = `${outputDir}/e2e/${className.toLowerCase()}.e2e.spec.ts`;
      break;
    default:
      testContent = generateUnitTest(className, fileType, methods, targetFile);
      testPath = `${outputDir}/${className.toLowerCase()}.spec.ts`;
  }

  return {
    files: [
      {
        path: testPath,
        content: testContent,
        action: 'create',
      },
    ],
    summary: `Generated ${testType} tests for ${className}: ${methods.length} methods tested`,
  };
}

function generateUnitTest(
  className: string,
  _fileType: string,
  methods: string[],
  targetFile: string
): string {
  const classCamel = toCamelCase(className);
  const relativePath = targetFile.replace(/\\/g, '/');

  return `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${className} } from '${relativePath.replace('.ts', '.js')}';

describe('${className}', () => {
  let ${classCamel}: ${className};

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create instance with mocked dependencies
    ${classCamel} = new ${className}(
      // TODO: Add mocked dependencies here
    );
  });

${methods.map(method => `  describe('${method}', () => {
    it('should be defined', () => {
      expect(${classCamel}.${method}).toBeDefined();
    });

    it('should execute successfully', async () => {
      // Arrange
      const input = {}; // TODO: Add test input
      
      // Act
      const result = await ${classCamel}.${method}(input);
      
      // Assert
      expect(result).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const invalidInput = null;
      
      // Act & Assert
      await expect(${classCamel}.${method}(invalidInput)).rejects.toThrow();
    });
  });
`).join('\n')}
  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      // TODO: Test with empty/null input
    });

    it('should handle large datasets', async () => {
      // TODO: Test with large input
    });
  });
});
`;
}

function generateIntegrationTest(
  className: string,
  _fileType: string,
  methods: string[],
  targetFile: string
): string {
  const classCamel = toCamelCase(className);
  const relativePath = targetFile.replace(/\\/g, '/');

  return `import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Container } from 'inversify';
import { ${className} } from '${relativePath.replace('.ts', '.js')}';

describe('${className} (Integration)', () => {
  let container: Container;
  let ${classCamel}: ${className};

  beforeAll(async () => {
    // Initialize container with real dependencies
    container = new Container();
    
    // TODO: Bind real dependencies
    // container.bind(DependencyToken).to(RealDependency);
    
    container.bind(${className}).toSelf();
    ${classCamel} = container.get(${className});
  });

  afterAll(async () => {
    // Cleanup
    // TODO: Close database connections, clean up test data
  });

  beforeEach(async () => {
    // Reset state before each test
    // TODO: Clear test data if needed
  });

${methods.map(method => `  describe('${method}', () => {
    it('should integrate with dependencies correctly', async () => {
      // Arrange
      const input = {}; // TODO: Add realistic test input
      
      // Act
      const result = await ${classCamel}.${method}(input);
      
      // Assert
      expect(result).toBeDefined();
      // TODO: Add integration-specific assertions
    });

    it('should persist data correctly', async () => {
      // Arrange
      const testData = {}; // TODO: Add test data
      
      // Act
      await ${classCamel}.${method}(testData);
      
      // Assert
      // TODO: Verify data was persisted correctly
    });
  });
`).join('\n')}
  describe('Cross-Component Integration', () => {
    it('should work with multiple components', async () => {
      // TODO: Test interaction between multiple components
    });

    it('should maintain data consistency', async () => {
      // TODO: Test transactional behavior
    });
  });
});
`;
}

function generateE2ETest(
  className: string,
  fileType: string,
  methods: string[],
  _targetFile: string
): string {
  // For controllers, generate API tests
  if (fileType === 'controller') {
    return generateControllerE2ETest(className, methods);
  }

  return generateGenericE2ETest(className, methods);
}

function generateControllerE2ETest(className: string, _methods: string[]): string {
  const baseRoute = className.replace('Controller', '').toLowerCase();

  return `import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('${className} (E2E)', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const endpoint = \`\${baseUrl}/${baseRoute}\`;

  beforeAll(async () => {
    // Wait for server to be ready
    // TODO: Add health check or startup wait
  });

  afterAll(async () => {
    // Cleanup test data
    // TODO: Remove test records created during tests
  });

  describe('GET /${baseRoute}', () => {
    it('should return a list', async () => {
      const response = await fetch(endpoint);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle query parameters', async () => {
      const response = await fetch(\`\${endpoint}?limit=10&offset=0\`);
      
      expect(response.status).toBe(200);
    });
  });

  describe('GET /${baseRoute}/:id', () => {
    it('should return a single item', async () => {
      // First create an item
      const createResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Item' }),
      });
      const created = await createResponse.json();

      const response = await fetch(\`\${endpoint}/\${created.id}\`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(created.id);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await fetch(\`\${endpoint}/non-existent-id\`);
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST /${baseRoute}', () => {
    it('should create a new item', async () => {
      const payload = {
        name: 'E2E Test Item',
        description: 'Created during E2E test',
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe(payload.name);
    });

    it('should validate required fields', async () => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /${baseRoute}/:id', () => {
    it('should update an item', async () => {
      // Create an item first
      const createResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Original' }),
      });
      const created = await createResponse.json();

      // Update it
      const updatePayload = { name: 'Updated' };
      const response = await fetch(\`\${endpoint}/\${created.id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Updated');
    });
  });

  describe('DELETE /${baseRoute}/:id', () => {
    it('should delete an item', async () => {
      // Create an item first
      const createResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'To Delete' }),
      });
      const created = await createResponse.json();

      // Delete it
      const response = await fetch(\`\${endpoint}/\${created.id}\`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      // Verify it's gone
      const getResponse = await fetch(\`\${endpoint}/\${created.id}\`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      expect(response.status).toBe(400);
    });

    it('should handle server errors gracefully', async () => {
      // TODO: Test error scenarios
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time', async () => {
      const start = Date.now();
      await fetch(endpoint);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500); // 500ms threshold
    });
  });
});
`;
}

function generateGenericE2ETest(className: string, methods: string[]): string {
  return `import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('${className} (E2E)', () => {
  beforeAll(async () => {
    // Setup: Start application, seed database, etc.
  });

  afterAll(async () => {
    // Cleanup: Stop application, clean database
  });

${methods.map(method => `  describe('${method}', () => {
    it('should complete full workflow', async () => {
      // TODO: Test complete user workflow
    });

    it('should handle concurrent operations', async () => {
      // TODO: Test concurrent access
    });
  });
`).join('\n')}
  describe('Full Workflow', () => {
    it('should complete end-to-end scenario', async () => {
      // TODO: Implement complete E2E scenario
    });
  });
});
`;
}
