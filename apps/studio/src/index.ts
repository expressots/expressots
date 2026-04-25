/**
 * @expressots/studio
 * 
 * ExpressoTS Studio - Developer Experience Platform
 * Main orchestrator package that launches the agent and UI
 */

export { Studio } from './studio.js';
export type { StudioConfig } from './studio.js';

// Re-export from agent for convenience
export { StudioAgent, RouteScanner, RequestRecorder } from '@expressots/studio-agent';
