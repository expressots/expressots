import express from "express";
import { AppExpress } from "../application-express";

jest.mock("../studio/index.js", () => ({
  initializeStudio: jest.fn().mockResolvedValue(false),
}));

const expressServer = {
  setConfig: jest.fn(),
  setErrorConfig: jest.fn(),
  setContentNegotiationService: jest.fn(),
  setValidationService: jest.fn(),
  build: jest.fn(),
};

jest.mock("../express-utils/inversify-express-server", () => ({
  InversifyExpressServer: jest.fn().mockImplementation(() => expressServer),
}));

class MockMiddleware {
  setExpressApp = jest.fn();
  getMiddlewarePipeline = jest.fn().mockReturnValue([]);
  getErrorHandler = jest.fn().mockReturnValue(null);
  getContentNegotiationService = jest.fn().mockReturnValue({ isEnabled: () => true });
  getValidationConfig = jest.fn().mockReturnValue({
    smartDetection: false,
    autoDetection: false,
    adapters: [],
  });
}

describe("AppExpress.init() bootstrap wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    expressServer.build.mockReturnValue(express());
  });

  it("registers validation and content negotiation on the express server", async () => {
    const appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { appContainer: { Container: object } }).appContainer = {
      Container: {},
    };
    (appExpress as unknown as { middlewareManager: MockMiddleware }).middlewareManager =
      new MockMiddleware();

    await (appExpress as unknown as { init: () => Promise<AppExpress> }).init();

    expect(expressServer.setContentNegotiationService).toHaveBeenCalled();
    expect(expressServer.setValidationService).toHaveBeenCalled();
    expect(expressServer.build).toHaveBeenCalled();
  });
});
