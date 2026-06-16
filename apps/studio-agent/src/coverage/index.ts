/**
 * Coverage module — local, git-aware code coverage intelligence.
 *
 * Public surface for the agent + tests. The engine is the orchestrator;
 * the parsers / detector / tree-builder are exported so they can be
 * unit-tested in isolation.
 */

export {
  CoverageEngine,
  type CoverageEngineDeps,
  type CoverageReportListener,
} from './coverage-engine.js';
export {
  detectCoverageArtifact,
  type DetectedArtifact,
  type ArtifactKind,
} from './artifact-detector.js';
export {
  parseIstanbulCoverage,
  type IstanbulCoverageData,
} from './istanbul-parser.js';
export { parseLcov } from './lcov-parser.js';
export { buildCoverageTree } from './tree-builder.js';
export { computeDiffCoverage } from './git-diff.js';
export { CoverageHistory } from './history.js';
export {
  getRunnerInvocation,
  isSupportedRunner,
  type RunnerName,
  type RunnerInvocation,
} from './framework-adapters.js';
export {
  runCoverageCommand,
  type CoverageRunInput,
  type CoverageRunResult,
} from './runner.js';
export {
  parseTestResults,
  type TestResultsFormat,
} from './test-results-parser.js';
export {
  resolveThresholds,
  evaluateThresholds,
  type CoverageThresholds,
  type ThresholdResult,
} from './thresholds.js';
export {
  loadCoverageConfig,
  mergeCoverageConfig,
  coverageConfigPath,
} from './config.js';
export {
  metric,
  emptyMetrics,
  combineMetrics,
  pctOf,
  round2,
} from './metrics.js';
