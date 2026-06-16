/**
 * OpenAPI 3.1 document types used by the Studio spec builder.
 *
 * These are intentionally loose (`JsonSchema = Record<string, unknown>`)
 * because the builder emits best-effort schemas inferred from static DTO
 * shapes and real recorded traffic, not a hand-authored contract.
 */

/** A JSON Schema object (Draft 2020-12, the dialect OpenAPI 3.1 uses). */
export type JsonSchema = Record<string, unknown>;

/**
 * How the schemas in a document were produced:
 *   - `inferred`  — derived from DTO field types and/or recorded traffic.
 *   - `extracted` — taken from a validation adapter's `extractSchema()`.
 *   - `mixed`     — a combination of both.
 */
export type GenerationProvenance = 'inferred' | 'extracted' | 'mixed';

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
  /**
   * Non-standard marker so downstream tooling (and humans) know this
   * document was machine-generated and may need review before being
   * promoted to an authoritative contract.
   */
  'x-expressots-generated': GenerationProvenance;
}

export interface OpenApiDocument {
  openapi: string;
  info: OpenApiInfo;
  paths: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, JsonSchema>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

export interface BuildOpenApiOptions {
  /** Document title. Defaults to "ExpressoTS API". */
  title?: string;
  /** Document version string. Defaults to "0.0.0". */
  version?: string;
  /** Optional human description for `info.description`. */
  description?: string;
  /**
   * Restrict the document to a single API version. Matches routes whose
   * path begins with a `/v<value>` segment (e.g. `2` -> `/v2/...`).
   */
  apiVersion?: string | number;
  /**
   * Precise JSON Schemas keyed by DTO/schema name, typically produced by
   * a validation adapter's `extractSchema()`. When a route's `bodyDto`
   * matches a key here, the precise schema wins over the inferred sample.
   */
  schemaOverrides?: Record<string, JsonSchema>;
}
