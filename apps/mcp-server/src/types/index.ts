/**
 * Type definitions for ExpressoTS MCP Server
 */

/** CRUD generation options */
export interface GenerateCrudOptions {
  entity: string;
  entityPlural?: string;
  withValidation?: boolean;
  withTests?: boolean;
  withDto?: boolean;
  basePath?: string;
  outputDir?: string;
}

/** Middleware options */
export interface AddMiddlewareOptions {
  type: 'auth' | 'cors' | 'rate-limit' | 'logging' | 'validation' | 'custom';
  route?: string;
  options?: Record<string, unknown>;
  name?: string;
}

/** Query optimization suggestions */
export interface OptimizeQueryOptions {
  service: string;
  method: string;
  suggestion?: string;
}

/** Caching configuration */
export interface AddCachingOptions {
  endpoint: string;
  strategy: 'memory' | 'redis' | 'file';
  ttl: number;
  key?: string;
}

/** Rate limiting configuration */
export interface AddRateLimitOptions {
  endpoint: string;
  requests: number;
  window: number;
  keyGenerator?: string;
}

/** DTO generation options */
export interface GenerateDtoOptions {
  name: string;
  fields: DtoField[];
  validation?: boolean;
  outputDir?: string;
}

/** DTO field definition */
export interface DtoField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required?: boolean;
  validation?: FieldValidation;
}

/** Field validation rules */
export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
}

/** Authentication options */
export interface AddAuthenticationOptions {
  strategy: 'jwt' | 'session' | 'api-key' | 'oauth';
  routes?: string[];
  options?: Record<string, unknown>;
}

/** Test generation options */
export interface GenerateTestOptions {
  targetFile: string;
  testType: 'unit' | 'integration' | 'e2e';
  outputDir?: string;
}

/** Code analysis result */
export interface CodeAnalysisResult {
  file: string;
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
}

/** Code issue detected */
export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  rule?: string;
}

/** Code improvement suggestion */
export interface CodeSuggestion {
  type: 'performance' | 'security' | 'best-practice' | 'refactor';
  message: string;
  fix?: string;
  line?: number;
}

/** Generated code result */
export interface GeneratedCode {
  files: GeneratedFile[];
  summary: string;
}

/** Generated file */
export interface GeneratedFile {
  path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}

/** Project context for AI tools */
export interface ProjectContext {
  rootDir: string;
  srcDir: string;
  controllers: string[];
  services: string[];
  entities: string[];
  dtos: string[];
  middleware: string[];
  dependencies: Record<string, string>;
}
