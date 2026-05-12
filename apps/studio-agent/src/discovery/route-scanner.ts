/**
 * Route scanner for ExpressoTS applications
 * Discovers routes, controllers, and services from the application
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type {
  RouteInfo,
  ControllerInfo,
  ServiceInfo,
  AppStructure,
  HttpMethod,
  DependencyInfo,
} from '../types/index.js';

/** Regular expressions for parsing TypeScript/JavaScript files */
const PATTERNS = {
  // Match @controller decorator with path
  controller: /@controller\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  // Match HTTP method decorators
  httpMethods: {
    get: /@Get\s*\(\s*['"`]?([^'"`\)]*)?['"`]?\s*\)/gi,
    post: /@Post\s*\(\s*['"`]?([^'"`\)]*)?['"`]?\s*\)/gi,
    put: /@Put\s*\(\s*['"`]?([^'"`\)]*)?['"`]?\s*\)/gi,
    patch: /@Patch\s*\(\s*['"`]?([^'"`\)]*)?['"`]?\s*\)/gi,
    delete: /@Delete\s*\(\s*['"`]?([^'"`\)]*)?['"`]?\s*\)/gi,
    head: /@Head\s*\(\s*['"`]?([^'"`\)]*)?['"`]?\s*\)/gi,
    options: /@Options\s*\(\s*['"`]?([^'"`\)]*)?['"`]?\s*\)/gi,
  },
  // Match class declaration
  classDeclaration: /class\s+(\w+)/g,
  // Match constructor injection
  constructorInjection: /constructor\s*\([^)]*\)/g,
  // Match @inject decorator
  inject: /@inject\s*\(\s*(\w+)\s*\)/gi,
  // Match method declaration
  methodDeclaration: /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g,
  // Match service/provider decorators
  injectable: /@provide\s*\(\s*(\w+)?\s*\)/gi,
  // Match middleware decorator
  middleware: /@middleware\s*\(/gi,
  // Match scope decorator  
  scope: /@scope\s*\(\s*(\w+)\s*\)/gi,
};

/**
 * Type names that look like dependencies syntactically but aren't ones we
 * want to plot on the architecture graph. Lowercased for cheap comparison.
 */
const PRIMITIVE_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'bigint',
  'symbol',
  'any',
  'unknown',
  'void',
  'never',
  'object',
  'null',
  'undefined',
  'date',
  'array',
  'map',
  'set',
  'promise',
  'function',
  'buffer',
]);

/**
 * Locate the constructor parameter list in `content`, honouring balanced
 * parentheses inside parameter decorators like `@inject(MyService)`.
 *
 * A naive `constructor\s*\(([^)]*)\)` regex breaks the moment a parameter
 * carries any decorator with arguments — it stops at the *inner* close
 * paren, leaving the parameter list truncated. That used to silently kill
 * the architecture graph for any class using `@inject(...)`.
 *
 * Returns `null` when no constructor is found.
 */
function findConstructorParams(content: string): string | null {
  const ctorIdx = content.search(/\bconstructor\s*\(/);
  if (ctorIdx < 0) return null;
  // Position the cursor at the `(` that opens the parameter list.
  const openIdx = content.indexOf('(', ctorIdx);
  if (openIdx < 0) return null;

  let depth = 0;
  for (let i = openIdx; i < content.length; i++) {
    const ch = content[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return content.slice(openIdx + 1, i);
      }
    }
  }
  // Unbalanced — bail out rather than produce garbage.
  return null;
}

/**
 * Extract injected dependency types from a constructor parameter list.
 *
 * Handles every shape ExpressoTS users hit in practice:
 *
 *   - parameter properties:        `private foo: Foo`
 *   - readonly properties:         `private readonly foo: Foo`
 *   - bare params:                 `foo: Foo`
 *   - explicit @inject decorators: `@inject(SYM) private foo: Foo`
 *   - multi-modifier combos:       `@inject(SYM) private readonly foo: Foo`
 *   - multiple params separated by commas
 *
 * The previous implementation captured the access modifier (`private`)
 * instead of the type, so the architecture graph never drew a dependency
 * edge from a controller to its use case.
 */
function extractParamTypes(params: string): string[] {
  const out: string[] = [];
  // Anchor each iteration to consume exactly one parameter:
  //   1) Optional `@decorator(...)` prefix(es) — args may contain commas
  //   2) Optional access modifier
  //   3) Optional `readonly`
  //   4) Parameter name
  //   5) `:` then the captured Type (allow `Foo`, `Ns.Foo`, `Foo<...>`)
  const PARAM_RE =
    /(?:@\w+\s*\([^)]*\)\s*)*(?:(?:public|private|protected)\s+)?(?:readonly\s+)?(\w+)\s*:\s*([A-Za-z_$][\w.$]*)/g;
  for (const match of params.matchAll(PARAM_RE)) {
    const typeName = match[2];
    if (!typeName) continue;
    const head = typeName.split('.').pop() || typeName;
    if (PRIMITIVE_TYPES.has(head.toLowerCase())) continue;
    out.push(head);
  }
  return out;
}

export class RouteScanner {
  private srcPath: string;
  private controllers: ControllerInfo[] = [];
  private services: ServiceInfo[] = [];
  private providers: ServiceInfo[] = [];
  private middleware: string[] = [];
  private dependencies: DependencyInfo[] = [];

  constructor(srcPath: string = './src') {
    this.srcPath = path.resolve(srcPath);
  }

  /** Scan the application and return structure */
  async scan(): Promise<AppStructure> {
    // Reset collections
    this.controllers = [];
    this.services = [];
    this.providers = [];
    this.middleware = [];
    this.dependencies = [];

    // Find all TypeScript files
    const files = await this.findTypeScriptFiles();

    // Parse each file
    for (const file of files) {
      await this.parseFile(file);
    }

    // Build dependency graph
    this.buildDependencyGraph();

    return {
      controllers: this.controllers,
      services: this.services,
      providers: this.providers,
      middleware: this.middleware,
      dependencies: this.dependencies,
    };
  }

  /** Get all discovered routes */
  getRoutes(): RouteInfo[] {
    return this.controllers.flatMap((c) => c.routes);
  }

  /** Find all TypeScript files in src directory */
  private async findTypeScriptFiles(): Promise<string[]> {
    if (!fs.existsSync(this.srcPath)) {
      console.warn(`Source path not found: ${this.srcPath}`);
      return [];
    }

    const pattern = path.join(this.srcPath, '**/*.{ts,js}').replace(/\\/g, '/');
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'],
    });

    return files;
  }

  /** Parse a single file for routes and services */
  private async parseFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Check if this is a controller
    const controllerMatch = content.match(/@controller\s*\(\s*['"`]([^'"`]+)['"`]/i);
    if (controllerMatch) {
      const controllerPath = controllerMatch[1];
      const controller = this.parseController(content, filePath, controllerPath, lines);
      if (controller) {
        this.controllers.push(controller);
      }
    }

    // Check if this is a service/provider
    const injectableMatch = content.match(/@provide\s*\(/i);
    if (injectableMatch) {
      const service = this.parseService(content, filePath);
      if (service) {
        // Determine if it's a service or provider based on naming
        if (
          filePath.includes('provider') ||
          service.name.toLowerCase().includes('provider')
        ) {
          this.providers.push(service);
        } else {
          this.services.push(service);
        }
      }
    }

    // Check for middleware
    const middlewareMatch = content.match(/@middleware\s*\(/i);
    if (middlewareMatch) {
      const classMatch = content.match(/class\s+(\w+)/);
      if (classMatch) {
        this.middleware.push(classMatch[1]);
      }
    }
  }

  /** Parse controller from file content */
  private parseController(
    content: string,
    filePath: string,
    basePath: string,
    lines: string[]
  ): ControllerInfo | null {
    // Get class name
    const classMatch = content.match(/class\s+(\w+)/);
    if (!classMatch) return null;

    const className = classMatch[1];
    const routes: RouteInfo[] = [];
    const dependencies: string[] = [];

    // Extract constructor dependencies. We use a balanced-paren scanner
    // here because parameter decorators (@inject(MyService)) contain
    // their own parentheses and a naive `[^)]*` regex would truncate
    // the parameter list at the wrong `)`.
    const params = findConstructorParams(content);
    if (params) {
      dependencies.push(...extractParamTypes(params));
    }

    // Find HTTP method decorators
    for (const [method, regex] of Object.entries(PATTERNS.httpMethods)) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const routePath = match[1] || '/';
        const lineNumber = this.getLineNumber(content, match.index, lines);
        
        // Find the method name (next function after decorator)
        const afterDecorator = content.slice(match.index);
        const methodMatch = afterDecorator.match(
          /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/
        );

        if (methodMatch) {
          routes.push({
            path: this.normalizePath(basePath, routePath),
            method: method.toUpperCase() as HttpMethod,
            controller: className,
            controllerMethod: methodMatch[1],
            filePath,
            lineNumber,
          });
        }
      }
    }

    return {
      name: className,
      filePath,
      routes,
      dependencies,
    };
  }

  /** Parse service from file content */
  private parseService(content: string, filePath: string): ServiceInfo | null {
    const classMatch = content.match(/class\s+(\w+)/);
    if (!classMatch) return null;

    const className = classMatch[1];
    const dependencies: string[] = [];
    const methods: string[] = [];

    // Extract constructor dependencies (same parser as controllers so the
    // service-to-service / service-to-provider edges in the architecture map
    // match the actual TypeScript types instead of parameter names).
    const params = findConstructorParams(content);
    if (params) {
      dependencies.push(...extractParamTypes(params));
    }

    // Extract public methods (simplified)
    const methodMatches = content.matchAll(
      /(?:public\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g
    );
    for (const match of methodMatches) {
      const methodName = match[1];
      if (methodName !== 'constructor' && !methodName.startsWith('_')) {
        methods.push(methodName);
      }
    }

    return {
      name: className,
      filePath,
      dependencies,
      methods,
    };
  }

  /** Build the dependency graph */
  private buildDependencyGraph(): void {
    // Add controller -> service dependencies
    for (const controller of this.controllers) {
      for (const dep of controller.dependencies) {
        this.dependencies.push({
          source: controller.name,
          target: dep,
          type: 'controller',
        });
      }
    }

    // Add service -> service/provider dependencies
    for (const service of [...this.services, ...this.providers]) {
      for (const dep of service.dependencies) {
        this.dependencies.push({
          source: service.name,
          target: dep,
          type: service.name.toLowerCase().includes('provider')
            ? 'provider'
            : 'service',
        });
      }
    }
  }

  /** Get line number for a position in content */
  private getLineNumber(_content: string, position: number, lines: string[]): number {
    let currentPos = 0;
    for (let i = 0; i < lines.length; i++) {
      currentPos += lines[i].length + 1; // +1 for newline
      if (currentPos > position) {
        return i + 1;
      }
    }
    return lines.length;
  }

  /** Normalize and combine paths */
  private normalizePath(basePath: string, routePath: string): string {
    // Ensure basePath starts with /
    if (!basePath.startsWith('/')) {
      basePath = '/' + basePath;
    }
    // Handle empty routePath
    if (!routePath || routePath === '/') {
      return basePath;
    }
    // Ensure routePath starts with /
    if (!routePath.startsWith('/')) {
      routePath = '/' + routePath;
    }
    // Combine paths, avoiding double slashes
    return (basePath + routePath).replace(/\/+/g, '/');
  }

  /** Scan Express app for routes (runtime) */
  static scanExpressApp(app: any): RouteInfo[] {
    const routes: RouteInfo[] = [];

    if (!app || !app._router) {
      return routes;
    }

    const extractRoutes = (stack: any[], basePath: string = '') => {
      for (const layer of stack) {
        if (layer.route) {
          // This is a route
          const route = layer.route;
          const methods = Object.keys(route.methods).filter((m) => route.methods[m]);
          
          for (const method of methods) {
            routes.push({
              path: basePath + route.path,
              method: method.toUpperCase() as HttpMethod,
              controller: 'Unknown',
              controllerMethod: 'Unknown',
            });
          }
        } else if (layer.name === 'router' && layer.handle.stack) {
          // This is a nested router
          const routerPath = layer.regexp.source
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\^/g, '')
            .replace(/\$/g, '')
            .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
          
          extractRoutes(layer.handle.stack, basePath + routerPath);
        }
      }
    };

    extractRoutes(app._router.stack);
    return routes;
  }
}
