import * as fs from "fs";
import * as path from "path";
import type { ViewInfo, EngineType } from "../render-config";
import type { EngineRegistry } from "../render-registry";

/**
 * View Scanner
 *
 * @description Scans directories for view files and provides information about them.
 *
 * @public API
 */
export class ViewScanner {
  private registry: EngineRegistry | null = null;

  /**
   * Set the engine registry for extension mapping.
   *
   * @param registry - Engine registry instance
   */
  setRegistry(registry: EngineRegistry): void {
    this.registry = registry;
  }

  /**
   * Scan a directory for view files.
   *
   * @param viewsDir - Directory to scan
   * @param recursive - Whether to scan subdirectories
   * @returns Array of view file paths
   */
  async scanDirectory(
    viewsDir: string,
    recursive: boolean = true,
  ): Promise<Array<string>> {
    const views: Array<string> = [];

    if (!fs.existsSync(viewsDir)) {
      return views;
    }

    const files = await fs.promises.readdir(viewsDir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(viewsDir, file.name);

      if (file.isDirectory() && recursive) {
        const subViews = await this.scanDirectory(fullPath, true);
        views.push(...subViews);
      } else if (file.isFile()) {
        const ext = path.extname(file.name);
        if (this.isViewFile(ext)) {
          views.push(fullPath);
        }
      }
    }

    return views;
  }

  /**
   * Scan multiple directories for view files.
   *
   * @param viewsDirs - Directories to scan
   * @param recursive - Whether to scan subdirectories
   * @returns Array of view file paths
   */
  async scanDirectories(
    viewsDirs: Array<string>,
    recursive: boolean = true,
  ): Promise<Array<string>> {
    const allViews: Array<string> = [];

    for (const dir of viewsDirs) {
      const views = await this.scanDirectory(dir, recursive);
      allViews.push(...views);
    }

    return allViews;
  }

  /**
   * Get detailed information about view files.
   *
   * @param viewsDir - Directory to scan
   * @returns Array of view information
   */
  async getViewInfo(viewsDir: string): Promise<Array<ViewInfo>> {
    const files = await this.scanDirectory(viewsDir);
    const viewInfos: Array<ViewInfo> = [];

    for (const filePath of files) {
      const ext = path.extname(filePath);
      const relativePath = path.relative(viewsDir, filePath);
      const name = relativePath.replace(ext, "").replace(/\\/g, "/");

      viewInfos.push({
        name,
        path: filePath,
        extension: ext,
        engine: this.mapExtensionToEngine(ext),
      });
    }

    return viewInfos;
  }

  /**
   * Check if a file extension is a view file.
   *
   * @param extension - File extension
   * @returns Whether it's a view file
   */
  private isViewFile(extension: string): boolean {
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
    return viewExtensions.includes(extension.toLowerCase());
  }

  /**
   * Map a file extension to an engine type.
   *
   * @param extension - File extension
   * @returns Engine type
   */
  private mapExtensionToEngine(extension: string): EngineType {
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
   * Check if any view files exist in common directories.
   *
   * @returns Object mapping directory names to whether they contain views
   */
  async findViewDirectories(): Promise<Record<string, boolean>> {
    const commonDirs = [
      "views",
      "src/views",
      "templates",
      "src/templates",
      "app/views",
    ];

    const result: Record<string, boolean> = {};

    for (const dir of commonDirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        const views = await this.scanDirectory(fullPath, false);
        result[dir] = views.length > 0;
      } else {
        result[dir] = false;
      }
    }

    return result;
  }

  /**
   * Get extensions found in a directory.
   *
   * @param viewsDir - Directory to scan
   * @returns Array of unique extensions
   */
  async getExtensions(viewsDir: string): Promise<Array<string>> {
    const files = await this.scanDirectory(viewsDir);
    const extensions = new Set<string>();

    for (const file of files) {
      extensions.add(path.extname(file).toLowerCase());
    }

    return Array.from(extensions);
  }
}

/** Singleton instance */
let scannerInstance: ViewScanner | null = null;

/**
 * Get the view scanner singleton.
 *
 * @returns View scanner instance
 */
export function getViewScanner(): ViewScanner {
  if (!scannerInstance) {
    scannerInstance = new ViewScanner();
  }
  return scannerInstance;
}
