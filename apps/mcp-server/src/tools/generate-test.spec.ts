import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateTest } from './generate-test.js';

// generateTest reads the target file from disk, so write a small fixture
// class into a throwaway temp directory.
const FIXTURE = `
export class OrderService {
  constructor(private repo: unknown) {}

  async createOrder(input: unknown) {
    return input;
  }

  async listOrders() {
    return [];
  }
}
`;

let tmpDir: string;
let targetFile: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-generate-test-'));
  targetFile = path.join(tmpDir, 'order.service.ts');
  fs.writeFileSync(targetFile, FIXTURE, 'utf8');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('generateTest', () => {
  it('generates a unit spec naming the class and its methods', () => {
    const result = generateTest({ targetFile, testType: 'unit' });

    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('test/orderservice.spec.ts');
    const content = result.files[0].content;
    expect(content).toContain("describe('OrderService'");
    expect(content).toContain("describe('createOrder'");
    expect(content).toContain("describe('listOrders'");
    expect(content).not.toContain("describe('constructor'");
    expect(result.summary).toBe('Generated unit tests for OrderService: 2 methods tested');
  });

  it('places integration specs under an integration subdirectory', () => {
    const result = generateTest({
      targetFile,
      testType: 'integration',
      outputDir: 'spec',
    });

    expect(result.files[0].path).toBe('spec/integration/orderservice.integration.spec.ts');
    expect(result.files[0].content).toContain("describe('OrderService (Integration)'");
  });

  it('returns an empty result when the target file cannot be read', () => {
    const missing = path.join(tmpDir, 'does-not-exist.ts');
    const result = generateTest({ targetFile: missing, testType: 'unit' });

    expect(result.files).toHaveLength(0);
    expect(result.summary).toBe(`Could not read file: ${missing}`);
  });

  it('returns an empty result when no class is found in the file', () => {
    const noClass = path.join(tmpDir, 'no-class.ts');
    fs.writeFileSync(noClass, 'export const x = 1;\n', 'utf8');
    const result = generateTest({ targetFile: noClass, testType: 'unit' });

    expect(result.files).toHaveLength(0);
    expect(result.summary).toBe(`Could not find class in: ${noClass}`);
  });
});
