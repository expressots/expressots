// Unit tests for: @Consumes() 415 enforcement in the route handler

import "reflect-metadata";
import { InversifyExpressServer } from "../inversify-express-server";
import { Consumes } from "../content-negotiation-decorators";
import type { Request, Response, NextFunction } from "express";

class TestController {
  create(): string {
    return "created";
  }
}

// Declare @Consumes("application/json") on TestController.create
(Consumes("application/json") as MethodDecorator)(
  TestController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(TestController.prototype, "create")!,
);

class PlainController {
  read(): string {
    return "ok";
  }
}

interface MockResponse {
  status: jest.Mock;
  type: jest.Mock;
  json: jest.Mock;
}

function mockResponse(): MockResponse {
  const res: MockResponse = {
    status: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

function mockRequest(contentType: string | undefined, matches: boolean): Request {
  return {
    headers: contentType ? { "content-type": contentType } : {},
    is: jest.fn().mockReturnValue(matches ? contentType : false),
    path: "/users",
    method: "POST",
  } as unknown as Request;
}

/**
 * Build a handler through the private handlerFactory without a full server
 * bootstrap. The factory only touches instance state when guards exist, so a
 * bare prototype instance with a stubbed executeRouteHandler is sufficient.
 */
function buildHandler(
  controllerConstructor: NewableFunction,
  key: string,
): {
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  executeRouteHandler: jest.Mock;
} {
  const server = Object.create(InversifyExpressServer.prototype);
  const executeRouteHandler = jest.fn().mockResolvedValue(undefined);
  server.executeRouteHandler = executeRouteHandler;

  const handler = server.handlerFactory("TestController", key, [], controllerConstructor);
  return { handler, executeRouteHandler };
}

describe("@Consumes() enforcement (415 Unsupported Media Type)", () => {
  it("rejects a request whose Content-Type does not match @Consumes", async () => {
    const { handler, executeRouteHandler } = buildHandler(TestController, "create");
    const req = mockRequest("text/plain", false);
    const res = mockResponse();
    const next = jest.fn();

    await handler(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.type).toHaveBeenCalledWith("application/problem+json");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Unsupported Media Type",
        status: 415,
        instance: "/users",
      }),
    );
    expect(executeRouteHandler).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a request whose Content-Type matches @Consumes", async () => {
    const { handler, executeRouteHandler } = buildHandler(TestController, "create");
    const req = mockRequest("application/json", true);
    const res = mockResponse();

    await handler(req, res as unknown as Response, jest.fn());

    expect(res.status).not.toHaveBeenCalledWith(415);
    expect(executeRouteHandler).toHaveBeenCalled();
  });

  it("allows a body-less request (no Content-Type header)", async () => {
    const { handler, executeRouteHandler } = buildHandler(TestController, "create");
    const req = mockRequest(undefined, false);
    const res = mockResponse();

    await handler(req, res as unknown as Response, jest.fn());

    expect(res.status).not.toHaveBeenCalled();
    expect(executeRouteHandler).toHaveBeenCalled();
  });

  it("does not interfere with routes that have no @Consumes metadata", async () => {
    const { handler, executeRouteHandler } = buildHandler(PlainController, "read");
    const req = mockRequest("text/plain", false);
    const res = mockResponse();

    await handler(req, res as unknown as Response, jest.fn());

    expect(res.status).not.toHaveBeenCalled();
    expect(executeRouteHandler).toHaveBeenCalled();
  });
});

// End of unit tests for: @Consumes() 415 enforcement
