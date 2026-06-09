/**
 * OpenAPI 3.1 spec generation for ExpressoTS Studio.
 *
 * Dev/CI-time only: nothing here is mounted at runtime in production.
 */

export { buildOpenApiDocument } from './spec-builder.js';
export { diffOpenApiSpec } from './spec-diff.js';
export { inferSchema, unionSchema } from './schema-infer.js';
export {
  toOpenApiPath,
  makePathMatcher,
  detectVersionSegment,
  normaliseGlobalPrefix,
  joinPrefixWithRoute,
  applyGlobalPrefix,
} from './path-utils.js';
export { detectGlobalPrefix } from './detect-prefix.js';
export type {
  OpenApiDocument,
  OpenApiInfo,
  JsonSchema,
  BuildOpenApiOptions,
  GenerationProvenance,
} from './types.js';
export type {
  SpecDriftReport,
  SpecDriftFinding,
  SpecDriftSeverity,
} from './spec-diff.js';
