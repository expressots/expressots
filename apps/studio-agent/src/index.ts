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
export * from './types/index.js';
