import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BaseController } from "../base-controller";

describe("BaseController", () => {
  let mockResponse;

  beforeEach(() => {
    mockResponse = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
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

  it("callUseCaseAsync handles errors correctly", async () => {
    class TestController extends BaseController {}
    const controller = new TestController();

    const error = new Error("Test error");
    const useCasePromise = Promise.reject(error);
    await controller["callUseCaseAsync"](useCasePromise, mockResponse, 200);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: "An unexpected error occurred.",
      error: error.message,
    });
  });
});
