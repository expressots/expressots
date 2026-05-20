/**
 * Studio Integration - Auto-detects and integrates ExpressoTS Studio Agent
 *
 * This module provides automatic integration with @expressots/studio-agent
 * when it's installed in the project. It enables request recording, tracing,
 * and real-time monitoring without requiring manual setup.
 */

import { Logger } from "@expressots/core";
import type { Application, RequestHandler } from "express";

// Lazy logger accessor so `new Logger()` only fires the first time we
// actually emit a Studio message. Routing through Logger means the
// framework's log-level configuration (e.g. `LOG_LEVEL=WARN`) silences
// the "listening" line as expected, instead of `console.log` always
// printing it. Lazy construction also keeps consumers that mock
// `@expressots/core` (test environments) from blowing up at module
// load when their Logger mock omits `.withContext`.
let _studioLogger: Logger | null = null;
function logger(): Logger {
  if (!_studioLogger) {
    _studioLogger = new Logger().withContext("studio");
  }
  return _studioLogger;
}

interface StudioAgentOptions {
  port?: number;
  dbPath?: string;
  serviceName?: string;
  enableRecording?: boolean;
  enableProfiling?: boolean;
  expressApp?: Application;
  // Forwarded to the agent as `unknown` so we don't tightly couple the
  // adapter to a specific @expressots/core symbol.
  appContainer?: unknown;
  /** HTTP port the host application is listening on. */
  appPort?: number;
  /** Global URL prefix (e.g. "/" or "/api/v1"). */
  globalPrefix?: string;
}

interface StudioAgentInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
  createMiddleware(): RequestHandler;
  scanRoutes(): Promise<void>;
  /**
   * Optional — older agents may not implement this. Used to push the
   * actual listening port + boot duration once the host server is up.
   */
  updateRuntimeInfo?(patch: {
    appPort?: number;
    globalPrefix?: string;
    startupMs?: number;
    interceptorCount?: number;
    providerCount?: number;
    middlewareCount?: number;
    runtimeItems?: StudioRuntimeItems;
    middlewarePreset?: StudioMiddlewarePresetInfo;
  }): void;
}

/**
 * Itemised runtime view forwarded to the Studio Agent. Populated from
 * DI metadata at boot — surfaces framework-registered items the agent's
 * static file scanner can't see (e.g. built-in providers, interceptors
 * registered via `@Interceptor()` on framework classes).
 *
 * Mirrors `RuntimeItems` in `@expressots/studio-agent` deliberately so
 * the adapter doesn't need to import from the studio package (which is
 * an optional peer dependency).
 */
export interface StudioRuntimeItems {
  providers?: Array<{ name: string; source?: string }>;
  interceptors?: Array<{ name: string; priority?: number; source?: string }>;
  middleware?: Array<{
    name: string;
    category: string;
    type: "built-in" | "custom";
    order: number;
    path?: string;
  }>;
  /**
   * Controller- and route-scoped middleware bindings, harvested from
   * `ControllerMetadata.middleware` Reflect entries after
   * `app.listen()`. Used by the agent to draw scope-aware
   * "middleware → controller / route" edges on the architecture map.
   *
   * Mirrors `MiddlewareBinding` in `@expressots/studio-agent`.
   */
  middlewareBindings?: Array<{
    middlewareName: string;
    scope: "controller" | "route";
    controllerName: string;
    controllerMethod?: string;
    httpMethod?: string;
    routePath?: string;
  }>;
}

/**
 * Middleware preset info forwarded to the Studio Agent. Mirrors
 * `MiddlewarePresetInfo` in `@expressots/studio-agent` so the adapter
 * doesn't need to import from the studio package.
 */
export interface StudioMiddlewarePresetInfo {
  name: string;
  hasOverrides: boolean;
  parse?: {
    json?: { limit?: string };
    urlencoded?: { limit?: string; extended?: boolean };
    cookies?: boolean;
  };
  security?: {
    tier?: string;
    helmet?: boolean;
    cors?: {
      origin?: boolean | string;
      credentials?: boolean;
      methods?: Array<string>;
      allowedHeaders?: Array<string>;
    };
    rateLimit?: { windowMs?: number; max?: number } | false;
  };
  compress?: { enabled: boolean; level?: number };
  logger?: { enabled: boolean; implementation?: string };
}

interface StudioIntegrationConfig {
  enabled?: boolean;
  port?: number;
  dbPath?: string;
  serviceName?: string;
  /** Forwarded to the agent so the Status page can show the app URL. */
  appPort?: number;
  /** Global URL prefix of the host application. */
  globalPrefix?: string;
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
  appContainer?: unknown,
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

  // Defensive: if a previous agent instance from this same process is still
  // around (e.g. App.init() called twice without a stop in between) shut it
  // down first so we don't leak the WebSocket port.
  if (studioAgent) {
    try {
      await studioAgent.stop();
    } catch {
      // best-effort cleanup
    }
    studioAgent = null;
    studioEnabled = false;
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
      logger().warn("Studio Agent module found but StudioAgent class not exported");
      if (debug) logger().debug(`Module contents: ${Object.keys(studioAgentModule).join(", ")}`);
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
      appContainer, // Pass AppContainer so the agent can build a DI snapshot
      appPort: config.appPort,
      globalPrefix: config.globalPrefix,
    };

    studioAgent = new StudioAgent(agentOptions);

    // Add the middleware BEFORE other routes to capture all requests
    const middleware = studioAgent.createMiddleware();
    app.use(middleware);

    // Start the agent (this also scans routes)
    await studioAgent.start();

    studioEnabled = true;

    logger().info(`Studio Agent listening on ws://localhost:${agentOptions.port}`);

    return true;
  } catch (error) {
    // Best-effort cleanup so a half-initialised agent doesn't hold the
    // WebSocket port across a retry.
    if (studioAgent) {
      try {
        await studioAgent.stop();
      } catch {
        // ignore
      }
      studioAgent = null;
    }
    studioEnabled = false;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;

    // Expected when @expressots/studio-agent isn't installed — silent.
    if (
      errorMessage.includes("Cannot find module") ||
      errorMessage.includes("ERR_MODULE_NOT_FOUND")
    ) {
      return false;
    }

    // Friendlier message for the most common failure mode: hot-reload
    // race left the port in TIME_WAIT.
    if (errorCode === "EADDRINUSE") {
      logger().warn(
        `Studio Agent could not bind its WebSocket port ` +
          `(${errorMessage}). The host app will continue without Studio. ` +
          `If this happened during hot-reload, the next restart should recover.`,
      );
      return false;
    }

    logger().warn(`Failed to initialize Studio Agent: ${errorMessage}`);
    return false;
  }
}

/**
 * Push runtime details to the agent that the host only knows after the
 * HTTP server has started — most importantly the actual listening port
 * and total boot time. No-ops when:
 *   - the agent isn't running, or
 *   - the installed agent is from an older preview without
 *     `updateRuntimeInfo()` (we feature-detect to stay forward-compatible).
 */
export function reportStudioRuntimeInfo(patch: {
  appPort?: number;
  globalPrefix?: string;
  startupMs?: number;
  interceptorCount?: number;
  providerCount?: number;
  middlewareCount?: number;
  runtimeItems?: StudioRuntimeItems;
  middlewarePreset?: StudioMiddlewarePresetInfo;
}): void {
  if (!studioAgent) return;
  if (typeof studioAgent.updateRuntimeInfo !== "function") return;
  try {
    studioAgent.updateRuntimeInfo(patch);
  } catch {
    // Best-effort — never break the host on a status-page update.
  }
}

/**
 * Re-trigger the Studio Agent's route discovery. Used by the host
 * after `app.listen()` so that the agent's runtime route scanner sees
 * the fully-populated Express `_router` stack (controllers are bound
 * by `InversifyExpressServer.build()` AFTER `initializeStudio()` runs,
 * so the agent's first scan only catches static-source routes).
 *
 * No-ops when:
 *   - Studio isn't enabled, or
 *   - the installed agent is too old to expose `scanRoutes()`.
 */
export async function rescanStudioRoutes(): Promise<void> {
  if (!studioAgent) return;
  if (typeof studioAgent.scanRoutes !== "function") return;
  try {
    await studioAgent.scanRoutes();
  } catch (error) {
    // Best-effort — never break the host on a Studio rescan.
    logger().warn(
      `Studio route rescan failed: ${error instanceof Error ? error.message : String(error)}`,
    );
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
