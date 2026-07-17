/**
 * Middleware Generator Tool
 * Generates middleware for authentication, CORS, rate limiting, etc.
 */

import type { AddMiddlewareOptions, GeneratedCode } from '../types/index.js';

/** Convert string to PascalCase */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/** Convert string to kebab-case */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/** Generate middleware based on type */
export function addMiddleware(options: AddMiddlewareOptions): GeneratedCode {
  const { type, route, options: middlewareOptions, name } = options;

  switch (type) {
    case 'auth':
      return generateAuthMiddleware(name, route, middlewareOptions);
    case 'cors':
      return generateCorsMiddleware(name, middlewareOptions);
    case 'rate-limit':
      return generateRateLimitMiddleware(name, route, middlewareOptions);
    case 'logging':
      return generateLoggingMiddleware(name);
    case 'validation':
      return generateValidationMiddleware(name);
    case 'custom':
      return generateCustomMiddleware(name || 'custom');
    default:
      return {
        files: [],
        summary: `Unknown middleware type: ${type}`,
      };
  }
}

function generateAuthMiddleware(
  name: string = 'auth',
  _route?: string,
  options?: Record<string, unknown>
): GeneratedCode {
  const namePascal = toPascalCase(name);
  const nameKebab = toKebabCase(name);
  const strategy = options?.strategy || 'jwt';

  const content = `import { Request, Response, NextFunction } from 'express';
import { provide } from 'inversify-binding-decorators';

export interface ${namePascal}Payload {
  userId: string;
  email: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: ${namePascal}Payload;
    }
  }
}

@provide(${namePascal}Middleware)
export class ${namePascal}Middleware {
  private readonly strategy = '${strategy}';

  /**
   * Express middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        res.status(401).json({ error: 'No authentication token provided' });
        return;
      }

      const payload = this.verifyToken(token);
      
      if (!payload) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }

  /**
   * Extract token from request
   */
  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Check query parameter
    if (typeof req.query.token === 'string') {
      return req.query.token;
    }

    // Check cookie
    if (req.cookies?.token) {
      return req.cookies.token;
    }

    return null;
  }

  /**
   * Verify token and return payload
   */
  private verifyToken(token: string): ${namePascal}Payload | null {
    // TODO: Replace this placeholder with real verification for your strategy:
    // JWT: verify with the jsonwebtoken library; session: look up the session store;
    // API key: validate against your stored keys.
    
    try {
      // For JWT strategy, you would use jsonwebtoken library
      // For session strategy, you would check session store
      // For API key strategy, you would validate against stored keys
      
      // Placeholder: decode base64 token (NOT FOR PRODUCTION)
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return decoded as ${namePascal}Payload;
    } catch {
      return null;
    }
  }

  /**
   * Check if user has required roles
   */
  requireRoles(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const hasRole = roles.some(role => req.user!.roles.includes(role));
      
      if (!hasRole) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    };
  }
}
`;

  return {
    files: [
      {
        path: `src/middleware/${nameKebab}.middleware.ts`,
        content,
        action: 'create',
      },
    ],
    summary: `Generated ${namePascal}Middleware with ${strategy} strategy`,
  };
}

function generateCorsMiddleware(
  name: string = 'cors',
  options?: Record<string, unknown>
): GeneratedCode {
  const namePascal = toPascalCase(name);
  const nameKebab = toKebabCase(name);
  const origin = options?.origin || '*';
  const methods = options?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const headers = options?.headers || ['Content-Type', 'Authorization'];

  const content = `import { Request, Response, NextFunction } from 'express';
import { provide } from 'inversify-binding-decorators';

export interface CorsOptions {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

@provide(${namePascal}Middleware)
export class ${namePascal}Middleware {
  private options: CorsOptions = {
    origin: ${JSON.stringify(origin)},
    methods: ${JSON.stringify(methods)},
    allowedHeaders: ${JSON.stringify(headers)},
    credentials: true,
    maxAge: 86400, // 24 hours
  };

  /**
   * Express middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const origin = this.getOrigin(req);
    
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', this.options.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', this.options.allowedHeaders.join(', '));
    
    if (this.options.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    if (this.options.maxAge) {
      res.setHeader('Access-Control-Max-Age', String(this.options.maxAge));
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  }

  private getOrigin(req: Request): string | null {
    const requestOrigin = req.headers.origin;
    
    if (this.options.origin === true || this.options.origin === '*') {
      return requestOrigin || '*';
    }
    
    if (typeof this.options.origin === 'string') {
      return this.options.origin;
    }
    
    if (Array.isArray(this.options.origin) && requestOrigin) {
      if (this.options.origin.includes(requestOrigin)) {
        return requestOrigin;
      }
    }
    
    return null;
  }
}
`;

  return {
    files: [
      {
        path: `src/middleware/${nameKebab}.middleware.ts`,
        content,
        action: 'create',
      },
    ],
    summary: `Generated ${namePascal}Middleware with configurable CORS`,
  };
}

function generateRateLimitMiddleware(
  name: string = 'rate-limit',
  route?: string,
  options?: Record<string, unknown>
): GeneratedCode {
  const namePascal = toPascalCase(name);
  const nameKebab = toKebabCase(name);
  const windowMs = (options?.window as number) || 60000;
  const maxRequests = (options?.requests as number) || 100;

  const content = `import { Request, Response, NextFunction } from 'express';
import { provide } from 'inversify-binding-decorators';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

@provide(${namePascal}Middleware)
export class ${namePascal}Middleware {
  private store: Map<string, RateLimitRecord> = new Map();
  
  private options: RateLimitOptions = {
    windowMs: ${windowMs},
    max: ${maxRequests},
    message: 'Too many requests, please try again later.',
    keyGenerator: (req) => req.ip || 'unknown',
  };

  constructor(options?: Partial<RateLimitOptions>) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), this.options.windowMs);
  }

  /**
   * Express middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const key = this.options.keyGenerator!(req);
    const now = Date.now();
    
    let record = this.store.get(key);
    
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.options.windowMs,
      };
    }
    
    record.count++;
    this.store.set(key, record);
    
    // Set rate limit headers
    const remaining = Math.max(0, this.options.max - record.count);
    res.setHeader('X-RateLimit-Limit', String(this.options.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));
    
    if (record.count > this.options.max) {
      res.status(429).json({
        error: this.options.message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }
    
    next();
  }

  /**
   * Create middleware for specific routes
   */
  forRoute(route: string, max?: number): (req: Request, res: Response, next: NextFunction) => void {
    const routeMax = max || this.options.max;
    
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.path.startsWith(route)) {
        return next();
      }
      
      const originalMax = this.options.max;
      this.options.max = routeMax;
      this.use(req, res, next);
      this.options.max = originalMax;
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
`;

  return {
    files: [
      {
        path: `src/middleware/${nameKebab}.middleware.ts`,
        content,
        action: 'create',
      },
    ],
    summary: `Generated ${namePascal}Middleware: ${maxRequests} requests per ${windowMs}ms${route ? ` for ${route}` : ''}`,
  };
}

function generateLoggingMiddleware(name: string = 'logging'): GeneratedCode {
  const namePascal = toPascalCase(name);
  const nameKebab = toKebabCase(name);

  const content = `import { Request, Response, NextFunction } from 'express';
import { provide } from 'inversify-binding-decorators';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent?: string;
  requestId?: string;
}

@provide(${namePascal}Middleware)
export class ${namePascal}Middleware {
  private logLevel: LogLevel = 'info';

  /**
   * Express middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Attach request ID to request
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Log on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'],
        requestId,
      };
      
      this.log(entry);
    });

    next();
  }

  private log(entry: LogEntry): void {
    const level = entry.statusCode >= 500 ? 'error' 
                : entry.statusCode >= 400 ? 'warn' 
                : 'info';
    
    const message = \`\${entry.method} \${entry.path} \${entry.statusCode} \${entry.duration}ms\`;
    
    console.log(JSON.stringify({
      level,
      message,
      ...entry,
    }));
  }

  private generateRequestId(): string {
    return \`req_\${Date.now().toString(36)}_\${Math.random().toString(36).slice(2, 9)}\`;
  }
}
`;

  return {
    files: [
      {
        path: `src/middleware/${nameKebab}.middleware.ts`,
        content,
        action: 'create',
      },
    ],
    summary: `Generated ${namePascal}Middleware with structured logging`,
  };
}

function generateValidationMiddleware(name: string = 'validation'): GeneratedCode {
  const namePascal = toPascalCase(name);
  const nameKebab = toKebabCase(name);

  const content = `import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass, ClassConstructor } from 'class-transformer';
import { provide } from 'inversify-binding-decorators';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    constraints: Record<string, string>;
  }>;
}

@provide(${namePascal}Middleware)
export class ${namePascal}Middleware {
  /**
   * Create validation middleware for a DTO class
   */
  validate<T extends object>(
    dtoClass: ClassConstructor<T>,
    source: 'body' | 'query' | 'params' = 'body'
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const data = req[source];
      const instance = plainToClass(dtoClass, data);
      const errors = await validate(instance);
      
      if (errors.length > 0) {
        const result = this.formatErrors(errors);
        res.status(400).json({
          error: 'Validation failed',
          details: result.errors,
        });
        return;
      }
      
      // Replace with validated instance
      (req as any)[source] = instance;
      next();
    };
  }

  private formatErrors(errors: ValidationError[]): ValidationResult {
    const formatted = errors.map(error => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
      constraints: error.constraints || {},
    }));
    
    return {
      valid: false,
      errors: formatted,
    };
  }
}
`;

  return {
    files: [
      {
        path: `src/middleware/${nameKebab}.middleware.ts`,
        content,
        action: 'create',
      },
    ],
    summary: `Generated ${namePascal}Middleware with class-validator support`,
  };
}

function generateCustomMiddleware(name: string): GeneratedCode {
  const namePascal = toPascalCase(name);
  const nameKebab = toKebabCase(name);

  const content = `import { Request, Response, NextFunction } from 'express';
import { provide } from 'inversify-binding-decorators';

@provide(${namePascal}Middleware)
export class ${namePascal}Middleware {
  /**
   * Express middleware function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // TODO: Replace the examples below with your middleware logic
    
    // Example: Add custom header
    res.setHeader('X-Custom-Header', 'value');
    
    // Example: Modify request
    (req as any).customData = {
      timestamp: Date.now(),
    };
    
    // Continue to next middleware
    next();
  }

  /**
   * Create parameterized middleware
   */
  withOptions(options: Record<string, unknown>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Use options to customize behavior
      console.log('Middleware options:', options);
      this.use(req, res, next);
    };
  }
}
`;

  return {
    files: [
      {
        path: `src/middleware/${nameKebab}.middleware.ts`,
        content,
        action: 'create',
      },
    ],
    summary: `Generated ${namePascal}Middleware (custom template)`,
  };
}
