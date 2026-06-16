import { Logger } from "@expressots/core";
import { InversifyExpressServer } from "../inversify-express-server";

describe("InversifyExpressServer.resolveSuggestionsConfig()", () => {
  it("merges logger overrides when getConfig is available", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = Object.create(InversifyExpressServer.prototype) as any;
    server._container = {
      isBound: jest.fn().mockReturnValue(true),
      get: jest.fn().mockReturnValue({
        getConfig: () => ({ suggestions: { enabled: false, maxSuggestions: 2 } }),
      }),
    };
    server.resolveLogger = jest.fn().mockReturnValue(server._container.get());

    const config = server.resolveSuggestionsConfig();

    expect(config.enabled).toBe(false);
    expect(config.maxSuggestions).toBe(2);
  });

  it("falls back when logger getConfig throws", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = Object.create(InversifyExpressServer.prototype) as any;
    server._container = {
      isBound: jest.fn().mockReturnValue(true),
      get: jest.fn().mockReturnValue({
        getConfig: () => {
          throw new Error("unsupported");
        },
      }),
    };
    server.resolveLogger = jest.fn().mockReturnValue(server._container.get());

    expect(server.resolveSuggestionsConfig()).toBeDefined();
  });
});
