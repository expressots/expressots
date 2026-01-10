/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "path";
import * as fs from "fs";
import { Readable, Writable } from "stream";
import type { Application } from "express";
import express from "express";
import { BaseEngineAdapter } from "./base-adapter";
import type { ReactConfig, SSRConfig } from "../render-config";

/**
 * Default React configuration.
 */
const REACT_DEFAULTS: ReactConfig = {
  viewsDir: path.join(process.cwd(), "views"),
  clientBundleDir: path.join(process.cwd(), "public", "assets"),
  streaming: true,
  ssr: {
    hydrate: true,
    streaming: true,
    preload: false,
  },
};

/**
 * React Engine Adapter
 *
 * @description Adapter for React Server-Side Rendering (SSR).
 * Provides server rendering with client-side hydration support.
 *
 * @example
 * ```typescript
 * this.Middleware.render({
 *   engine: 'react',
 *   viewsDir: 'src/views',
 *   reactOptions: {
 *     ssr: { hydrate: true, streaming: true },
 *     clientBundleDir: 'public/assets'
 *   }
 * });
 * ```
 *
 * @public API
 */
export class ReactAdapter extends BaseEngineAdapter {
  readonly name = "react";
  readonly extensions = [".tsx", ".jsx"];
  readonly packageName = "react-dom";
  readonly supportsStreaming = true;
  readonly supportsSSR = true;

  private react: any = null;
  private reactDom: any = null;
  private reactDomServer: any = null;
  private options: ReactConfig = REACT_DEFAULTS;
  private app: Application | null = null;
  private componentCache = new Map<string, any>();

  /**
   * Initialize and configure the React engine.
   *
   * @param app - Express application instance
   * @param options - React configuration options
   */
  async setup(app: Application, options: ReactConfig = {}): Promise<void> {
    // Merge with defaults
    this.options = {
      ...REACT_DEFAULTS,
      ...options,
      ssr: {
        ...REACT_DEFAULTS.ssr,
        ...options.ssr,
      },
    };

    this.app = app;

    // Resolve React packages
    try {
      this.react = this.resolvePackage("react");
      this.reactDom = this.resolvePackage("react-dom");
      this.reactDomServer = this.resolvePackage("react-dom/server");
    } catch (error) {
      this.logger.error(
        "React packages not found. Install: npm install react react-dom",
        "render-engine",
      );
      throw error;
    }

    // Set views directory
    const viewsDir = this.options.viewsDir || REACT_DEFAULTS.viewsDir;
    this.setViewsDir(viewsDir!);

    // Serve client bundles if directory exists
    if (
      this.options.clientBundleDir &&
      fs.existsSync(this.options.clientBundleDir)
    ) {
      app.use("/assets", express.static(this.options.clientBundleDir));
    }

    this.isInitialized = true;
    this.logger.info("React SSR engine initialized", "render-engine");
  }

  /**
   * Render a React component to string.
   *
   * @param view - Component name or path (without extension)
   * @param data - Props to pass to the component
   * @returns Rendered HTML string
   */
  async render(view: string, data: any): Promise<string> {
    if (!this.reactDomServer) {
      throw new Error("React engine not initialized. Call setup() first.");
    }

    try {
      // Load the component
      const Component = await this.loadComponent(view);

      // Create React element
      const element = this.react.createElement(Component, data);

      // Render to string
      const html = this.reactDomServer.renderToString(element);

      // Wrap with hydration script if enabled
      if (this.options.ssr?.hydrate) {
        return this.wrapWithHydration(html, view, data);
      }

      return html;
    } catch (error: any) {
      this.logger.error(
        `Failed to render React component '${view}': ${error.message}`,
        "render-engine",
      );
      throw error;
    }
  }

  /**
   * Render a React component as a stream.
   *
   * @param view - Component name or path
   * @param data - Props to pass to the component
   * @returns Readable stream of HTML
   */
  renderStream(view: string, data: any): NodeJS.ReadableStream {
    if (!this.reactDomServer) {
      throw new Error("React engine not initialized. Call setup() first.");
    }

    // Note: renderToPipeableStream is available in React 18+
    const renderMethod =
      this.reactDomServer.renderToPipeableStream ||
      this.reactDomServer.renderToNodeStream;

    if (!renderMethod) {
      throw new Error(
        "Streaming render not available. Upgrade to React 18 or use render() instead.",
      );
    }

    // Load component synchronously for streaming
    const Component = this.loadComponentSync(view);
    const element = this.react.createElement(Component, data);

    if (this.reactDomServer.renderToPipeableStream) {
      // React 18+ with Suspense support
      const readable = new Readable({ read(): void {} });

      const { pipe } = this.reactDomServer.renderToPipeableStream(element, {
        onShellReady(): void {
          // Start streaming when shell is ready
        },
        onAllReady(): void {
          readable.push(null);
        },
        onError(error: Error): void {
          readable.destroy(error);
        },
      });

      // Create a writable that pushes to readable
      const writable = new Writable({
        write(chunk: Buffer, _encoding: string, callback: () => void): void {
          readable.push(chunk);
          callback();
        },
      });

      pipe(writable);
      return readable;
    } else {
      // React 17 and below
      return this.reactDomServer.renderToNodeStream(element);
    }
  }

  /**
   * Load a React component asynchronously.
   *
   * @param view - Component name or path
   * @returns React component
   */
  private async loadComponent(view: string): Promise<any> {
    const componentPath = this.resolveComponentPath(view);

    // Check cache in production
    if (
      process.env.NODE_ENV === "production" &&
      this.componentCache.has(componentPath)
    ) {
      return this.componentCache.get(componentPath);
    }

    // Clear require cache in development for hot reload
    if (process.env.NODE_ENV !== "production") {
      delete require.cache[require.resolve(componentPath)];
    }

    try {
      // Dynamic import for ESM support
      const module = await import(componentPath);
      const Component = module.default || module;

      // Cache in production
      if (process.env.NODE_ENV === "production") {
        this.componentCache.set(componentPath, Component);
      }

      return Component;
    } catch (error: any) {
      // Try require for CJS
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const module = require(componentPath);
        const Component = module.default || module;

        if (process.env.NODE_ENV === "production") {
          this.componentCache.set(componentPath, Component);
        }

        return Component;
      } catch {
        throw new Error(
          `Failed to load React component '${view}': ${error.message}`,
        );
      }
    }
  }

  /**
   * Load a React component synchronously.
   *
   * @param view - Component name or path
   * @returns React component
   */
  private loadComponentSync(view: string): any {
    const componentPath = this.resolveComponentPath(view);

    if (this.componentCache.has(componentPath)) {
      return this.componentCache.get(componentPath);
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(componentPath);
    const Component = module.default || module;

    if (process.env.NODE_ENV === "production") {
      this.componentCache.set(componentPath, Component);
    }

    return Component;
  }

  /**
   * Resolve the full path to a React component.
   *
   * @param view - Component name or path
   * @returns Full path to the component file
   */
  private resolveComponentPath(view: string): string {
    const viewsDir = this.getViewsDir();
    const dir = Array.isArray(viewsDir) ? viewsDir[0] : viewsDir;

    // Try .tsx first, then .jsx
    for (const ext of [".tsx", ".jsx", ".ts", ".js"]) {
      const viewWithExt = view.endsWith(ext) ? view : `${view}${ext}`;
      const fullPath = path.join(dir, viewWithExt);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Also try without pages/ prefix
    for (const ext of [".tsx", ".jsx", ".ts", ".js"]) {
      const fullPath = path.join(dir, "pages", `${view}${ext}`);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Return .tsx path if not found (for error handling)
    return path.join(dir, `${view}.tsx`);
  }

  /**
   * Wrap rendered HTML with hydration script.
   *
   * @param html - Rendered HTML
   * @param view - Component name
   * @param data - Props data
   * @returns Complete HTML document with hydration
   */
  private wrapWithHydration(
    html: string,
    view: string,
    data: any,
  ): string {
    // Escape data for safe embedding in script tag
    const safeData = JSON.stringify(data)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>
    window.__INITIAL_DATA__ = ${safeData};
    window.__COMPONENT__ = "${view}";
  </script>
</head>
<body>
  <div id="root">${html}</div>
  <script src="/assets/client.js" defer></script>
</body>
</html>`;
  }

  /**
   * Handle hot reload.
   */
  onHotReload(): void {
    super.onHotReload();
    this.componentCache.clear();
    this.logger.info("React components cache cleared", "render-engine");
  }

  /**
   * Get SSR configuration.
   *
   * @returns SSR configuration
   */
  getSSRConfig(): SSRConfig | undefined {
    return this.options.ssr;
  }
}
