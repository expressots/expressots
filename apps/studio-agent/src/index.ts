/**
 * @expressots/studio-agent
 * 
 * Instrumentation agent for ExpressoTS Studio
 * Provides route discovery, OpenTelemetry tracing, and request recording
 */

export { StudioAgent } from './agent.js';
export { StudioTracer, StudioSpanProcessor } from './instrumentation/index.js';
export { RouteScanner } from './discovery/index.js';
export { RequestRecorder } from './recording/index.js';
export {
  ContainerIntrospector,
  type ContainerSnapshot,
  type BindingNode,
  type BindingEdge,
} from './introspection/container-introspector.js';
export { DatabaseIntrospector } from './introspection/database-introspector.js';
export { LogCapture, type LogEntry, type LogLevel } from './logging/log-capture.js';
export {
  SecurityEngine,
  OsvCache,
  OsvClient,
  runNpmAudit,
  analyzePosture,
  buildSecurityReport,
  hashFindingIds,
  emptyReport,
  LockfileGraph,
  enrichFindingsWithFixes,
  buildFixGroups,
  buildReachabilitySnapshot,
  enrichWithReachability,
  runFix,
  buildFixArgs,
} from './security/index.js';
export {
  CoverageEngine,
  detectCoverageArtifact,
  parseIstanbulCoverage,
  parseLcov,
  buildCoverageTree,
  type CoverageEngineDeps,
  type CoverageReportListener,
  type DetectedArtifact,
  type ArtifactKind,
  type IstanbulCoverageData,
} from './coverage/index.js';
export { resolveInstallId } from './identity/index.js';
export {
  buildOpenApiDocument,
  diffOpenApiSpec,
  applyGlobalPrefix,
  detectGlobalPrefix,
  type OpenApiDocument,
  type BuildOpenApiOptions,
  type GenerationProvenance,
  type SpecDriftReport,
  type SpecDriftFinding,
  type SpecDriftSeverity,
} from './openapi/index.js';
export * from './types/index.js';
