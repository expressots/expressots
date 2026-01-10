/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Response } from "express";
import type { EngineAdapter } from "../render-interface";
import { Logger } from "../../provider/logger/logger.provider";

/**
 * Streaming Renderer
 *
 * @description Handles streaming render for engines that support it.
 * Falls back to regular rendering for engines that don't.
 *
 * @public API
 */
export class StreamingRenderer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Render with streaming support.
   *
   * @param view - View name or path
   * @param data - Data to pass to the template
   * @param res - Express response object
   * @param adapter - Engine adapter to use
   */
  async renderWithStreaming(
    view: string,
    data: any,
    res: Response,
    adapter: EngineAdapter,
  ): Promise<void> {
    if (!adapter.supportsStreaming || !adapter.renderStream) {
      // Fallback to regular render
      this.logger.info(
        `Engine '${adapter.name}' does not support streaming, using regular render`,
        "streaming",
      );
      const html = await adapter.render(view, data);
      res.send(html);
      return;
    }

    try {
      const stream = adapter.renderStream(view, data);

      // Set streaming headers
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");

      // Handle stream events
      stream.on("error", (error: Error) => {
        this.logger.error(`Streaming error: ${error.message}`, "streaming");
        if (!res.headersSent) {
          res.status(500).send("Render error");
        }
      });

      // Pipe the stream to response
      stream.pipe(res);
    } catch (error: any) {
      this.logger.error(
        `Failed to start streaming: ${error.message}`,
        "streaming",
      );

      // Fallback to regular render
      const html = await adapter.render(view, data);
      res.send(html);
    }
  }

  /**
   * Check if an adapter supports streaming.
   *
   * @param adapter - Engine adapter
   * @returns Whether streaming is supported
   */
  supportsStreaming(adapter: EngineAdapter): boolean {
    return (
      adapter.supportsStreaming && typeof adapter.renderStream === "function"
    );
  }

  /**
   * Create a progressive render stream.
   * Renders critical content first, then streams the rest.
   *
   * @param sections - Object mapping section names to render functions
   * @param res - Express response
   * @param priority - Order of sections to render
   */
  async renderProgressive(
    sections: Record<string, () => Promise<string>>,
    res: Response,
    priority: Array<string>,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    // Start HTML
    res.write("<!DOCTYPE html><html><head></head><body>");

    // Render sections in priority order
    for (const section of priority) {
      if (sections[section]) {
        try {
          const html = await sections[section]();
          res.write(html);
        } catch (error: any) {
          this.logger.error(
            `Error rendering section '${section}': ${error.message}`,
            "streaming",
          );
        }
      }
    }

    // Render remaining sections
    for (const [name, renderFn] of Object.entries(sections)) {
      if (!priority.includes(name)) {
        try {
          const html = await renderFn();
          res.write(html);
        } catch (error: any) {
          this.logger.error(
            `Error rendering section '${name}': ${error.message}`,
            "streaming",
          );
        }
      }
    }

    // End HTML
    res.write("</body></html>");
    res.end();
  }
}
