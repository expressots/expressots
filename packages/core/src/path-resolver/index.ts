/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * TypeScript path mapping utilities.
 *
 * NOTE: Path aliases are automatically resolved at BUILD TIME by the ExpressoTS CLI.
 * The `expressots build` command transforms path aliases (e.g., `@useCases/*`)
 * to relative paths (e.g., `./useCases/*`) in the compiled output.
 *
 * This module provides runtime utilities for ADVANCED use cases only,
 * such as custom build pipelines or programmatic path resolution.
 *
 * For standard usage, simply run `expressots build` followed by `expressots prod`.
 *
 * @module path-resolver
 * @packageDocumentation
 */

import * as Module from "module";
import * as path from "path";
import * as fs from "fs";

/**
 * Path mapping configuration interface.
 * Matches TypeScript's paths configuration.
 */
export interface PathMapping {
  [pattern: string]: Array<string>;
}

/**
 * Configuration for path resolver.
 */
export interface PathResolverConfig {
  /**
   * Base URL for path resolution (from tsconfig.json).
   * @example "./src"
   */
  baseUrl: string;

  /**
   * Path mappings (from tsconfig.json paths).
   * @example { "@app/*": ["app/*"], "@shared/*": ["shared/*"] }
   */
  paths: PathMapping;

  /**
   * Root directory for resolution.
   * Defaults to process.cwd()
   */
  rootDir?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convert a tsconfig path alias (e.g. `@app/*`) into a anchored RegExp. */
function aliasPathPatternToRegExp(alias: string): RegExp {
  const segments = alias.split("*").map(escapeRegExp);
  return new RegExp(`^${segments.join("(.*)")}$`);
}

/**
 * Patch Node's CommonJS module resolver so `@alias/*` requests resolve to
 * their mapped files at runtime.
 *
 * Advanced/manual use only: standard projects get aliases rewritten to
 * relative paths at build time (`expressots build`) and never call this.
 *
 * @param config - Path resolver configuration
 * @internal
 *
 * @example
 * ```typescript
 * registerPathMappings({
 *   baseUrl: "./src",
 *   paths: {
 *     "@app/*": ["app/*"],
 *     "@shared/*": ["shared/*"]
 *   }
 * });
 * ```
 */
export function registerPathMappings(config: PathResolverConfig): void {
  const { baseUrl, paths, rootDir = process.cwd() } = config;
  const debug = process.env.LOG_PATH_RESOLUTION === "true";

  // Resolve absolute base path
  const absoluteBase = path.resolve(rootDir, baseUrl);

  // Store original resolver
  const originalResolveFilename = (Module as any)._resolveFilename;

  // Create resolver function
  const resolveWithPaths = function (
    this: any,
    request: string,
    parent: any,
    isMain: boolean,
    options?: any,
  ): string {
    // Check if request matches any path mapping
    for (const [alias, targets] of Object.entries(paths)) {
      const regex = aliasPathPatternToRegExp(alias);
      const match = request.match(regex);

      if (match) {
        // Try each target path
        for (const target of targets) {
          // Replace * with captured group
          const resolvedTarget = target.replace(/\*/g, match[1] || "");
          const fullPath = path.resolve(absoluteBase, resolvedTarget);

          // Try different extensions
          const extensions = [".js", ".json", "/index.js", ".node"];
          for (const ext of extensions) {
            const tryPath = fullPath.endsWith(".js")
              ? fullPath
              : fullPath + ext;
            if (fs.existsSync(tryPath)) {
              if (debug) {
                console.log(`[PathResolver] Resolved ${request} -> ${tryPath}`);
              }
              return originalResolveFilename.call(
                this,
                tryPath,
                parent,
                isMain,
                options,
              );
            }
          }
        }
      }
    }

    // Fall back to original resolver
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  // Try multiple ways to override module resolution (Node version compatibility)
  try {
    // Method 1: Direct assignment (works on Node < 22)
    (Module as any)._resolveFilename = resolveWithPaths;
  } catch {
    try {
      // Method 2: Object.defineProperty (Node 22+ where direct assignment fails)
      Object.defineProperty(Module, "_resolveFilename", {
        value: resolveWithPaths,
        writable: true,
        configurable: true,
      });
    } catch (e) {
      // Method 3: Use require.cache manipulation for Node 22+
      // This is a fallback that doesn't require modifying Module internals
      if (debug) {
        console.log(`[PathResolver] Using fallback resolution method`);
      }

      // Store mappings for use with manual requires
      (global as any).__expressotsPathMappings = {
        absoluteBase,
        paths,
        resolve: (request: string): string | null => {
          for (const [alias, targets] of Object.entries(paths)) {
            const regex = aliasPathPatternToRegExp(alias);
            const match = request.match(regex);

            if (match) {
              for (const target of targets) {
                const resolvedTarget = target.replace(/\*/g, match[1] || "");
                const fullPath = path.resolve(absoluteBase, resolvedTarget);
                const extensions = [".js", ".json", "/index.js", ".node"];

                for (const ext of extensions) {
                  const tryPath = fullPath.endsWith(".js")
                    ? fullPath
                    : fullPath + ext;
                  if (fs.existsSync(tryPath)) {
                    return tryPath;
                  }
                }
              }
            }
          }
          return null;
        },
      };
    }
  }
}

/**
 * Load a tsconfig and extract its `paths` mapping.
 *
 * `baseUrl` is optional (it is deprecated in TypeScript 7). When omitted,
 * `paths` are treated as relative to the tsconfig directory, i.e. the same
 * as `baseUrl: "."` -- the convention the v4 templates use.
 *
 * This is NOT called automatically anywhere. Use it together with
 * {@link registerPathMappings} (or via {@link initializePathResolution})
 * only for advanced/manual runtime resolution.
 *
 * @param tsconfigPath - Path to tsconfig.json or tsconfig.build.json
 * @returns Path resolver configuration, or null when no `paths` are defined
 * @internal
 *
 * @example
 * ```typescript
 * const config = loadPathMappingsFromTsConfig("./tsconfig.build.json");
 * if (config) {
 *   registerPathMappings(config);
 * }
 * ```
 */
export function loadPathMappingsFromTsConfig(
  tsconfigPath: string = "./tsconfig.json",
): PathResolverConfig | null {
  const debug = process.env.LOG_PATH_RESOLUTION === "true";

  try {
    const configPath = path.resolve(process.cwd(), tsconfigPath);
    if (debug) {
      console.log(`[PathResolver] Loading: ${configPath}`);
    }

    if (!fs.existsSync(configPath)) {
      if (debug) {
        console.log(`[PathResolver] File not found: ${configPath}`);
      }
      return null;
    }

    // Use require() to load JSON - Node handles encoding, BOM, etc. automatically
    // Clear cache first to ensure fresh load
    delete require.cache[configPath];
    const tsconfig = require(configPath);

    const compilerOptions = tsconfig.compilerOptions;

    if (!compilerOptions?.paths) {
      if (debug) {
        console.log(`[PathResolver] No paths defined in ${tsconfigPath}`);
      }
      return null;
    }

    // `baseUrl` is optional (deprecated in TypeScript 7). When it is absent,
    // as the v4 templates intentionally leave it, `paths` resolve relative
    // to the tsconfig directory, i.e. the same as `baseUrl: "."`. Default to
    // that so this helper supports both the legacy (`baseUrl: "./src"`) and
    // current template conventions.
    const baseUrl: string = compilerOptions.baseUrl ?? ".";

    // IMPORTANT: In production, resolve baseUrl relative to outDir
    // outDir: "./dist", baseUrl: "./src" -> resolve to "./dist/src"
    let resolvedBaseUrl = baseUrl;
    const outDir = compilerOptions.outDir;

    if (outDir) {
      // We're in compiled output (dist/), adjust baseUrl relative to current directory
      // Current dir is root (where dist/ is), baseUrl should be relative to that
      resolvedBaseUrl = path.join(outDir, baseUrl);
    }

    if (debug) {
      console.log(`[PathResolver] Config loaded successfully:`);
      console.log(`[PathResolver] baseUrl: ${resolvedBaseUrl}`);
      console.log(
        `[PathResolver] paths: ${JSON.stringify(compilerOptions.paths)}`,
      );
    }

    return {
      baseUrl: resolvedBaseUrl,
      paths: compilerOptions.paths,
      rootDir: process.cwd(), // Always root of project
    };
  } catch (error) {
    if (debug) {
      console.log(`[PathResolver] Error loading config: ${error}`);
    }
    // Silently fail - path aliases are optional
    return null;
  }
}

/**
 * Opt-in runtime path-alias resolution for advanced setups.
 *
 * This is NOT called automatically by `bootstrap()`. Standard ExpressoTS
 * projects never need it: `expressots dev` resolves tsconfig `paths` via tsx,
 * and `expressots build` rewrites aliases to relative paths for production.
 * Call this manually (before `bootstrap()`) only if you run compiled output
 * that still contains `@alias/*` requires.
 *
 * @param tsconfigPath - Optional path to tsconfig.json (defaults to ./tsconfig.json)
 * @returns true if paths were registered, false otherwise
 * @public
 *
 * @example
 * ```typescript
 * // Resolve aliases at runtime from the build tsconfig, before bootstrap()
 * initializePathResolution("./tsconfig.build.json");
 * await bootstrap(App);
 * ```
 */
export function initializePathResolution(tsconfigPath?: string): boolean {
  const config = loadPathMappingsFromTsConfig(tsconfigPath);

  if (config) {
    registerPathMappings(config);
    return true;
  }

  return false;
}
