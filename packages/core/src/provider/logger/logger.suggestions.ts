/**
 * @file logger.suggestions.ts
 * @description Smart error suggestions system
 * @module @expressots/core/provider/logger
 *
 * Features:
 * - Route suggestions for 404 errors
 * - Common error hints (database, port, module, auth, validation)
 * - String similarity matching for route suggestions
 * - Configurable suggestion display
 */

/**
 * Route information for suggestions.
 */
export interface RouteInfo {
  method: string;
  path: string;
  fullPath?: string; // Full path including prefix
}

/**
 * Route suggestion result.
 */
export interface RouteSuggestion {
  route: RouteInfo;
  similarity: number; // 0-1 similarity score
  reason?: string; // Why this route was suggested
}

/**
 * Error suggestion result.
 */
export interface ErrorSuggestion {
  type: "route" | "hint" | "common";
  title: string;
  message: string;
  actions?: Array<string>; // Suggested actions
  routes?: Array<RouteSuggestion>; // Route suggestions (for 404 errors)
}

/**
 * Configuration for error suggestions.
 * @public API
 */
export interface SuggestionsConfig {
  /** Enable error suggestions (default: true in dev, false in prod) */
  enabled: boolean;
  /** Show route suggestions for 404 errors (default: true) */
  showRouteSuggestions: boolean;
  /** Show common error hints (default: true) */
  showErrorHints: boolean;
  /** Maximum number of route suggestions to show (default: 3) */
  maxRouteSuggestions: number;
  /** Minimum similarity threshold for route suggestions (0-1, default: 0.3) */
  minSimilarityThreshold: number;
  /** Show routes with same prefix (default: true) */
  showPrefixMatches: boolean;
}

/**
 * Default suggestions configuration.
 * @returns Default config
 * @public API
 */
export function getDefaultSuggestionsConfig(): SuggestionsConfig {
  const isDevelopment = process.env.NODE_ENV !== "production";
  return {
    enabled: isDevelopment, // Enabled in dev, disabled in prod by default
    showRouteSuggestions: true,
    showErrorHints: true,
    maxRouteSuggestions: 3,
    minSimilarityThreshold: 0.3, // 30% similarity minimum
    showPrefixMatches: true,
  };
}

/**
 * Route registry for tracking all registered routes.
 * Used by the suggestion engine to provide route suggestions.
 */
class RouteRegistry {
  private routes: Array<RouteInfo> = [];

  /**
   * Register a route.
   */
  register(method: string, path: string, fullPath?: string): void {
    // Normalize path
    const normalizedPath = path.replace(/\/$/, "") || "/";
    const normalizedFullPath = fullPath
      ? fullPath.replace(/\/$/, "") || "/"
      : undefined;

    // Check if route already exists
    const exists = this.routes.some(
      (r) => r.method === method && r.path === normalizedPath,
    );

    if (!exists) {
      this.routes.push({
        method: method.toUpperCase(),
        path: normalizedPath,
        fullPath: normalizedFullPath || normalizedPath,
      });
    }
  }

  /**
   * Get all registered routes.
   */
  getAll(): Array<RouteInfo> {
    return [...this.routes];
  }

  /**
   * Get routes by method.
   */
  getByMethod(method: string): Array<RouteInfo> {
    return this.routes.filter((r) => r.method === method.toUpperCase());
  }

  /**
   * Clear all routes.
   */
  clear(): void {
    this.routes = [];
  }

  /**
   * Get routes matching a prefix.
   */
  getByPrefix(prefix: string): Array<RouteInfo> {
    const normalizedPrefix = prefix.replace(/\/$/, "") || "/";
    return this.routes.filter((r) => {
      const routePath = r.fullPath || r.path;
      return routePath.startsWith(normalizedPrefix);
    });
  }
}

/**
 * Global route registry instance.
 */
let globalRouteRegistry: RouteRegistry | null = null;

/**
 * Get the global route registry.
 * @returns Route registry instance
 * @public API
 */
export function getRouteRegistry(): RouteRegistry {
  if (!globalRouteRegistry) {
    globalRouteRegistry = new RouteRegistry();
  }
  return globalRouteRegistry;
}

/**
 * Calculate Levenshtein distance between two strings.
 * Used for string similarity calculation.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: Array<Array<number>> = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1, // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity between two strings (0-1).
 * Uses Levenshtein distance.
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Normalize path for comparison (remove params, query strings, etc.).
 */
function normalizePathForComparison(path: string): string {
  // Remove query strings
  let normalized = path.split("?")[0];
  // Remove trailing slashes
  normalized = normalized.replace(/\/$/, "") || "/";
  // Replace path parameters with placeholder
  normalized = normalized.replace(/:[^/]+/g, ":param");
  // Replace UUIDs and IDs with placeholder
  normalized = normalized.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    "/:id",
  );
  normalized = normalized.replace(/\/\d+/g, "/:id");
  return normalized;
}

/**
 * Suggest similar routes for a 404 error.
 * @param requestedPath - The path that was requested (404)
 * @param requestedMethod - The HTTP method used
 * @param config - Suggestions configuration
 * @returns Array of route suggestions
 * @public API
 */
export function suggestRoutes(
  requestedPath: string,
  requestedMethod: string = "GET",
  config: SuggestionsConfig = getDefaultSuggestionsConfig(),
): Array<RouteSuggestion> {
  if (!config.showRouteSuggestions) {
    return [];
  }

  const registry = getRouteRegistry();
  const allRoutes = registry.getAll();
  const requestedNormalized = normalizePathForComparison(requestedPath);

  // Calculate similarity for all routes
  const suggestions: Array<RouteSuggestion> = [];

  for (const route of allRoutes) {
    const routePath = route.fullPath || route.path;
    const routeNormalized = normalizePathForComparison(routePath);

    // Calculate similarity
    const similarity = calculateSimilarity(
      requestedNormalized,
      routeNormalized,
    );

    // Check if similarity meets threshold
    if (similarity >= config.minSimilarityThreshold) {
      let reason: string | undefined;

      // Determine reason for suggestion
      if (
        routeNormalized === requestedNormalized &&
        route.method !== requestedMethod
      ) {
        reason = `Route exists but method is ${route.method} (you used ${requestedMethod})`;
      } else if (similarity >= 0.8) {
        reason = "Very similar route";
      } else if (similarity >= 0.6) {
        reason = "Similar route";
      } else if (routePath.startsWith(requestedPath.split("?")[0])) {
        reason = "Route starts with this path";
      } else {
        reason = "Possible match";
      }

      suggestions.push({
        route,
        similarity,
        reason,
      });
    }
  }

  // Sort by similarity (highest first)
  suggestions.sort((a, b) => b.similarity - a.similarity);

  // Get prefix matches if enabled
  if (config.showPrefixMatches) {
    const prefixMatches = registry.getByPrefix(requestedPath.split("?")[0]);
    for (const route of prefixMatches) {
      // Only add if not already in suggestions
      if (
        !suggestions.some(
          (s) => s.route.method === route.method && s.route.path === route.path,
        )
      ) {
        suggestions.push({
          route,
          similarity: 0.5, // Lower similarity for prefix matches
          reason: "Route starts with this path",
        });
      }
    }
  }

  // Limit to max suggestions
  return suggestions.slice(0, config.maxRouteSuggestions);
}

/**
 * Get common error hints based on error message and type.
 * @param error - The error object
 * @param context - Additional context (request path, method, etc.)
 * @param config - Optional suggestions configuration (uses default if not provided)
 * @returns Array of error hints
 * @public API
 */
export function getErrorHints(
  error: Error,
  context?: {
    path?: string;
    method?: string;
    statusCode?: number;
  },
  config?: Partial<SuggestionsConfig>,
): Array<ErrorSuggestion> {
  // Merge provided config with defaults
  const suggestionsConfig: SuggestionsConfig = config
    ? { ...getDefaultSuggestionsConfig(), ...config }
    : getDefaultSuggestionsConfig();
  const hints: Array<ErrorSuggestion> = [];

  // If error hints are disabled, skip hint generation (but still allow route suggestions)
  if (
    !suggestionsConfig.showErrorHints &&
    !suggestionsConfig.showRouteSuggestions
  ) {
    return hints;
  }

  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();
  const stack = error.stack?.toLowerCase() || "";

  // Database connection errors (only if showErrorHints is enabled)
  if (
    (suggestionsConfig.showErrorHints &&
      errorMessage.includes("connection") &&
      (errorMessage.includes("database") ||
        errorMessage.includes("db") ||
        errorMessage.includes("postgres") ||
        errorMessage.includes("mysql") ||
        errorMessage.includes("mongodb") ||
        errorMessage.includes("sqlite"))) ||
    errorMessage.includes("cannot connect to database")
  ) {
    hints.push({
      type: "hint",
      title: "💾 Database Connection Error",
      message: "Unable to connect to the database",
      actions: [
        "Check database connection string in environment variables",
        "Verify database server is running",
        "Check network connectivity",
        "Review database credentials and permissions",
        "Check database connection pool settings",
      ],
    });
  }

  // Port already in use (only if showErrorHints is enabled)
  if (
    suggestionsConfig.showErrorHints &&
    (errorName.includes("eaddrinuse") ||
      errorMessage.includes("eaddrinuse") ||
      (errorMessage.includes("port") &&
        (errorMessage.includes("already in use") ||
          errorMessage.includes("address already in use"))))
  ) {
    const portMatch =
      errorMessage.match(/port\s+(\d+)/i) ||
      errorMessage.match(/:::(\d+)/) ||
      errorMessage.match(/:(\d+)/);
    const port = portMatch ? portMatch[1] : "unknown";

    hints.push({
      type: "hint",
      title: "🔌 Port Already in Use",
      message: `Port ${port} is already in use`,
      actions: [
        `Try a different port: Set PORT environment variable to another value`,
        `Find and stop the process using port ${port}`,
        `On Linux/Mac: lsof -ti:${port} | xargs kill`,
        `On Windows: netstat -ano | findstr :${port}`,
      ],
    });
  }

  // Module not found (only if showErrorHints is enabled)
  if (
    suggestionsConfig.showErrorHints &&
    (errorName.includes("module") ||
      errorMessage.includes("cannot find module") ||
      errorMessage.includes("module not found") ||
      stack.includes("cannot find module"))
  ) {
    const moduleMatch =
      errorMessage.match(/['"]([^'"]+)['"]/) || stack.match(/['"]([^'"]+)['"]/);
    const moduleName = moduleMatch ? moduleMatch[1] : "unknown";

    hints.push({
      type: "hint",
      title: "📦 Module Not Found",
      message: `Module '${moduleName}' could not be found`,
      actions: [
        `Install the module: npm install ${moduleName}`,
        `Check if the module name is spelled correctly`,
        `Verify the import path is correct`,
        `Check if the module is in package.json dependencies`,
        `Try clearing node_modules and reinstalling: rm -rf node_modules && npm install`,
      ],
    });
  }

  // Authentication errors (only if showErrorHints is enabled)
  if (
    suggestionsConfig.showErrorHints &&
    (errorMessage.includes("auth") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("forbidden") ||
      errorMessage.includes("token") ||
      errorMessage.includes("jwt") ||
      errorMessage.includes("credentials"))
  ) {
    hints.push({
      type: "hint",
      title: "🔐 Authentication Error",
      message: "Authentication or authorization failed",
      actions: [
        "Check Authorization header format: Bearer <token>",
        "Verify token is valid and not expired",
        "Check user permissions and roles",
        "Review authentication middleware configuration",
        "Verify JWT secret/key matches between services",
      ],
    });
  }

  // Validation errors (only if showErrorHints is enabled)
  if (
    suggestionsConfig.showErrorHints &&
    (errorMessage.includes("validation") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("required") ||
      errorName.includes("validation"))
  ) {
    hints.push({
      type: "hint",
      message: "Request validation failed",
      title: "✅ Validation Error",
      actions: [
        "Check request body matches expected schema",
        "Verify all required fields are present",
        "Check data types match expected format",
        "Review validation rules in DTOs",
        "Check Content-Type header matches request body format",
      ],
    });
  }

  // File system errors (only if showErrorHints is enabled)
  // Check for file system errors BEFORE 404 route suggestions to avoid conflicts
  if (
    suggestionsConfig.showErrorHints &&
    (errorMessage.includes("enoent") ||
      (errorMessage.includes("file") &&
        (errorMessage.includes("not found") ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("cannot find"))) ||
      (errorMessage.includes("directory") &&
        (errorMessage.includes("not found") ||
          errorMessage.includes("does not exist"))) ||
      (errorMessage.includes("path") && errorMessage.includes("not found")))
  ) {
    hints.push({
      type: "hint",
      title: "📁 File System Error",
      message: "File or directory not found",
      actions: [
        "Check file path is correct",
        "Verify file exists at the specified location",
        "Check file permissions",
        "Review relative vs absolute paths",
        "Verify working directory",
      ],
    });
    // Return early to avoid matching 404 route suggestion
    return hints;
  }

  // 404 Not Found (route suggestions)
  // Only check for route suggestions if it's not a file system error
  if (
    suggestionsConfig.showRouteSuggestions &&
    (context?.statusCode === 404 ||
      (errorMessage.includes("not found") &&
        !errorMessage.includes("file") &&
        !errorMessage.includes("directory") &&
        !errorMessage.includes("enoent")) ||
      errorName.includes("notfound"))
  ) {
    const requestedPath = context?.path || "unknown";
    const requestedMethod = context?.method || "GET";

    const routeSuggestions = suggestRoutes(
      requestedPath,
      requestedMethod,
      suggestionsConfig,
    );

    if (routeSuggestions.length > 0) {
      hints.push({
        type: "route",
        title: "🔍 Route Suggestions",
        message: `Route '${requestedMethod} ${requestedPath}' not found. Did you mean:`,
        routes: routeSuggestions,
      });
    } else if (suggestionsConfig.showErrorHints) {
      hints.push({
        type: "hint",
        title: "❌ Route Not Found",
        message: `Route '${requestedMethod} ${requestedPath}' does not exist`,
        actions: [
          "Check the route path spelling",
          "Verify the HTTP method (GET, POST, PUT, DELETE, etc.)",
          "Check if route requires authentication",
          "Review route registration in controllers",
          "Check global route prefix configuration",
        ],
      });
    }
  }

  // TypeScript/Compilation errors (only if showErrorHints is enabled)
  if (
    suggestionsConfig.showErrorHints &&
    (errorMessage.includes("typescript") ||
      errorMessage.includes("ts") ||
      errorMessage.includes("cannot find name") ||
      errorMessage.includes("type") ||
      stack.includes("typescript"))
  ) {
    hints.push({
      type: "hint",
      title: "📝 TypeScript Error",
      message: "TypeScript compilation or type error",
      actions: [
        "Check TypeScript configuration (tsconfig.json)",
        "Verify all types are correctly imported",
        "Check for missing type definitions: npm install --save-dev @types/<package>",
        "Review type errors in IDE",
        "Try rebuilding: npm run build",
      ],
    });
  }

  return hints;
}

/**
 * Format suggestions for display in logs.
 * @param suggestions - Array of error suggestions
 * @returns Formatted string
 * @public API
 */
export function formatSuggestions(suggestions: Array<ErrorSuggestion>): string {
  if (suggestions.length === 0) {
    return "";
  }

  let output = "\n💡 Suggestions:\n";

  for (const suggestion of suggestions) {
    output += `\n${suggestion.title}\n`;
    output += `  ${suggestion.message}\n`;

    // Add route suggestions
    if (suggestion.routes && suggestion.routes.length > 0) {
      output += "\n  Similar routes:\n";
      for (const routeSuggestion of suggestion.routes) {
        const route = routeSuggestion.route;
        const similarityPercent = Math.round(routeSuggestion.similarity * 100);
        output += `    ${route.method} ${route.fullPath || route.path} `;
        output += `(${similarityPercent}% similar`;
        if (routeSuggestion.reason) {
          output += ` - ${routeSuggestion.reason}`;
        }
        output += ")\n";
      }
    }

    // Add action suggestions
    if (suggestion.actions && suggestion.actions.length > 0) {
      output += "\n  Suggested actions:\n";
      for (const action of suggestion.actions) {
        output += `    • ${action}\n`;
      }
    }
  }

  return output;
}
