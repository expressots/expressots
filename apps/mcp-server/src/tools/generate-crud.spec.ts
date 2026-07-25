import { describe, it, expect } from 'vitest';
import { generateCrud } from './generate-crud.js';

describe('generateCrud', () => {
  it('generates dto, usecase, controller, module, and test files by default', () => {
    const result = generateCrud({ entity: 'userProfile' });

    expect(result.files.map((f) => f.path)).toEqual([
      'src/useCases/user-profile/user-profile.dto.ts',
      'src/useCases/user-profile/user-profile.usecase.ts',
      'src/useCases/user-profile/user-profile.controller.ts',
      'src/useCases/user-profile/user-profile.module.ts',
      'test/user-profile.controller.spec.ts',
    ]);
    expect(result.files.every((f) => f.action === 'create')).toBe(true);
    expect(result.summary).toBe('Generated CRUD for UserProfile: 5 files created');
  });

  it('derives the base path from the pluralized entity name', () => {
    const { files } = generateCrud({ entity: 'product' });
    const controller = files.find((f) => f.path.endsWith('.controller.ts'))!;

    expect(controller.content).toContain("@controller('/products')");
    expect(controller.content).toContain('export class ProductController');
  });

  it('honors an explicit basePath and outputDir', () => {
    const { files } = generateCrud({
      entity: 'invoice',
      basePath: '/api/v2/invoices',
      outputDir: 'app',
    });
    const controller = files.find((f) => f.path.endsWith('.controller.ts'))!;

    expect(controller.path).toBe('app/useCases/invoice/invoice.controller.ts');
    expect(controller.content).toContain("@controller('/api/v2/invoices')");
  });

  it('skips dto and test files when disabled', () => {
    const { files, summary } = generateCrud({
      entity: 'note',
      withDto: false,
      withTests: false,
    });

    expect(files.map((f) => f.path)).toEqual([
      'src/useCases/note/note.usecase.ts',
      'src/useCases/note/note.controller.ts',
      'src/useCases/note/note.module.ts',
    ]);
    const controller = files.find((f) => f.path.endsWith('.controller.ts'))!;
    expect(controller.content).not.toContain('.dto.js');
    expect(summary).toBe('Generated CRUD for Note: 3 files created');
  });

  it('emits validation decorators in the dto only when enabled', () => {
    const withValidation = generateCrud({ entity: 'task' });
    const dtoOn = withValidation.files.find((f) => f.path.endsWith('.dto.ts'))!;
    expect(dtoOn.content).toContain("from 'class-validator'");
    expect(dtoOn.content).toContain('@IsNotEmpty()');

    const withoutValidation = generateCrud({ entity: 'task', withValidation: false });
    const dtoOff = withoutValidation.files.find((f) => f.path.endsWith('.dto.ts'))!;
    expect(dtoOff.content).not.toContain('class-validator');
  });
});
