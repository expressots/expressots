/**
 * Studio Integration - Auto-detects and integrates ExpressoTS Studio Agent
 *
 * This module provides automatic integration with @expressots/studio-agent
 * when it's installed in the project. It enables request recording, tracing,
 * and real-time monitoring without requiring manual setup.
 */

import type { Application, RequestHandler } from "express";

interface StudioAgentOptions {
  port?: number;
  dbPath?: string;
  serviceName?: string;
  enableRecording?: boolean;
  enableProfiling?: boolean;
  expressApp?: Application;
}

interface StudioAgentInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
  createMiddleware(): RequestHandler;
  scanRoutes(): Promise<void>;
}

interface StudioIntegrationConfig {
  enabled?: boolean;
  port?: number;
  dbPath?: string;
  serviceName?: string;
}

let studioAgent: StudioAgentInstance | null = null;
let studioEnabled = false;

/**
 * Check if @expressots/studio-agent is installed
 */
async function isStudioAgentInstalled(): Promise<boolean> {
  const debug = process.env.EXPRESSOTS_STUDIO_DEBUG === "true";

  try {
    // Try to resolve the module first (works for both CJS and ESM)
    const resolved = require.resolve("@expressots/studio-agent");
    if (debug) console.log("[Studio] Resolved studio-agent at:", resolved);
    return true;
  } catch (error) {
    if (debug)
      console.log(
        "[Studio] Cannot resolve studio-agent:",
        error instanceof Error ? error.message : error,
      );
    // Module not installed
    return false;
  }
}

/**
 * Initialize the Studio Agent if available
 */
export async function initializeStudio(
  app: Application,
  config: StudioIntegrationConfig = {},
): Promise<boolean> {
  const debug = process.env.EXPRESSOTS_STUDIO_DEBUG === "true";

  // Check if explicitly disabled
  if (config.enabled === false || process.env.EXPRESSOTS_STUDIO === "false") {
    if (debug) console.log("[Studio] Disabled via config or env");
    return false;
  }

  // Only enable in development by default
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  if (!isDev && config.enabled !== true) {
    if (debug) console.log("[Studio] Not in development mode, skipping");
    return false;
  }

  // Check if studio-agent is installed
  const installed = await isStudioAgentInstalled();
  if (debug) console.log("[Studio] studio-agent installed:", installed);

  if (!installed) {
    return false;
  }

  try {
    if (debug) console.log("[Studio] Attempting dynamic import...");

    // Dynamic import for ESM module
    const studioAgentModule = await import("@expressots/studio-agent");

    if (debug) console.log("[Studio] Import successful, keys:", Object.keys(studioAgentModule));

    // studio-agent ships only named exports; cast through `any` so the
    // ESM build does not reject the legacy `default.StudioAgent`
    // fallback (kept for older preview tarballs).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studioAgentModuleAny = studioAgentModule as any;
    const StudioAgent =
      studioAgentModuleAny.StudioAgent || studioAgentModuleAny.default?.StudioAgent;

    if (!StudioAgent) {
      console.warn("⚠️  Studio Agent module found but StudioAgent class not exported");
      if (debug) console.log("[Studio] Module contents:", studioAgentModule);
      return false;
    }

    if (debug) console.log("[Studio] StudioAgent class found, initializing...");

    const agentOptions: StudioAgentOptions = {
      port: config.port ?? parseInt(process.env.EXPRESSOTS_STUDIO_PORT ?? "3334", 10),
      dbPath: config.dbPath ?? process.env.EXPRESSOTS_STUDIO_DB ?? ".studio/studio.db",
      serviceName: config.serviceName ?? "expressots-app",
      enableRecording: true,
      enableProfiling: true,
      expressApp: app, // Pass Express app for runtime route scanning
    };

    studioAgent = new StudioAgent(agentOptions);

    // Add the middleware BEFORE other routes to capture all requests
    const middleware = studioAgent.createMiddleware();
    app.use(middleware);

    // Start the agent (this also scans routes)
    await studioAgent.start();

    studioEnabled = true;

    console.log(`[ExpressoTS] Studio Agent listening on ws://localhost:${agentOptions.port}`);

    return true;
  } catch (error) {
    // Only warn if it's not a "module not found" error (which is expected when not installed)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      !errorMessage.includes("Cannot find module") &&
      !errorMessage.includes("ERR_MODULE_NOT_FOUND")
    ) {
      console.warn("⚠️  Failed to initialize Studio Agent:", errorMessage);
    }
    return false;
  }
}

/**
 * Stop the Studio Agent
 */
export async function stopStudio(): Promise<void> {
  if (studioAgent) {
    await studioAgent.stop();
    studioAgent = null;
    studioEnabled = false;
  }
}

/**
 * Check if Studio is enabled
 */
export function isStudioEnabled(): boolean {
  return studioEnabled;
}

/**
 * Get the Studio Agent instance
 */
export function getStudioAgent(): StudioAgentInstance | null {
  return studioAgent;
}
