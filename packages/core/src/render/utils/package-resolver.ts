/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from "../../provider/logger/logger.provider";

/**
 * Package Resolver
 *
 * @description Enhanced package resolution with helpful error messages.
 * Resolves packages from the user's project directory.
 *
 * @public API
 */
export class PackageResolver {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Resolve and require a package from the user's project.
   *
   * @param packageName - Package name to resolve
   * @param options - Options to pass if package exports a function
   * @returns The resolved package module
   * @throws Error if package is not installed
   */
  resolve(packageName: string, ...options: Array<any>): any {
    try {
      const packagePath = require.resolve(packageName, {
        paths: [process.cwd()],
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageModule = require(packagePath);

      if (typeof packageModule === "function") {
        return packageModule(...options);
      }

      if (
        packageModule.default &&
        typeof packageModule.default === "function"
      ) {
        return packageModule.default(...options);
      }

      return packageModule;
    } catch (error) {
      this.logger.warn(
        `Package [${packageName}] not installed. Install it with: npm install ${packageName}`,
        "package-resolver",
      );
      throw new PackageNotInstalledError(packageName);
    }
  }

  /**
   * Check if a package is installed without throwing.
   *
   * @param packageName - Package name to check
   * @returns Whether the package is installed
   */
  isInstalled(packageName: string): boolean {
    try {
      require.resolve(packageName, { paths: [process.cwd()] });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the installed version of a package.
   *
   * @param packageName - Package name
   * @returns Version string or null if not installed
   */
  getVersion(packageName: string): string | null {
    try {
      const packagePath = require.resolve(`${packageName}/package.json`, {
        paths: [process.cwd()],
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require(packagePath);
      return pkg.version || null;
    } catch {
      return null;
    }
  }

  /**
   * Check multiple packages and return which ones are installed.
   *
   * @param packageNames - Package names to check
   * @returns Object mapping package names to installation status
   */
  checkMultiple(packageNames: Array<string>): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const pkg of packageNames) {
      result[pkg] = this.isInstalled(pkg);
    }
    return result;
  }
}

/**
 * Error thrown when a required package is not installed.
 * @public API
 */
export class PackageNotInstalledError extends Error {
  /** Package name that is not installed */
  public readonly packageName: string;

  constructor(packageName: string) {
    super(
      `Package '${packageName}' is not installed. Run: npm install ${packageName}`,
    );
    this.name = "PackageNotInstalledError";
    this.packageName = packageName;
  }
}

/** Singleton instance */
let resolverInstance: PackageResolver | null = null;

/**
 * Get the package resolver singleton.
 *
 * @returns Package resolver instance
 */
export function getPackageResolver(): PackageResolver {
  if (!resolverInstance) {
    resolverInstance = new PackageResolver();
  }
  return resolverInstance;
}
