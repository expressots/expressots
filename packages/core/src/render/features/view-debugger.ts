/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Application, Request, Response } from "express";
import type { IRenderService } from "../render-interface.js";
import { Logger } from "../../provider/logger/logger.provider.js";

/**
 * View Debugger
 *
 * @description Provides debug endpoints for inspecting the render system.
 * Only available in development mode.
 *
 * @public API
 */
export class ViewDebugger {
  private renderService: IRenderService;
  private logger: Logger;
  private isRegistered: boolean = false;

  constructor(renderService: IRenderService) {
    this.renderService = renderService;
    this.logger = new Logger();
  }

  /**
   * Register debug routes on the Express app.
   *
   * @param app - Express application
   */
  registerRoutes(app: Application): void {
    if (this.isRegistered) {
      return;
    }

    // Main debug endpoint
    app.get("/__views", (req: Request, res: Response) => {
      this.handleViewsEndpoint(req, res);
    });

    // Preview a view. The view name can contain slashes (e.g.
    // `users/profile`), so we use a named splat (`*view`) — the
    // path-to-regexp v6 form `:view(*)` shipped by Express 4 is not
    // valid in path-to-regexp v8 (Express 5) and now throws
    // `Missing parameter name`. Path-to-regexp v8 captures the splat
    // segments as `req.params.view: string[]`; the helpers below
    // normalise that to a slash-joined string for backward compat.
    app.get("/__views/preview/*view", (req: Request, res: Response) => {
      this.handlePreviewEndpoint(req, res);
    });

    // Get view info — same shape as preview.
    app.get("/__views/info/*view", (req: Request, res: Response) => {
      this.handleInfoEndpoint(req, res);
    });

    // Get metrics
    app.get("/__views/metrics", (req: Request, res: Response) => {
      this.handleMetricsEndpoint(req, res);
    });

    this.isRegistered = true;
    this.logger.info("View debugger enabled at /__views", "view-debugger");
  }

  /**
   * Handle the main views endpoint.
   */
  private handleViewsEndpoint(req: Request, res: Response): void {
    try {
      const data = {
        engines: this.renderService.getRegisteredEngines(),
        activeEngine: this.renderService.getActiveEngine().name,
        views: this.renderService.getViewFiles(),
        config: this.renderService.getConfig(),
        metrics: this.renderService.getMetrics(),
        endpoints: {
          list: "GET /__views",
          preview: "GET /__views/preview/:view",
          info: "GET /__views/info/:view",
          metrics: "GET /__views/metrics",
        },
      };

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle the view preview endpoint.
   */
  private async handlePreviewEndpoint(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const view = this.resolveViewParam(req.params.view);
      const data = req.query.data ? JSON.parse(req.query.data as string) : {};

      const html = await this.renderService.render(view, data);

      res.setHeader("Content-Type", "text/html");
      res.send(this.wrapPreview(view, html));
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
        view: this.resolveViewParam(req.params.view),
      });
    }
  }

  /**
   * Normalise the `view` route param across Express 4 and 5.
   *
   * Express 4 / path-to-regexp v6 captured `/__views/preview/:view(*)`
   * as a single string. Express 5 / path-to-regexp v8 changed the
   * named-splat capture to `string[]` (one entry per slash-separated
   * segment). The view engine needs the slash-joined form, so we always
   * collapse the array shape back to that.
   */
  private resolveViewParam(value: unknown): string {
    if (Array.isArray(value)) return value.join("/");
    return typeof value === "string" ? value : "";
  }

  /**
   * Handle the view info endpoint.
   */
  private handleInfoEndpoint(req: Request, res: Response): void {
    try {
      const view = this.resolveViewParam(req.params.view);
      const viewFiles = this.renderService.getViewFiles();

      // Find matching view
      const matchingFiles = viewFiles.filter((file) => file.includes(view));

      res.json({
        view,
        files: matchingFiles,
        engine: this.renderService.getActiveEngine().name,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle the metrics endpoint.
   */
  private handleMetricsEndpoint(req: Request, res: Response): void {
    try {
      res.json(this.renderService.getMetrics());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Wrap preview HTML with debug info.
   */
  private wrapPreview(view: string, html: string): string {
    const safeView = this.escapeHtml(view);
    const safeEngine = this.escapeHtml(
      this.renderService.getActiveEngine().name,
    );

    return `<!DOCTYPE html>
<html>
<head>
  <title>View Preview: ${safeView}</title>
  <style>
    .debug-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1a1a2e;
      color: #eee;
      padding: 8px 16px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .debug-bar strong {
      color: #00d9ff;
    }
    .debug-bar a {
      color: #ff6b6b;
      text-decoration: none;
    }
    .debug-bar a:hover {
      text-decoration: underline;
    }
    .content-wrapper {
      padding-top: 50px;
    }
  </style>
</head>
<body>
  <div class="debug-bar">
    <span>📁 <strong>${safeView}</strong></span>
    <span>|</span>
    <span>Engine: <strong>${safeEngine}</strong></span>
    <span>|</span>
    <a href="/__views">← Back to Views</a>
  </div>
  <div class="content-wrapper">
    ${html}
  </div>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
