/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as path from "path";
import { Logger } from "../../provider/logger/logger.provider";
import type { EngineType } from "../render-config";

/**
 * Auto Detection
 *
 * @description Automatically detects the best template engine based on
 * installed packages and existing view files.
 *
 * @public API
 */
export class AutoDetection {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Detect the best engine to use.
   *
   * @returns Detected engine type
   */
  async detectEngine(): Promise<EngineType> {
    // 1. Check package.json dependencies
    const installedEngines = await this.getInstalledEngines();

    // 2. Priority: react > vue > svelte > ejs > pug > hbs
    const priority: Array<EngineType> = [
      "react",
      "vue",
      "svelte",
      "ejs",
      "pug",
      "hbs",
    ];

    for (const engine of priority) {
      if (installedEngines.includes(engine)) {
        this.logger.info(
          `Detected engine '${engine}' from installed packages`,
          "auto-detection",
        );
        return engine;
      }
    }

    // 3. Check for view files
    const viewExtensions = await this.scanViewFiles();
    if (viewExtensions.length > 0) {
      const engine = this.mapExtensionToEngine(viewExtensions[0]);
      this.logger.info(
        `Detected engine '${engine}' from view files`,
        "auto-detection",
      );
      return engine;
    }

    // Default to EJS
    this.logger.info(
      "No engine detected, defaulting to 'ejs'",
      "auto-detection",
    );
    return "ejs";
  }

  /**
   * Get list of installed template engine packages.
   *
   * @returns Array of installed engine types
   */
  async getInstalledEngines(): Promise<Array<EngineType>> {
    const engines: Array<EngineType> = [];

    try {
      const packageJson = await this.readPackageJson();
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for each engine
      if (deps["ejs"]) engines.push("ejs");
      if (deps["pug"]) engines.push("pug");
      if (deps["hbs"] || deps["handlebars"]) engines.push("hbs");
      if (deps["react"] && deps["react-dom"]) engines.push("react");
      if (deps["vue"]) engines.push("vue");
      if (deps["svelte"]) engines.push("svelte");
    } catch {
      // If package.json can't be read, return empty
    }

    return engines;
  }

  /**
   * Scan common view directories for template files.
   *
   * @returns Array of found file extensions
   */
  async scanViewFiles(): Promise<Array<string>> {
    const viewDirs = [
      "views",
      "src/views",
      "templates",
      "src/templates",
      "app/views",
    ];
    const extensions: Array<string> = [];

    for (const dir of viewDirs) {
      const fullPath = path.join(process.cwd(), dir);

      if (fs.existsSync(fullPath)) {
        try {
          const files = await fs.promises.readdir(fullPath);
          files.forEach((file) => {
            const ext = path.extname(file).toLowerCase();
            if (this.isViewExtension(ext) && !extensions.includes(ext)) {
              extensions.push(ext);
            }
          });
        } catch {
          // Skip if directory can't be read
        }
      }
    }

    return extensions;
  }

  /**
   * Read and parse package.json.
   *
   * @returns Parsed package.json content
   */
  private async readPackageJson(): Promise<any> {
    const packagePath = path.join(process.cwd(), "package.json");

    if (!fs.existsSync(packagePath)) {
      return {};
    }

    const content = await fs.promises.readFile(packagePath, "utf-8");
    return JSON.parse(content);
  }

  /**
   * Check if an extension is a view file extension.
   *
   * @param extension - File extension
   * @returns Whether it's a view extension
   */
  private isViewExtension(extension: string): boolean {
    const viewExtensions = [
      ".ejs",
      ".pug",
      ".jade",
      ".hbs",
      ".handlebars",
      ".tsx",
      ".jsx",
      ".vue",
      ".svelte",
    ];
    return viewExtensions.includes(extension);
  }

  /**
   * Map a file extension to an engine type.
   *
   * @param extension - File extension
   * @returns Engine type
   */
  mapExtensionToEngine(extension: string): EngineType {
    const extensionMap: Record<string, EngineType> = {
      ".ejs": "ejs",
      ".pug": "pug",
      ".jade": "pug",
      ".hbs": "hbs",
      ".handlebars": "hbs",
      ".tsx": "react",
      ".jsx": "react",
      ".vue": "vue",
      ".svelte": "svelte",
    };

    return extensionMap[extension.toLowerCase()] || "ejs";
  }

  /**
   * Check if a specific engine is available.
   *
   * @param engine - Engine type to check
   * @returns Whether the engine is available
   */
  isEngineAvailable(engine: EngineType): boolean {
    try {
      const packageMap: Record<EngineType, string | Array<string>> = {
        ejs: "ejs",
        pug: "pug",
        hbs: "hbs",
        react: ["react", "react-dom"],
        vue: "vue",
        svelte: "svelte",
      };

      const packages = packageMap[engine];
      const packagesToCheck = Array.isArray(packages) ? packages : [packages];

      return packagesToCheck.every((pkg) => {
        try {
          require.resolve(pkg, { paths: [process.cwd()] });
          return true;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }
}
