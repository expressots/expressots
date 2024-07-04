import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BaseController } from "../base-controller";

describe("BaseController", () => {
  let mockResponse;

  beforeEach(() => {
    mockResponse = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      render: vi.fn(),
      renderAsync: vi.fn((template, options, callback) =>
        callback(null, "Rendered Content"),
      ),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("callUseCaseAsync sends correct response", async () => {
    class TestController extends BaseController {}
    const controller = new TestController();

    const useCasePromise = Promise.resolve({ data: "test" });
    await controller["callUseCaseAsync"](useCasePromise, mockResponse, 200);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(await useCasePromise);
  });

  it("callUseCase sends correct response", () => {
    class TestController extends BaseController {}
    const controller = new TestController();

    const useCaseData = { data: "sync test" };
    controller["callUseCase"](useCaseData, mockResponse, 200);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(useCaseData);
  });

  it("callUseRender renders the correct template with options", () => {
    class TestController extends BaseController {}
    const controller = new TestController();

    (controller as any).callUseRender(mockResponse, "templateName", {
      key: "value",
    });

    expect(mockResponse.render).toHaveBeenCalledWith("templateName", {
      key: "value",
    });
  });

  it("callUseRenderAsync resolves with rendered content", async () => {
    class TestController extends BaseController {}
    const controller = new TestController();

    mockResponse.render = vi.fn((template, options, callback) => {
      callback(null, "Rendered Content");
    });

    const result = await (controller as any).callUseRenderAsync(
      mockResponse as Response,
      "templateName",
      { key: "value" },
    );

    expect(result).toBe("Rendered Content");
  });

  it("callUseRenderAsync rejects with an error", async () => {
    class TestController extends BaseController {}
    const controller = new TestController();

    const error = new Error("Render Error");
    mockResponse.render = vi.fn((template, options, callback) => {
      callback(error);
    });

    await expect(
      (controller as any).callUseRenderAsync(
        mockResponse as Response,
        "templateName",
        { key: "value" },
      ),
    ).rejects.toThrow("Render Error");
  });
});
