/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from "../logger/logger.provider";

/**
 * Resolve package from the current working directory.
 * @param packageName
 * @param options
 * @returns
 */
export async function packageResolver(
  packageName: string,
  ...options: Array<any>
): Promise<any> {
  const logger: Logger = new Logger();

  try {
    const hasPackage = require.resolve(packageName, {
      paths: [process.cwd()],
    });

    if (hasPackage) {
      const packageResolved = await import(hasPackage);

      if (typeof packageResolved === "function") {
        return packageResolved(...options);
      }

      if (
        packageResolved.default &&
        typeof packageResolved.default === "function"
      ) {
        return packageResolved.default(...options);
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
