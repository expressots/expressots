/**
 * CRUD Generator Tool
 * Generates controller, service, DTO, and tests for an entity
 */

import type { GenerateCrudOptions, GeneratedCode, GeneratedFile } from '../types/index.js';

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

/** Convert string to kebab-case */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/** Generate CRUD files for an entity */
export function generateCrud(options: GenerateCrudOptions): GeneratedCode {
  const {
    entity,
    entityPlural = entity + 's',
    withValidation = true,
    withTests = true,
    withDto = true,
    basePath = `/${toKebabCase(entityPlural)}`,
    outputDir = 'src',
  } = options;

  const files: GeneratedFile[] = [];
  const entityPascal = toPascalCase(entity);
  const entityCamel = toCamelCase(entity);
  const entityKebab = toKebabCase(entity);

  // Generate DTO
  if (withDto) {
    files.push({
      path: `${outputDir}/useCases/${entityKebab}/${entityKebab}.dto.ts`,
      content: generateDto(entityPascal, entityCamel, withValidation),
      action: 'create',
    });
  }

  // Generate UseCase/Service
  files.push({
    path: `${outputDir}/useCases/${entityKebab}/${entityKebab}.usecase.ts`,
    content: generateUseCase(entityPascal, entityCamel),
    action: 'create',
  });

  // Generate Controller
  files.push({
    path: `${outputDir}/useCases/${entityKebab}/${entityKebab}.controller.ts`,
    content: generateController(entityPascal, entityCamel, basePath, withDto),
    action: 'create',
  });

  // Generate Module
  files.push({
    path: `${outputDir}/useCases/${entityKebab}/${entityKebab}.module.ts`,
    content: generateModule(entityPascal, entityKebab),
    action: 'create',
  });

  // Generate Tests
  if (withTests) {
    files.push({
      path: `test/${entityKebab}.controller.spec.ts`,
      content: generateControllerTest(entityPascal, entityCamel, basePath),
      action: 'create',
    });
  }

  return {
    files,
    summary: `Generated CRUD for ${entityPascal}: ${files.length} files created`,
  };
}

function generateDto(
  entityPascal: string,
  _entityCamel: string,
  withValidation: boolean
): string {
  const imports = withValidation
    ? `import { IsString, IsOptional, IsNotEmpty } from 'class-validator';\n\n`
    : '';

  const decorators = withValidation
    ? `  @IsString()
  @IsNotEmpty()
  `
    : '  ';

  const optionalDecorators = withValidation
    ? `  @IsString()
  @IsOptional()
  `
    : '  ';

  return `${imports}/**
 * Create ${entityPascal} DTO
 */
export class Create${entityPascal}RequestDTO {
${decorators}name!: string;

${optionalDecorators}description?: string;
}

/**
 * Create ${entityPascal} Response DTO
 */
export class Create${entityPascal}ResponseDTO {
  id!: string;
  name!: string;
  description?: string;
  createdAt!: Date;
}

/**
 * Update ${entityPascal} DTO
 */
export class Update${entityPascal}RequestDTO {
${optionalDecorators}name?: string;

${optionalDecorators}description?: string;
}

/**
 * ${entityPascal} Response DTO
 */
export class ${entityPascal}ResponseDTO {
  id!: string;
  name!: string;
  description?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
`;
}

function generateUseCase(entityPascal: string, entityCamel: string): string {
  return `import { provide } from 'inversify-binding-decorators';
import { 
  Create${entityPascal}RequestDTO, 
  Create${entityPascal}ResponseDTO,
  Update${entityPascal}RequestDTO,
  ${entityPascal}ResponseDTO 
} from './${toKebabCase(entityPascal)}.dto.js';

@provide(${entityPascal}UseCase)
export class ${entityPascal}UseCase {
  private ${entityCamel}s: Map<string, ${entityPascal}ResponseDTO> = new Map();
  private idCounter = 0;

  /**
   * Create a new ${entityCamel}
   */
  create(data: Create${entityPascal}RequestDTO): Create${entityPascal}ResponseDTO {
    const id = String(++this.idCounter);
    const now = new Date();
    
    const ${entityCamel}: ${entityPascal}ResponseDTO = {
      id,
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
    
    this.${entityCamel}s.set(id, ${entityCamel});
    
    return {
      id,
      name: ${entityCamel}.name,
      description: ${entityCamel}.description,
      createdAt: ${entityCamel}.createdAt,
    };
  }

  /**
   * Find all ${entityCamel}s
   */
  findAll(): ${entityPascal}ResponseDTO[] {
    return Array.from(this.${entityCamel}s.values());
  }

  /**
   * Find a ${entityCamel} by ID
   */
  findById(id: string): ${entityPascal}ResponseDTO | null {
    return this.${entityCamel}s.get(id) || null;
  }

  /**
   * Update a ${entityCamel}
   */
  update(id: string, data: Update${entityPascal}RequestDTO): ${entityPascal}ResponseDTO | null {
    const existing = this.${entityCamel}s.get(id);
    if (!existing) return null;

    const updated: ${entityPascal}ResponseDTO = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    
    this.${entityCamel}s.set(id, updated);
    return updated;
  }

  /**
   * Delete a ${entityCamel}
   */
  delete(id: string): boolean {
    return this.${entityCamel}s.delete(id);
  }
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\\s]+/g, '-')
    .toLowerCase();
}
`;
}

function generateController(
  entityPascal: string,
  entityCamel: string,
  basePath: string,
  withDto: boolean
): string {
  const dtoImport = withDto
    ? `import { 
  Create${entityPascal}RequestDTO, 
  Create${entityPascal}ResponseDTO,
  Update${entityPascal}RequestDTO,
  ${entityPascal}ResponseDTO 
} from './${toKebabCase(entityPascal)}.dto.js';
`
    : '';

  return `import { controller, Get, Post, Put, Delete } from '@expressots/adapter-express';
import { inject } from 'inversify';
import { ${entityPascal}UseCase } from './${toKebabCase(entityPascal)}.usecase.js';
${dtoImport}
@controller('${basePath}')
export class ${entityPascal}Controller {
  constructor(
    @inject(${entityPascal}UseCase) private ${entityCamel}UseCase: ${entityPascal}UseCase
  ) {}

  @Post('/')
  create(
    @body() data: Create${entityPascal}RequestDTO
  ): Create${entityPascal}ResponseDTO {
    return this.${entityCamel}UseCase.create(data);
  }

  @Get('/')
  findAll(): ${entityPascal}ResponseDTO[] {
    return this.${entityCamel}UseCase.findAll();
  }

  @Get('/:id')
  findById(@param('id') id: string): ${entityPascal}ResponseDTO | null {
    return this.${entityCamel}UseCase.findById(id);
  }

  @Put('/:id')
  update(
    @param('id') id: string,
    @body() data: Update${entityPascal}RequestDTO
  ): ${entityPascal}ResponseDTO | null {
    return this.${entityCamel}UseCase.update(id, data);
  }

  @Delete('/:id')
  delete(@param('id') id: string): { success: boolean } {
    const deleted = this.${entityCamel}UseCase.delete(id);
    return { success: deleted };
  }
}

// Import decorators (these would be from @expressots/adapter-express)
function body(): ParameterDecorator {
  return () => {};
}

function param(_name: string): ParameterDecorator {
  return () => {};
}
`;
}

function generateModule(entityPascal: string, entityKebab: string): string {
  return `import { CreateModule } from '@expressots/core';
import { ${entityPascal}Controller } from './${entityKebab}.controller.js';

export const ${entityPascal}Module = CreateModule([${entityPascal}Controller]);
`;
}

function generateControllerTest(
  entityPascal: string,
  entityCamel: string,
  basePath: string
): string {
  return `import { describe, it, expect, beforeAll } from 'vitest';

describe('${entityPascal}Controller', () => {
  const baseUrl = 'http://localhost:3000${basePath}';

  describe('POST ${basePath}', () => {
    it('should create a new ${entityCamel}', async () => {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test ${entityPascal}', description: 'A test' }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.name).toBe('Test ${entityPascal}');
    });
  });

  describe('GET ${basePath}', () => {
    it('should return all ${entityCamel}s', async () => {
      const response = await fetch(baseUrl);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET ${basePath}/:id', () => {
    it('should return a single ${entityCamel}', async () => {
      // First create one
      const createResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const created = await createResponse.json();

      const response = await fetch(\`\${baseUrl}/\${created.id}\`);
      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent ${entityCamel}', async () => {
      const response = await fetch(\`\${baseUrl}/non-existent-id\`);
      expect(response.status).toBe(404);
    });
  });

  describe('PUT ${basePath}/:id', () => {
    it('should update a ${entityCamel}', async () => {
      // First create one
      const createResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Original' }),
      });
      const created = await createResponse.json();

      const response = await fetch(\`\${baseUrl}/\${created.id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Updated');
    });
  });

  describe('DELETE ${basePath}/:id', () => {
    it('should delete a ${entityCamel}', async () => {
      // First create one
      const createResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'To Delete' }),
      });
      const created = await createResponse.json();

      const response = await fetch(\`\${baseUrl}/\${created.id}\`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
`;
}
