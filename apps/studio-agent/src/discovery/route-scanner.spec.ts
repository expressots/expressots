import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RouteScanner } from './route-scanner.js';
import type { RouteInfo } from '../types/index.js';

/**
 * The scanner reads `.ts` files from disk, so each test writes a fixture
 * controller into a throwaway temp src dir and runs a full scan against it.
 */
// The scanner names a controller after the first `class` in the file, so the
// controller is declared first; the DTO pre-pass scans the whole file and
// still registers the DTOs/schemas declared below it.
const FIXTURE = `
import { controller, Post, body, validatedBody } from '@expressots/adapter-express';
import { z } from 'zod';

@controller('/test')
export class TestController {
  @Post('/class')
  createClass(@body() dto: CreateClassDTO) {
    return dto;
  }

  @Post('/iface')
  createIface(@body() dto: IUserDto) {
    return dto;
  }

  @Post('/zod')
  createZod(@body(CreateZodSchema) dto: CreateZodInput) {
    return dto;
  }

  @Post('/validated')
  createValidated(@validatedBody(CreateClassDTO) dto: CreateClassDTO) {
    return dto;
  }
}

class CreateClassDTO {
  name: string;
  age: number;
}

interface IUserDto {
  email: string;
  active: boolean;
}

const CreateZodSchema = z.object({
  title: z.string(),
  count: z.number().int(),
  enabled: z.boolean().optional(),
});
`;

let tmpDir: string;
let routes: RouteInfo[];

function routeFor(suffix: string): RouteInfo | undefined {
  return routes.find((r) => r.path.endsWith(suffix));
}

describe('RouteScanner DTO discovery', () => {
  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-scanner-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'test.controller.ts'), FIXTURE, 'utf-8');

    const scanner = new RouteScanner(path.join(tmpDir, 'src'));
    await scanner.scan();
    routes = scanner.getRoutes();
  });

  afterAll(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('discovers all four routes', () => {
    expect(routes.filter((r) => r.controller === 'TestController')).toHaveLength(4);
  });

  it('builds a sample from a class DTO', () => {
    const route = routeFor('/class');
    expect(route?.bodyDto).toBe('CreateClassDTO');
    expect(route?.bodySample).toEqual({ name: '', age: 0 });
  });

  it('builds a sample from an interface DTO', () => {
    const route = routeFor('/iface');
    expect(route?.bodyDto).toBe('IUserDto');
    expect(route?.bodySample).toEqual({ email: '', active: false });
  });

  it('builds a sample from a Zod schema passed to @body(Schema)', () => {
    const route = routeFor('/zod');
    expect(route?.bodyDto).toBe('CreateZodSchema');
    expect(route?.bodySample).toEqual({ title: '', count: 0, enabled: false });
  });

  it('builds a sample from a schema passed to @validatedBody(Schema)', () => {
    const route = routeFor('/validated');
    expect(route?.bodyDto).toBe('CreateClassDTO');
    expect(route?.bodySample).toEqual({ name: '', age: 0 });
  });
});
