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

    // Extract constructor dependencies
    const constructorMatch = content.match(
      /constructor\s*\(([^)]*)\)/
    );
    if (constructorMatch) {
      const params = constructorMatch[1];
      const injectMatches = params.matchAll(
        /(?:@inject\s*\(\s*)?(\w+)(?:\s*\))?\s*(?:private|public|protected)?\s*(?:readonly)?\s*(\w+)\s*:/g
      );
      for (const match of injectMatches) {
        const typeName = match[1];
        if (typeName && !['string', 'number', 'boolean', 'any', 'unknown', 'void'].includes(typeName.toLowerCase())) {
          dependencies.push(typeName);
        }
      }
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

    // Extract constructor dependencies
    const constructorMatch = content.match(/constructor\s*\(([^)]*)\)/);
    if (constructorMatch) {
      const params = constructorMatch[1];
      const typeMatches = params.matchAll(/(\w+)\s*:/g);
      for (const match of typeMatches) {
        const typeName = match[1];
        if (!['string', 'number', 'boolean', 'any', 'unknown', 'void'].includes(typeName.toLowerCase())) {
          dependencies.push(typeName);
        }
      }
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
