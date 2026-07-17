import { describe, it, expect } from 'vitest';
import { generateDto } from './generate-dto.js';
import type { DtoField } from '../types/index.js';

describe('generateDto', () => {
  it('generates a PascalCase class and kebab-case file path', () => {
    const result = generateDto({
      name: 'user-profile',
      fields: [{ name: 'displayName', type: 'string' }],
    });

    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('src/dtos/user-profile.dto.ts');
    expect(result.files[0].action).toBe('create');
    expect(result.files[0].content).toContain('export class UserProfileDTO');
    expect(result.summary).toBe('Generated UserProfileDTO with 1 fields');
  });

  it('respects a custom output directory', () => {
    const result = generateDto({
      name: 'order',
      fields: [{ name: 'total', type: 'number' }],
      outputDir: 'src/modules/orders',
    });

    expect(result.files[0].path).toBe('src/modules/orders/order.dto.ts');
  });

  it('emits validation decorators per field type and rules', () => {
    const fields: DtoField[] = [
      {
        name: 'email',
        type: 'string',
        validation: { email: true, minLength: 5, maxLength: 100 },
      },
      { name: 'age', type: 'number', required: false, validation: { min: 0, max: 150 } },
      { name: 'active', type: 'boolean' },
    ];
    const { files } = generateDto({ name: 'account', fields });
    const content = files[0].content;

    expect(content).toContain('@IsString()');
    expect(content).toContain('@IsEmail()');
    expect(content).toContain('@MinLength(5)');
    expect(content).toContain('@MaxLength(100)');
    expect(content).toContain('@IsNumber()');
    expect(content).toContain('@Min(0)');
    expect(content).toContain('@Max(150)');
    expect(content).toContain('@IsBoolean()');
    // Required fields get @IsNotEmpty and `!`, optional fields get @IsOptional and `?`.
    expect(content).toContain('@IsNotEmpty()');
    expect(content).toContain('email!: string;');
    expect(content).toContain('@IsOptional()');
    expect(content).toContain('age?: number;');
  });

  it('builds a single sorted class-validator import covering all decorators', () => {
    const { files } = generateDto({
      name: 'thing',
      fields: [
        { name: 'title', type: 'string' },
        { name: 'count', type: 'number' },
      ],
    });
    const content = files[0].content;

    const importLines = content.split('\n').filter((l) => l.startsWith('import'));
    expect(importLines).toHaveLength(1);
    expect(importLines[0]).toBe(
      "import { IsNotEmpty, IsNumber, IsString } from 'class-validator';",
    );
  });

  it('omits decorators and imports when validation is disabled', () => {
    const { files } = generateDto({
      name: 'plain',
      fields: [{ name: 'value', type: 'string' }],
      validation: false,
    });
    const content = files[0].content;

    expect(content).not.toContain('class-validator');
    expect(content).not.toContain('@Is');
    expect(content).toContain('value!: string;');
  });

  it('maps date, array, and object field types to TypeScript types', () => {
    const { files } = generateDto({
      name: 'mixed',
      fields: [
        { name: 'when', type: 'date' },
        { name: 'tags', type: 'array' },
        { name: 'meta', type: 'object' },
      ],
      validation: false,
    });
    const content = files[0].content;

    expect(content).toContain('when!: Date;');
    expect(content).toContain('tags!: any[];');
    expect(content).toContain('meta!: Record<string, any>;');
  });
});
