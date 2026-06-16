/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response } from "express";
import { ViewDebugger } from "./view-debugger";
import type { IRenderService } from "../render-interface.js";

function createMockRenderService(): jest.Mocked<
  Pick<
    IRenderService,
    | "render"
    | "getRegisteredEngines"
    | "getActiveEngine"
    | "getViewFiles"
    | "getConfig"
    | "getMetrics"
  >
> {
  return {
    render: jest.fn().mockResolvedValue("<p>rendered</p>"),
    getRegisteredEngines: jest.fn().mockReturnValue(["ejs"]),
    getActiveEngine: jest.fn().mockReturnValue({ name: "ejs<script>" }),
    getViewFiles: jest.fn().mockReturnValue([]),
    getConfig: jest.fn().mockReturnValue({}),
    getMetrics: jest.fn().mockReturnValue({}),
  } as any;
}

function createMockResponse(): Response {
  return {
    json: jest.fn(),
    send: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
}

describe("ViewDebugger", () => {
  it("escapes HTML in preview wrapper for view and engine names", async () => {
    const renderService = createMockRenderService();
    const debuggerInstance = new ViewDebugger(
      renderService as unknown as IRenderService,
    );
    const req = {
      params: { view: '<img src=x onerror="alert(1)">' },
      query: {},
    } as unknown as Request;
    const res = createMockResponse();

    await (debuggerInstance as any).handlePreviewEndpoint(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
    const html = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain("&lt;img");
    expect(html).toContain("ejs&lt;script&gt;");
    expect(html).toContain("<p>rendered</p>");
  });

  it("joins Express 5 array view params before rendering", async () => {
    const renderService = createMockRenderService();
    const debuggerInstance = new ViewDebugger(
      renderService as unknown as IRenderService,
    );
    const req = {
      params: { view: ["users", "profile"] },
      query: {},
    } as unknown as Request;
    const res = createMockResponse();

    await (debuggerInstance as any).handlePreviewEndpoint(req, res);

    expect(renderService.render).toHaveBeenCalledWith(
      "users/profile",
      expect.any(Object),
    );
  });

  it("returns JSON error payload when preview rendering fails", async () => {
    const renderService = createMockRenderService();
    renderService.render.mockRejectedValue(new Error("render failed"));
    const debuggerInstance = new ViewDebugger(
      renderService as unknown as IRenderService,
    );
    const req = {
      params: { view: "broken" },
      query: {},
    } as unknown as Request;
    const res = createMockResponse();

    await (debuggerInstance as any).handlePreviewEndpoint(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "render failed",
      view: "broken",
    });
  });

  it("registers debug routes once and serves list, info, and metrics endpoints", () => {
    const renderService = createMockRenderService();
    renderService.getViewFiles.mockReturnValue(["users/profile.ejs"]);
    const debuggerInstance = new ViewDebugger(
      renderService as unknown as IRenderService,
    );
    const handlers: Record<string, (req: Request, res: Response) => void> = {};
    const app = {
      get: jest.fn(
        (route: string, handler: (req: Request, res: Response) => void) => {
          handlers[route] = handler;
        },
      ),
    };

    debuggerInstance.registerRoutes(app as any);
    debuggerInstance.registerRoutes(app as any);

    expect(app.get).toHaveBeenCalledTimes(4);

    const listRes = createMockResponse();
    handlers["/__views"]({ params: {}, query: {} } as Request, listRes);
    expect(listRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        engines: ["ejs"],
        views: ["users/profile.ejs"],
      }),
    );

    const infoRes = createMockResponse();
    handlers["/__views/info/*view"](
      { params: { view: "users/profile" }, query: {} } as unknown as Request,
      infoRes,
    );
    expect(infoRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        view: "users/profile",
        files: ["users/profile.ejs"],
      }),
    );

    const metricsRes = createMockResponse();
    handlers["/__views/metrics"](
      { params: {}, query: {} } as Request,
      metricsRes,
    );
    expect(metricsRes.json).toHaveBeenCalledWith(renderService.getMetrics());
  });

  it("routes preview requests through the registered handler", async () => {
    const renderService = createMockRenderService();
    const debuggerInstance = new ViewDebugger(
      renderService as unknown as IRenderService,
    );
    const handlers: Record<string, (req: Request, res: Response) => void> = {};
    const app = {
      get: jest.fn(
        (route: string, handler: (req: Request, res: Response) => void) => {
          handlers[route] = handler;
        },
      ),
    };

    debuggerInstance.registerRoutes(app as any);

    const res = createMockResponse();
    await handlers["/__views/preview/*view"](
      { params: { view: "dashboard" }, query: {} } as unknown as Request,
      res,
    );

    expect(renderService.render).toHaveBeenCalledWith("dashboard", {});
    expect(res.send).toHaveBeenCalled();
  });

  it("returns JSON errors when list, info, or metrics handlers fail", () => {
    const renderService = createMockRenderService();
    renderService.getRegisteredEngines.mockImplementation(() => {
      throw new Error("list failed");
    });
    renderService.getViewFiles.mockImplementation(() => {
      throw new Error("info failed");
    });
    renderService.getMetrics.mockImplementation(() => {
      throw new Error("metrics failed");
    });

    const debuggerInstance = new ViewDebugger(
      renderService as unknown as IRenderService,
    );
    const handlers: Record<string, (req: Request, res: Response) => void> = {};
    const app = {
      get: jest.fn(
        (route: string, handler: (req: Request, res: Response) => void) => {
          handlers[route] = handler;
        },
      ),
    };

    debuggerInstance.registerRoutes(app as any);

    const listRes = createMockResponse();
    handlers["/__views"]({ params: {}, query: {} } as Request, listRes);
    expect(listRes.status).toHaveBeenCalledWith(500);
    expect(listRes.json).toHaveBeenCalledWith({ error: "list failed" });

    renderService.getRegisteredEngines.mockReturnValue(["ejs"]);
    const infoRes = createMockResponse();
    handlers["/__views/info/*view"](
      { params: { view: "missing" }, query: {} } as unknown as Request,
      infoRes,
    );
    expect(infoRes.status).toHaveBeenCalledWith(500);
    expect(infoRes.json).toHaveBeenCalledWith({ error: "info failed" });

    renderService.getViewFiles.mockReturnValue([]);
    const metricsRes = createMockResponse();
    handlers["/__views/metrics"](
      { params: {}, query: {} } as Request,
      metricsRes,
    );
    expect(metricsRes.status).toHaveBeenCalledWith(500);
    expect(metricsRes.json).toHaveBeenCalledWith({ error: "metrics failed" });
  });

  it("escapes all HTML entities in preview wrapper output", async () => {
    const renderService = createMockRenderService();
    renderService.getActiveEngine.mockReturnValue({ name: `a&b<>"'` } as any);
    const debuggerInstance = new ViewDebugger(
      renderService as unknown as IRenderService,
    );
    const req = {
      params: { view: `v&<>"'` },
      query: {},
    } as unknown as Request;
    const res = createMockResponse();

    await (debuggerInstance as any).handlePreviewEndpoint(req, res);

    const html = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(html).toContain("v&amp;&lt;&gt;&quot;&#39;");
    expect(html).toContain("a&amp;b&lt;&gt;&quot;&#39;");
  });
});
