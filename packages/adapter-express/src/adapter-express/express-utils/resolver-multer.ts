/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from "@expressots/core";

/**
 * Resolve package from the current working directory.
 * @param packageName
 * @param options
 * @returns
 */
export function packageResolver(packageName: string): any {
  const logger: Logger = new Logger();

  try {
    const hasPackage = require.resolve(packageName, {
      paths: [process.cwd()],
    });

    if (hasPackage) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageResolved = require(hasPackage);

      if (typeof packageResolved === "function") {
        return packageResolved;
      }

      if (packageResolved.default && typeof packageResolved.default === "function") {
        return packageResolved.default;
      }
      return packageResolved;
    }
  } catch (error) {
    logger.warn(
      `Package [${packageName}] not installed. Please install it using your package manager.`,
      "package-resolver",
    );
  }
}
