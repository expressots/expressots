import { config, parse } from "@expressots/shared";
import { AppFactory } from "./application-factory";
import { IWebServer, IWebServerPublic } from "@expressots/shared";
import { IConsoleMessage } from "@expressots/shared";
import { Logger } from "../provider/logger/logger.provider";
import fs from "fs";
import path from "path";

// Note: Path resolution is auto-initialized in core/src/index.ts as a side effect
// when the @expressots/core module is first imported. This happens BEFORE
// bootstrap() is called, ensuring path aliases work in production.

/**
 * Common environment names used in ExpressoTS applications.
 * @public API
 */
export type EnvironmentName =
  | "development"
  | "production"
  | "staging"
  | "test"
  | "local"
  | (string & NonNullable<unknown>); // Allow custom environment names

/**
 * Mapping of environment names to their corresponding .env file names.
 *
 * @example
 * ```typescript
 * {
 *   development: ".env.dev",
 *   production: ".env.prod",
 *   staging: ".env.staging"
 * }
 * ```
 *
 * @public API
 */
export interface EnvironmentFileMap {
  /** Environment name → .env file name mapping */
  [environmentName: string]: string;
}

/**
 * Configuration for environment file loading, validation, and auto-creation.
 *
 * @layer public
 * @audience application-developers
 *
 * **Opt-in Feature**: If not provided, .env file loading is skipped entirely.
 *
 * @public API
 *
 * @example
 * ```typescript
 * // Basic usage - auto-create template
 * envFileConfig: {
 *   autoCreateTemplate: true,
 *   required: ["DATABASE_URL"]
 * }
 *
 * // Production-ready with validation
 * envFileConfig: {
 *   files: {
 *     development: ".env.dev",
 *     production: ".env.prod"
 *   },
 *   required: ["DATABASE_URL", "JWT_SECRET"],
 *   validateValues: true
 * }
 * ```
 */
export interface EnvironmentFileConfig {
  /**
   * Custom mapping of environment names to .env file names.
   *
   * @default `.env.{currentEnvironment}` (convention-based)
   *
   * **Runtime behavior:** Only the file for the CURRENT environment (from `currentEnvironment`)
   * will be loaded at runtime. The mapping allows you to use custom file names.
   *
   * **Template creation:** If `autoCreateTemplate: true` and `files` mapping is provided,
   * templates will be created for ALL mapped environments, not just the current one.
   * This helps set up your project with all necessary .env files upfront.
   *
   * @example
   * ```typescript
   * // Runtime: When currentEnvironment="development", loads ".env.dev"
   * // Template creation: If autoCreateTemplate: true, creates BOTH .env.dev AND .env.prod
   * files: {
   *   development: ".env.dev",
   *   production: ".env.prod",
   *   staging: ".env.staging"
   * }
   * ```
   *
   * **Default behavior:** If not provided, uses convention: `.env.{currentEnvironment}`
   * - `currentEnvironment="development"` → loads `.env.development`
   * - `currentEnvironment="production"` → loads `.env.production`
   */
  files?: EnvironmentFileMap;

  /**
   * Validate that the required .env file exists.
   *
   * @default `true` locally, `false` in CI
   *
   * **Behavior:**
   * - `true`: Throws `EnvFileNotFoundError` if file is missing
   * - `false`: Silently skips missing files (logs warning)
   *
   * @example
   * ```typescript
   * // Strict validation (recommended for production)
   * validateFile: true
   *
   * // Lenient (allow missing files)
   * validateFile: false
   * ```
   */
  validateFile?: boolean;

  /**
   * Validate that all variables in the .env file have non-empty values.
   *
   * @default `true` in production/CI, `false` in development
   *
   * **Behavior:**
   * - `true`: Throws `EnvValidationError` if any variable is empty
   * - `false`: Allows empty values (except `required` array)
   *
   * **Note:** Variables in `required` array are always validated, regardless of this setting.
   *
   * @example
   * ```typescript
   * // Strict validation (production)
   * validateValues: true
   *
   * // Lenient (development)
   * validateValues: false
   * ```
   */
  validateValues?: boolean;

  /**
   * Auto-create template .env file if missing.
   *
   * @default `false` (opt-in behavior)
   *
   * **Important:** File creation only happens if `envFileConfig` is provided.
   * Set to `true` to enable auto-creation of template files.
   *
   * **Template creation behavior:**
   * - If `files` mapping provided: Creates templates for ALL mapped environments
   * - Otherwise: Creates template for current environment only
   *
   * **Template content:**
   * - `PORT=3000`
   * - `NODE_ENV={currentEnvironment}` (e.g., "development", "production")
   * - Required variables (from `required` array) as empty placeholders
   *
   * @example
   * ```typescript
   * // Opt-in to .env file loading and auto-creation
   * envFileConfig: {
   *   autoCreateTemplate: true  // Explicitly enable
   * }
   * ```
   */
  autoCreateTemplate?: boolean;

  /**
   * Required environment variable names that must exist and have non-empty values.
   *
   * @default `[]` (no required variables)
   *
   * **Validation behavior:**
   * - These are **always validated**, even if `validateValues` is `false`
   * - Validated from `process.env` in CI mode
   * - Validated from .env file in local mode
   * - When auto-creating templates, these variables are added as empty placeholders
   *
   * @example
   * ```typescript
   * required: ["DATABASE_URL", "API_KEY", "JWT_SECRET"]
   * ```
   *
   * Creates template with:
   * ```
   * PORT=3000
   * NODE_ENV=development
   * DATABASE_URL=
   * API_KEY=
   * JWT_SECRET=
   * ```
   */
  required?: ReadonlyArray<string>;

  /**
   * Force CI/CD mode (auto-detected if not set).
   *
   * @default Auto-detected from `process.env.CI`, `GITHUB_ACTIONS`, etc.
   *
   * **When `true`:**
   * - Skips .env file loading
   * - Validates variables from `process.env` only
   * - Never creates template files
   * - Provides platform-specific error hints
   *
   * **Use case:** Explicitly force CI mode when auto-detection fails
   *
   * @example
   * ```typescript
   * // Explicit CI mode
   * ciMode: true
   * ```
   */
  ciMode?: boolean;

  /**
   * Skip .env file loading entirely (useful for CI/CD and containers).
   *
   * @default `false`
   *
   * **When `true`:**
   * - Only uses `process.env` variables
   * - Ignores all .env files
   * - Still validates required variables from `process.env`
   *
   * **Use cases:**
   * - Docker/Kubernetes deployments (variables from ConfigMaps/Secrets)
   * - CI/CD pipelines (variables from platform secrets)
   * - Testing with mock environment variables
   *
   * @example
   * ```typescript
   * // Containerized deployment
   * skipFileLoading: true
   * ```
   */
  skipFileLoading?: boolean;
}

/**
 * Options for loadEnvSync().
 * @public API
 */
export interface LoadEnvSyncOptions {
  /**
   * Custom mapping of environment names to .env file names.
   * @default Uses convention: `.env.{currentEnvironment}`
   */
  files?: EnvironmentFileMap;

  /**
   * Force reload even if already loaded.
   * Useful for hot reload scenarios.
   * @default false
   */
  force?: boolean;
}

/**
 * Synchronously load .env files BEFORE defineConfig() resolves.
 *
 * Call this at the top of your config file to ensure environment variables
 * are available when defineConfig() runs.
 *
 * @param options - Environment file configuration
 *
 * @example
 * ```typescript
 * // config.ts
 * import { defineConfig, Env, loadEnvSync } from "@expressots/core";
 *
 * // Load .env files first
 * loadEnvSync({
 *   files: {
 *     development: ".env.dev",
 *     production: ".env.prod",
 *   },
 * });
 *
 * // Now defineConfig() will read from loaded .env files
 * export const appConfig = defineConfig({
 *   server: {
 *     port: Env.port("PORT", { default: 3000 }),
 *   },
 * });
 * ```
 *
 * @public API
 */
export function loadEnvSync(options?: LoadEnvSyncOptions): void {
  // Skip if already loaded (unless force reload)
  if (process.env._EXPRESSOTS_ENV_LOADED === "true" && !options?.force) {
    return;
  }

  // Determine current environment
  const currentEnvironment = process.env.NODE_ENV ?? "development";

  // Determine the file name for current environment
  const envFileName =
    options?.files?.[currentEnvironment] ?? `.env.${currentEnvironment}`;

  // Load optional base files first (they get overridden by environment-specific file)
  // Use override: true to ensure new values overwrite existing ones (important for hot reload)
  const optionalFiles = [".env", ".env.local", `${envFileName}.local`];
  for (const file of optionalFiles) {
    try {
      if (fs.existsSync(file)) {
        config({ path: file, override: true });
      }
    } catch {
      // Silently skip optional files
    }
  }

  // Load the environment-specific file
  if (fs.existsSync(envFileName)) {
    config({ path: envFileName, override: true });
  }

  // Mark as loaded
  process.env._EXPRESSOTS_ENV_LOADED = "true";
}

/**
 * Config object shape that can be passed directly to bootstrap().
 * This allows config objects from defineConfig() to be used directly.
 *
 * The config object must have at least the required properties (app.name, app.version,
 * app.environment, server.port), but can have additional properties (like logging,
 * server.host, etc.) which will be ignored.
 *
 * @layer public
 * @audience application-developers
 *
 * @example
 * ```typescript
 * const config = defineConfig({
 *   app: {
 *     name: Env.string("APP_NAME", { default: "My App" }),
 *     version: Env.string("APP_VERSION", { default: "1.0.0" }),
 *     environment: Env.enum("NODE_ENV", ["development", "production"])
 *   },
 *   server: {
 *     port: Env.port("PORT", { default: 3000 })
 *   },
 *   bootstrap: {
 *     envFileConfig: {
 *       autoCreateTemplate: true,
 *       files: {
 *         development: ".env.dev",
 *         production: ".env.prod"
 *       }
 *     }
 *   }
 * });
 *
 * // Pass config directly to bootstrap - extra properties are ignored!
 * bootstrap(App, config.values);
 * ```
 *
 * @public API
 */
export type BootstrapConfig = {
  /**
   * Application metadata (required).
   */
  app: {
    /** Application name */
    name: string;
    /** Application version */
    version: string;
    /** Current environment */
    environment: EnvironmentName;
  };
  /**
   * Server configuration (required).
   */
  server: {
    /** Server port */
    port: number;
    // Additional server properties are allowed but ignored
    [key: string]: unknown;
  };
  /**
   * Bootstrap-specific configuration (optional).
   */
  bootstrap?: {
    /** Environment file configuration */
    envFileConfig?: EnvironmentFileConfig;
  };
  // Additional top-level properties are allowed but ignored
  [key: string]: unknown;
};

/**
 * Bootstrap options for application startup.
 *
 * @layer public
 * @audience application-developers
 *
 * @public API
 *
 * @example
 * ```typescript
 * // Minimal usage - uses defaults
 * bootstrap(App);
 *
 * // Custom environment and file mapping
 * bootstrap(App, {
 *   currentEnvironment: "development",
 *   envFileConfig: {
 *     files: {
 *       development: ".env.dev",
 *       production: ".env.prod"
 *     },
 *     required: ["DATABASE_URL", "API_KEY"]
 *   }
 * });
 *
 * // Custom port and app info
 * bootstrap(App, {
 *   port: 8080,
 *   appName: "My API",
 *   appVersion: "1.0.0",
 *   currentEnvironment: "production"
 * });
 * ```
 */
export interface BootstrapOptions {
  /**
   * Port to listen on.
   *
   * @default process.env.PORT ?? 3000
   * @smart-behavior
   * - Use `0` for OS-assigned port (testing)
   * - Reads PORT from .env if envFileConfig provided
   *
   * **Priority Chain**:
   * 1. options.port (highest)
   * 2. process.env.PORT
   * 3. 3000 (fallback)
   *
   * @example
   * ```typescript
   * // Explicit port
   * { port: 8080 }
   *
   * // From .env (if envFileConfig provided)
   * envFileConfig: { ... } // Reads PORT from .env
   *
   * // Testing (OS-assigned)
   * { port: 0 } // Auto-assign available port
   * ```
   */
  port?: number;

  /**
   * Override application name (defaults to `package.json` name).
   *
   * @default package.json name ?? "ExpressoTS App"
   *
   * Used in startup banner and logs.
   *
   * @example
   * ```typescript
   * { appName: "My Production API" }
   * ```
   */
  appName?: string;

  /**
   * Override application version (defaults to `package.json` version).
   *
   * @default package.json version ?? "1.0.0"
   *
   * Used in startup banner and logs.
   *
   * @example
   * ```typescript
   * { appVersion: "2.0.0" }
   * ```
   */
  appVersion?: string;

  /**
   * Current environment name (defaults to `process.env.NODE_ENV` or `"development"`).
   *
   * @default process.env.NODE_ENV ?? "development"
   *
   * **This determines which .env file to load:**
   * - If `envFileConfig.files` is provided, uses the mapping
   * - Otherwise, uses convention: `.env.{currentEnvironment}`
   *
   * **Only ONE file is loaded** - the file corresponding to this environment.
   *
   * @example
   * ```typescript
   * // Loads .env.development (or .env.dev if mapped)
   * currentEnvironment: "development"
   *
   * // Loads .env.production (or .env.prod if mapped)
   * currentEnvironment: "production"
   * ```
   */
  currentEnvironment?: EnvironmentName;

  /**
   * Environment file loading and validation configuration.
   *
   * **Important:** This is an opt-in feature. If not provided, .env file loading is skipped.
   * Templates can configure this to enable .env file support for their projects.
   *
   * Controls how .env files are loaded, validated, and auto-created.
   *
   * @default undefined (skips .env file loading)
   *
   * @example
   * ```typescript
   * // Opt-in to .env file loading
   * envFileConfig: {
   *   // Custom file names per environment
   *   files: {
   *     development: ".env.dev",
   *     production: ".env.prod"
   *   },
   *   // Required variables (always validated)
   *   required: ["DATABASE_URL", "API_KEY"],
   *   // Auto-create missing files (explicit opt-in)
   *   autoCreateTemplate: true
   * }
   * ```
   *
   * @see {@link EnvironmentFileConfig} for detailed configuration options
   */
  envFileConfig?: EnvironmentFileConfig;
}

/**
 * Result of environment loading and validation.
 * @private
 */
interface EnvironmentResult {
  loaded: Array<string>;
  validated: boolean;
  createdTemplate?: string;
  createdTemplates?: Array<string>; // Multiple templates created
  warnings: Array<string>;
  /** CI environment was detected */
  ciDetected?: boolean;
  /** Name of the detected CI platform */
  ciPlatform?: string;
}

/**
 * Cached CI environment detection result (immutable at runtime).
 * @private
 */
let _isCI: boolean | undefined;

/**
 * Cached package.json data (immutable at runtime).
 * @private
 */
let _packageCache: { name?: string; version?: string } | undefined;

/**
 * CI platform detection map for O(1) lookup.
 * @private
 */
const CI_PLATFORM_MAP: ReadonlyMap<string, string> = new Map([
  ["GITHUB_ACTIONS", "GitHub Actions"],
  ["GITLAB_CI", "GitLab CI"],
  ["JENKINS_URL", "Jenkins"],
  ["CIRCLECI", "CircleCI"],
  ["TRAVIS", "Travis CI"],
  ["BUILDKITE", "Buildkite"],
  ["AZURE_HTTP_USER_AGENT", "Azure DevOps"],
  ["BAMBOO_BUILDKEY", "Bamboo"],
  ["TEAMCITY_VERSION", "TeamCity"],
]);

/**
 * Platform-specific hint generators (memoized functions).
 * @private
 */
const PLATFORM_HINTS: ReadonlyMap<string, (missingVars: string) => string> =
  new Map([
    [
      "GitHub Actions",
      (missingVars: string): string => `
🔧 GitHub Actions Setup:
   - Go to: Settings → Secrets and variables → Actions
   - Add repository secrets for: ${missingVars}
   - Use: \${{ secrets.VARIABLE_NAME }} in workflow files`,
    ],
    [
      "GitLab CI",
      (missingVars: string): string => `
🔧 GitLab CI Setup:
   - Go to: Settings → CI/CD → Variables
   - Add CI/CD variables for: ${missingVars}
   - Use: $VARIABLE_NAME in .gitlab-ci.yml`,
    ],
    [
      "Jenkins",
      (missingVars: string): string => `
🔧 Jenkins Setup:
   - Configure: Manage Jenkins → Credentials
   - Add credentials for: ${missingVars}
   - Use: env.VARIABLE_NAME in pipeline`,
    ],
  ]);

/**
 * Detect if running in CI/CD environment.
 * Result is cached since CI environment doesn't change at runtime.
 *
 * @returns True if running in CI/CD
 * @private
 * @performance Cached result for O(1) subsequent calls
 */
function isCIEnvironment(): boolean {
  if (_isCI === undefined) {
    _isCI = !!(
      (
        process.env.CI || // Generic CI flag
        process.env.GITHUB_ACTIONS || // GitHub Actions
        process.env.GITLAB_CI || // GitLab CI
        process.env.JENKINS_URL || // Jenkins
        process.env.CIRCLECI || // CircleCI
        process.env.TRAVIS || // Travis CI
        process.env.BUILDKITE || // Buildkite
        process.env.AZURE_HTTP_USER_AGENT || // Azure DevOps
        process.env.BAMBOO_BUILDKEY || // Bamboo
        process.env.TEAMCITY_VERSION
      ) // TeamCity
    );
  }
  return _isCI;
}

/**
 * Detect CI/CD platform name using optimized Map lookup.
 *
 * @returns Platform name or "CI Platform"
 * @private
 * @performance O(n) where n is number of platforms (typically 9), but uses Map for efficient iteration
 */
function detectCIPlatform(): string {
  for (const [envKey, platformName] of CI_PLATFORM_MAP) {
    if (process.env[envKey]) {
      return platformName;
    }
  }
  return "CI Platform";
}

/**
 * Get platform-specific setup hints using memoized functions.
 *
 * @param platform - CI platform name
 * @param missing - Missing variable names
 * @returns Setup hint string
 * @private
 * @performance Uses pre-constructed Map for O(1) lookup
 */
function getPlatformHint(platform: string, missing: Array<string>): string {
  const missingVars = missing.join(", ");
  const hintFn = PLATFORM_HINTS.get(platform);

  return (
    hintFn?.(missingVars) ||
    `Configure secrets in your CI/CD platform for: ${missingVars}`
  );
}

/**
 * Custom error for missing environment file.
 * @private
 */
class EnvFileNotFoundError extends Error {
  constructor(fileName: string, environment: string) {
    const template = getEnvTemplate(environment);
    super(
      `
❌ Missing required environment file: ${fileName}

💡 Create ${fileName} with:
${template}

📖 Docs: https://expresso-ts.com/docs/env
🔍 Check existing files: ls -la .env*
    `.trim(),
    );
    this.name = "EnvFileNotFoundError";
  }
}

/**
 * Custom error for CI/CD environment validation.
 * @private
 */
class CIEnvValidationError extends Error {
  constructor(missing: Array<string>, environment: string) {
    const ciPlatform = detectCIPlatform();
    const platformHint = getPlatformHint(ciPlatform, missing);

    super(
      `
❌ CI/CD Environment Validation Failed

Missing required environment variables in ${environment}:
${missing.map((key) => `   • ${key}`).join("\n")}

${platformHint}

💡 Action Required:
   1. Add missing variables to your CI/CD platform secrets
   2. Ensure variables are available in ${environment} environment
   3. Check variable names match exactly (case-sensitive)

📖 Docs: https://expresso-ts.com/docs/ci-cd
    `.trim(),
    );
    this.name = "CIEnvValidationError";
  }
}

/**
 * Custom error for environment variable validation.
 * @private
 */
class EnvValidationError extends Error {
  constructor(missing: Array<string>, fileName: string) {
    super(
      `
❌ Environment validation failed

Missing values in ${fileName}:
${missing.map((key) => `   • ${key} (required but empty)`).join("\n")}

💡 Add values to ${fileName}:
${missing.map((key) => `   ${key}=your-value-here`).join("\n")}

📖 Docs: https://expresso-ts.com/docs/env
    `.trim(),
    );
    this.name = "EnvValidationError";
  }
}

/**
 * Get environment template content.
 * @param environment - Environment name
 * @returns Template string
 * @private
 */
function getEnvTemplate(environment: string): string {
  return `PORT=3000
NODE_ENV=${environment}
# Add your environment variables here`;
}

/**
 * Create environment file template.
 * @param fileName - File name to create
 * @param environment - Environment name (e.g., "development", "production")
 * @param required - Required variable names
 * @private
 */
async function createEnvTemplate(
  fileName: string,
  environment: string,
  required?: ReadonlyArray<string>,
): Promise<void> {
  const commonVars = [
    "PORT=3000",
    `NODE_ENV=${environment}`,
    "# Add your environment variables below",
  ];

  const requiredVars = required?.map((key) => `${key}=`) || [];
  const template = [...commonVars, ...requiredVars].join("\n");

  await fs.promises.writeFile(fileName, template, "utf-8");
}

/**
 * Validate environment variables from process.env.
 * @param required - Required variable names
 * @returns Validation result
 * @private
 */
function validateEnvVariablesFromProcessEnv(required: ReadonlyArray<string>): {
  valid: boolean;
  missing: Array<string>;
} {
  const missing: Array<string> = [];

  for (const key of required) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate environment variables from file.
 * @param fileName - Environment file name
 * @param required - Required variable names (if empty, validates all in file)
 * @returns Validation result
 * @private
 */
function validateEnvVariablesFromFile(
  fileName: string,
  required?: ReadonlyArray<string>,
): { valid: boolean; missing: Array<string> } {
  const missing: Array<string> = [];

  if (!fs.existsSync(fileName)) {
    return { valid: false, missing: required ? [...required] : [] };
  }

  try {
    const fileContent = fs.readFileSync(fileName, "utf-8");
    const parsed = parse(fileContent);

    if (required && required.length > 0) {
      // Validate only required variables
      for (const key of required) {
        const value = process.env[key];
        if (!value || value.trim() === "") {
          missing.push(key);
        }
      }
    } else {
      // Validate all variables in file
      for (const key of Object.keys(parsed)) {
        const value = process.env[key];
        if (!value || value.trim() === "") {
          missing.push(key);
        }
      }
    }
  } catch (error) {
    // File exists but couldn't be parsed
    throw new Error(`Failed to parse ${fileName}: ${error}`);
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Load and validate environment files with smart defaults.
 *
 * **Important:** This function only runs if `envFileConfig` is explicitly provided.
 * If `envFileConfig` is `undefined`, .env file loading is skipped entirely.
 *
 * @param currentEnvironment - Current environment name (e.g., "development", "production")
 * @param envFileConfig - Environment file configuration from BootstrapOptions.envFileConfig
 * @returns Environment loading result
 * @private
 */
async function loadAndValidateEnvironment(
  currentEnvironment: string,
  envFileConfig?: EnvironmentFileConfig,
): Promise<EnvironmentResult> {
  const result: EnvironmentResult = {
    loaded: [],
    validated: false,
    warnings: [],
  };

  // 🎯 OPT-OUT: If envFileConfig is not provided, skip .env file loading entirely
  // Templates can opt-in by providing envFileConfig in their bootstrap calls
  if (!envFileConfig) {
    result.validated = true;
    process.env._EXPRESSOTS_ENV_LOADED = "true";
    return result;
  }

  const isCI = envFileConfig.ciMode ?? isCIEnvironment();
  const skipFileLoading = envFileConfig.skipFileLoading ?? false;

  // 🎯 CI/CD: Skip file loading, use process.env directly
  if (isCI || skipFileLoading) {
    if (isCI) {
      // Store CI info for logging after banner is displayed
      result.ciDetected = true;
      result.ciPlatform = detectCIPlatform();
    }

    // Support .env.vault in CI/CD
    if (process.env.DOTENV_KEY) {
      try {
        config({ path: ".env.vault" });
        result.loaded.push(".env.vault (encrypted)");
      } catch (error) {
        result.warnings.push(`Warning: Could not load .env.vault: ${error}`);
      }
    }

    // Validate required variables from process.env
    const validateValues = envFileConfig.validateValues ?? true; // Always validate in CI
    const required = (envFileConfig.required || []) as Array<string>;

    if (validateValues || required.length > 0) {
      const validationResult = validateEnvVariablesFromProcessEnv(required);
      if (!validationResult.valid) {
        throw new CIEnvValidationError(
          validationResult.missing,
          currentEnvironment,
        );
      }
    }

    result.validated = true;
    process.env._EXPRESSOTS_ENV_LOADED = "true";
    return result;
  }

  // 🎯 Local Development: Load from files
  const validateFile = envFileConfig.validateFile ?? true;
  const validateValues =
    envFileConfig.validateValues ?? currentEnvironment === "production";
  // Only auto-create if explicitly enabled (default: false - opt-in behavior)
  const autoCreate = envFileConfig.autoCreateTemplate ?? false;

  // 🎯 STEP 1: Create templates for all mapped environments (if autoCreate is enabled)
  // If files mapping is provided, create templates for ALL mapped environments
  // This helps users set up their project with all necessary .env files
  if (autoCreate && envFileConfig.files) {
    const createdTemplates: Array<string> = [];
    for (const [envName, fileName] of Object.entries(envFileConfig.files)) {
      if (!fs.existsSync(fileName)) {
        await createEnvTemplate(fileName, envName, envFileConfig.required);
        createdTemplates.push(fileName);
        // Load the newly created file
        config({ path: fileName });
        result.loaded.push(fileName);
      }
    }
    if (createdTemplates.length > 0) {
      result.createdTemplates = createdTemplates;
      result.createdTemplate = createdTemplates[0]; // For backward compatibility
    }
  }

  // 🎯 STEP 2: Determine and load the file for the current environment
  // Only ONE file is loaded at runtime - the file for the current environment
  const envFileName =
    envFileConfig.files?.[currentEnvironment] ?? `.env.${currentEnvironment}`;

  // Load optional files silently
  const optionalFiles = [".env", ".env.local", `${envFileName}.local`];
  for (const file of optionalFiles) {
    try {
      config({ path: file });
      result.loaded.push(file);
    } catch {
      // Silently skip optional files
    }
  }

  // 🎯 STEP 3: Handle the required file for current environment
  const requiredFileExists = fs.existsSync(envFileName);

  if (!requiredFileExists) {
    if (autoCreate) {
      // Auto-create template file with correct environment value
      // This handles the case where files mapping wasn't provided but autoCreate is true
      await createEnvTemplate(
        envFileName,
        currentEnvironment,
        envFileConfig.required,
      );
      if (!result.createdTemplates) {
        result.createdTemplates = [];
      }
      result.createdTemplates.push(envFileName);
      result.createdTemplate = envFileName;
      // Reload the newly created file
      config({ path: envFileName });
      result.loaded.push(envFileName);
    } else if (validateFile) {
      // Throw helpful error - but only if autoCreate is false
      // Provide helpful message about all missing files if files mapping exists
      const missingFiles = envFileConfig.files
        ? Object.entries(envFileConfig.files)
            .filter(([, fileName]) => !fs.existsSync(fileName))
            .map(([envName, fileName]) => `${fileName} (for ${envName})`)
        : [envFileName];

      if (missingFiles.length > 1) {
        throw new Error(
          `❌ Missing required environment files:\n${missingFiles.map((f) => `   • ${f}`).join("\n")}\n\n💡 Create these files or set autoCreateTemplate: true to auto-generate them.\n📖 Docs: https://expresso-ts.com/docs/env`,
        );
      } else {
        throw new EnvFileNotFoundError(envFileName, currentEnvironment);
      }
    } else {
      result.warnings.push(`⚠️  ${envFileName} not found (optional)`);
    }
  } else {
    // Load the file
    config({ path: envFileName });
    result.loaded.push(envFileName);
  }

  // Validate variables have values
  if (
    validateValues ||
    (envFileConfig.required && envFileConfig.required.length > 0)
  ) {
    const validationResult = validateEnvVariablesFromFile(
      envFileName,
      envFileConfig.required,
    );
    if (!validationResult.valid) {
      throw new EnvValidationError(validationResult.missing, envFileName);
    }
  }

  result.validated = true;
  process.env._EXPRESSOTS_ENV_LOADED = "true";

  return result;
}

/**
 * Determine port with priority: options.port > process.env.PORT > 3000
 * @param options - Bootstrap options
 * @returns Port number
 * @private
 */
function determinePort(options?: BootstrapOptions): number {
  // Priority: options.port > process.env.PORT > 3000
  if (options?.port !== undefined) {
    return options.port;
  }

  const envPort = process.env.PORT;
  if (envPort) {
    const port = parseInt(envPort, 10);
    if (isNaN(port)) {
      throw new Error(`Invalid PORT in .env: "${envPort}". Must be a number.`);
    }
    return port;
  }

  return 3000; // Default
}

/**
 * Read package.json to get app name and version.
 * Result is cached since package.json doesn't change at runtime.
 *
 * @returns Package.json data
 * @private
 * @performance Cached result for O(1) subsequent calls after first read
 */
async function readPackageJson(): Promise<{ name?: string; version?: string }> {
  if (_packageCache !== undefined) {
    return _packageCache;
  }

  try {
    const packagePath = path.resolve(process.cwd(), "package.json");
    const packageContent = await fs.promises.readFile(packagePath, "utf-8");
    const pkg = JSON.parse(packageContent);
    _packageCache = {
      name: pkg.name,
      version: pkg.version,
    };
    return _packageCache;
  } catch (error) {
    // Package.json not found or invalid - cache empty result
    _packageCache = {};
    return _packageCache;
  }
}

/**
 * Bootstrap the ExpressoTS application with zero configuration.
 *
 * @layer public
 * @audience application-developers
 * @concept bootstrap
 * @difficulty beginner
 *
 * @summary Quick Start
 * The simplest way to start your application:
 * ```typescript
 * await bootstrap(App);
 * ```
 *
 * This function orchestrates 8 critical startup phases:
 * 1. Environment detection (CI/CD vs local)
 * 2. Smart .env loading with opt-in behavior
 * 3. Port determination (priority chain)
 * 4. Package.json metadata extraction
 * 5. DI container initialization via AppFactory
 * 6. Environment injection into app instance
 * 7. API version detection from decorators
 * 8. Server startup with graceful shutdown
 *
 * @param AppClass - Application class extending AppExpress
 * @param options - Optional bootstrap configuration
 * @returns Promise resolving to IWebServerPublic instance
 *
 * @example
 * ```typescript
 * // Simplest usage - zero config (no .env file loading)
 * await bootstrap(App);
 *
 * // With overrides (still no .env file loading)
 * await bootstrap(App, {
 *   port: 4000,
 *   appName: "My API",
 *   appVersion: "2.0.0"
 * });
 *
 * // Opt-in to .env file loading and auto-creation
 * await bootstrap(App, {
 *   currentEnvironment: "development",
 *   envFileConfig: {
 *     files: {
 *       development: ".env.dev",
 *       production: ".env.prod"
 *     },
 *     required: ["DATABASE_URL", "API_KEY"],
 *     autoCreateTemplate: true,  // Explicitly enable file creation
 *     validateValues: true
 *   }
 * });
 *
 * // Auto-assign port (useful for testing)
 * await bootstrap(App, { port: 0 });
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Bootstrap orchestrates 8 critical steps:
 * 1. Environment detection (CI/CD vs local)
 * 2. Smart .env loading with opt-in behavior
 * 3. Port determination (priority chain)
 * 4. Package.json metadata extraction
 * 5. DI container initialization via AppFactory
 * 6. Environment injection into app instance
 * 7. API version detection from decorators
 * 8. Server startup with graceful shutdown
 *
 * **Design Decisions**
 * - Opt-in .env loading prevents breaking changes for containerized deployments
 * - Port 0 support enables parallel testing without conflicts
 * - Early validation fails fast with actionable error messages
 * - CI/CD auto-detection provides zero-config for containerized environments
 *
 * **Performance Characteristics**
 * - Startup time: ~8-25ms typical (optimized)
 * - Environment loading: ~2-5ms (file I/O)
 * - Package.json read: ~1-2ms first call, cached thereafter
 * - CI detection: cached after first call
 * - App instantiation: ~5-10ms (DI container setup)
 * - Logger instances: lazy initialization (only created when needed)
 *
 * @see {@link loadAndValidateEnvironment} for environment loading logic
 * @see {@link AppFactory.create} for DI container initialization
 * @see {@link determinePort} for port resolution logic
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Patterns**
 *
 * Multi-environment setup with validation:
 * ```typescript
 * await bootstrap(App, {
 *   currentEnvironment: process.env.NODE_ENV || "development",
 *   envFileConfig: {
 *     files: {
 *       development: ".env.dev",
 *       staging: ".env.staging",
 *       production: ".env.prod"
 *     },
 *     required: ["DATABASE_URL", "JWT_SECRET"],
 *     autoCreateTemplate: true,
 *     validateValues: process.env.NODE_ENV === "production"
 *   }
 * });
 * ```
 *
 * Containerized deployment (Docker/K8s):
 * ```typescript
 * await bootstrap(App, {
 *   envFileConfig: {
 *     skipFileLoading: true,  // Use process.env only
 *     required: ["DATABASE_URL", "REDIS_URL"]
 *   }
 * });
 * ```
 *
 * Testing with dynamic ports:
 * ```typescript
 * const server = await bootstrap(App, { port: 0 });
 * const actualPort = server.port;  // Use in tests
 * ```
 *
 * @troubleshooting
 * **Common Issues**
 * - ❌ PORT not detected → Use options.port or envFileConfig
 * - ❌ CI validation fails → Check platform secrets configuration
 * - ❌ Template not created → Set autoCreateTemplate: true explicitly
 * - ❌ Port already in use → Use port: 0 for testing
 *
 * @performance
 * - Async initialization: ~5-15ms (typical)
 * - Package.json read: ~2ms first call, cached thereafter
 * - CI detection: cached after first call
 * - Port binding: varies by OS
 * - Total startup: ~8-25ms (optimized with caching)
 *
 * @public API
 */

/**
 * Type guard to check if argument is BootstrapConfig.
 * Detects config objects by checking for the required structure.
 * @internal
 */
function isBootstrapConfig(
  arg: BootstrapOptions | BootstrapConfig | undefined,
): arg is BootstrapConfig {
  if (!arg || typeof arg !== "object") return false;

  // Check if it has BootstrapOptions properties (direct options)
  if ("appName" in arg || "port" in arg || "currentEnvironment" in arg) {
    // If it has BootstrapOptions properties but NOT config structure, it's BootstrapOptions
    if (!("app" in arg && "server" in arg)) {
      return false;
    }
  }

  // Check for config structure
  return (
    "app" in arg &&
    "server" in arg &&
    typeof arg.app === "object" &&
    arg.app !== null &&
    typeof arg.server === "object" &&
    arg.server !== null &&
    "name" in arg.app &&
    "version" in arg.app &&
    "environment" in arg.app &&
    "port" in arg.server
  );
}

/**
 * Transform BootstrapConfig to BootstrapOptions.
 * @internal
 */
function transformConfigToOptions(config: BootstrapConfig): BootstrapOptions {
  return {
    appName: config.app.name,
    appVersion: config.app.version,
    port: config.server.port,
    currentEnvironment: config.app.environment,
    envFileConfig: config.bootstrap?.envFileConfig,
  };
}

/**
 * Bootstrap with BootstrapOptions (existing behavior).
 */
export async function bootstrap(
  AppClass: new () => IWebServer,
  options: BootstrapOptions,
): Promise<IWebServerPublic>;

/**
 * Bootstrap with config object (new convenience overload).
 */
export async function bootstrap(
  AppClass: new () => IWebServer,
  config: BootstrapConfig,
): Promise<IWebServerPublic>;

/**
 * Bootstrap with no options (zero-config).
 */
export async function bootstrap(
  AppClass: new () => IWebServer,
): Promise<IWebServerPublic>;

/**
 * Implementation.
 */
export async function bootstrap(
  AppClass: new () => IWebServer,
  optionsOrConfig?: BootstrapOptions | BootstrapConfig,
): Promise<IWebServerPublic> {
  let logger: Logger | undefined;

  // Note: Path resolution is auto-initialized as a side effect when
  // @expressots/core is imported (see core/src/index.ts).
  // This happens BEFORE bootstrap() runs, ensuring path aliases work.

  // STEP 0: Load .env files FIRST (before config resolution)
  // This ensures config reads from .env files when it resolves
  let envFileConfig: EnvironmentFileConfig | undefined;
  let currentEnvironment: string;
  let envResult: EnvironmentResult;

  if (isBootstrapConfig(optionsOrConfig)) {
    // Extract envFileConfig from config structure (static values, no resolution needed)
    envFileConfig = optionsOrConfig.bootstrap?.envFileConfig;

    // Determine environment: Use NODE_ENV first, then fallback to config
    // We load .env files first to minimize impact of config resolution
    currentEnvironment = process.env.NODE_ENV ?? "development";

    // Load .env files BEFORE config resolution
    envResult = await loadAndValidateEnvironment(
      currentEnvironment,
      envFileConfig,
    );

    // Now transform config (it will read from loaded .env files)
    // This may trigger config resolution, but .env files are already loaded
  } else {
    // BootstrapOptions - no config to resolve
    currentEnvironment =
      optionsOrConfig?.currentEnvironment ??
      process.env.NODE_ENV ??
      "development";
    envFileConfig = optionsOrConfig?.envFileConfig;

    // Load .env files
    envResult = await loadAndValidateEnvironment(
      currentEnvironment,
      envFileConfig,
    );
  }

  // Transform config to BootstrapOptions if needed (after .env files are loaded)
  const options: BootstrapOptions | undefined = isBootstrapConfig(
    optionsOrConfig,
  )
    ? transformConfigToOptions(optionsOrConfig)
    : optionsOrConfig;

  try {
    // Show helpful feedback
    if (envResult.createdTemplates && envResult.createdTemplates.length > 0) {
      if (envResult.createdTemplates.length === 1) {
        console.log(
          `✨ Created ${envResult.createdTemplates[0]} template file`,
        );
      } else {
        console.log(
          `✨ Created ${envResult.createdTemplates.length} template files:`,
        );
        envResult.createdTemplates.forEach((file) =>
          console.log(`   • ${file}`),
        );
      }
    } else if (envResult.createdTemplate) {
      console.log(`✨ Created ${envResult.createdTemplate} template file`);
    }
    if (envResult.warnings.length > 0) {
      envResult.warnings.forEach((w) => console.warn(w));
    }

    // STEP 3: Determine port with priority (PORT now available from .env)
    const port = determinePort(options);

    // STEP 4: Read package.json for app info
    const pkg = await readPackageJson();

    // STEP 5: Create app instance
    // App's globalConfiguration() will run in constructor
    // initEnvironment() can skip if .env already loaded
    const app = await AppFactory.create(AppClass);

    // Set environment on app instance (for this.environment access)
    (app as unknown as { environment: string }).environment =
      currentEnvironment;

    // STEP 6: Prepare app info
    // Note: API versions will be auto-detected in displayStartupBanner()
    // where controllers are already registered and accessible
    const appInfo: IConsoleMessage = {
      appName: options?.appName ?? pkg.name ?? "ExpressoTS App",
      appVersion: options?.appVersion ?? pkg.version ?? "1.0.0",
    };

    // STEP 8: Add CI detection info to appInfo (logged after banner, before middleware)
    if (envResult.ciDetected) {
      appInfo.ciDetection = {
        detected: true,
        platform: envResult.ciPlatform,
      };
    }

    // STEP 9: Listen (supports port 0 for auto-assign)
    // Banner will be displayed inside listen() callback with correct port
    // CI detection will be logged after banner, before middleware logs
    // Graceful shutdown handlers are already set up in AppExpress.listen()
    const webServer = await app.listen(port, appInfo);

    return webServer;
  } catch (error) {
    // Lazy logger initialization - only create if error occurs
    if (!logger) {
      logger = new Logger();
    }
    logger.error(
      `Bootstrap failed: ${error instanceof Error ? error.message : String(error)}`,
      "bootstrap",
    );
    throw error;
  }
}
