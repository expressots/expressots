import "reflect-metadata";
import type { NextFunction, Request, Response } from "express";
import { NotFoundError, ZodValidatorAdapter } from "@expressots/core";
import { InversifyExpressServer } from "../inversify-express-server";
import { setHttpContext } from "../http-context-store";
import { ValidationService } from "../validation-service";
import { validatedBody } from "../validation-decorators";

jest.mock("@expressots/core", () => {
  const actual = jest.requireActual("@expressots/core");
  return {
    ...actual,
    ContextManager: { getCurrentContext: jest.fn().mockReturnValue(undefined) },
    findFlowTracker: jest.fn().mockReturnValue(undefined),
  };
});

jest.mock("../decorators", () => {
  const actual = jest.requireActual("../decorators");
  return {
    ...actual,
    getRenderMetadata: jest.fn().mockReturnValue({ template: undefined, defaultData: undefined }),
  };
});

jest.mock("../utils", () => {
  const actual = jest.requireActual("../utils");
  return {
    ...actual,
    instanceOfIHttpActionResult: jest.fn().mockReturnValue(false),
    getContentNegotiationMetadata: jest
      .fn()
      .mockReturnValue({ accept: undefined, produces: undefined }),
  };
});

function fakeSchema(predicate: (value: unknown) => boolean) {
  return {
    safeParseAsync: async (data: unknown) =>
      predicate(data)
        ? { success: true as const, data }
        : { success: false as const, error: { issues: [{ message: "invalid" }] } },
  };
}

function buildExecuteServer(): any {
  const server = Object.create(InversifyExpressServer.prototype);

  (server as unknown as { extractParameters: jest.Mock }).extractParameters = jest
    .fn()
    .mockReturnValue([]);

  return server;
}

function attachHttpContext(req: Request, controller: unknown, controllerName: string): void {
  const childContainer = {
    bind: jest.fn().mockReturnThis(),
    toConstantValue: jest.fn().mockReturnThis(),
    getNamed: jest.fn().mockImplementation((_type, name) => {
      if (name === controllerName) return controller;
      return controller;
    }),
  };

  setHttpContext(req, {
    container: childContainer as never,
    request: req,
    response: {} as Response,
    user: {
      details: null,
      isAuthenticated: async () => false,
      isInRole: async () => false,
      isResourceOwner: async () => false,
    },
  });
}

describe("InversifyExpressServer.executeRouteHandler()", () => {
  it("sends the controller return value when headers are not sent", async () => {
    const server = buildExecuteServer();
    class ItemsController {
      list(): { ok: boolean } {
        return { ok: true };
      }
    }
    const controller = new ItemsController();
    const req = { method: "GET", path: "/items", params: {} } as Request;
    attachHttpContext(req, controller, "ItemsController");

    const send = jest.fn();
    const res = { headersSent: false, send } as unknown as Response;
    const next = jest.fn();

    await server.executeRouteHandler(
      req,
      res,
      next,
      "ItemsController",
      "list",
      [],
      ItemsController,
    );

    expect(send).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards NotFoundError when a GET handler returns null", async () => {
    const server = buildExecuteServer();
    class ItemsController {
      get(): null {
        return null;
      }
    }
    const controller = new ItemsController();
    const req = { method: "GET", path: "/items/42", params: { id: "42" } } as unknown as Request;
    attachHttpContext(req, controller, "ItemsController");

    const res = { headersSent: false, send: jest.fn(), end: jest.fn() } as unknown as Response;
    const next = jest.fn();

    await server.executeRouteHandler(req, res, next, "ItemsController", "get", [], ItemsController);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it("stops the pipeline when decorated body validation fails", async () => {
    const server = buildExecuteServer();
    const validationService = new ValidationService();
    validationService.enable({
      adapters: [ZodValidatorAdapter],
      smartDetection: false,
      autoDetection: false,
    });
    server.setValidationService(validationService);

    class CreateDto {}
    class ItemsController {
      create(_dto: CreateDto): void {}
    }
    validatedBody(fakeSchema(() => false))(ItemsController.prototype, "create", 0);

    const controller = new ItemsController();
    const req = { method: "POST", path: "/items", body: { bad: true }, params: {} } as Request;
    attachHttpContext(req, controller, "ItemsController");
    (server as unknown as { extractParameters: jest.Mock }).extractParameters.mockReturnValue([
      req.body,
    ]);

    const json = jest.fn();
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json,
      send: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    await server.executeRouteHandler(
      req,
      res,
      next,
      "ItemsController",
      "create",
      [],
      ItemsController,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("uses validated args when decorated body validation succeeds", async () => {
    const server = buildExecuteServer();
    const validationService = new ValidationService();
    validationService.enable({
      adapters: [ZodValidatorAdapter],
      smartDetection: false,
      autoDetection: false,
    });
    server.setValidationService(validationService);

    class CreateDto {}
    class ItemsController {
      create(dto: CreateDto): CreateDto {
        return dto;
      }
    }
    validatedBody(fakeSchema((value) => typeof value === "object" && value !== null))(
      ItemsController.prototype,
      "create",
      0,
    );

    const controller = new ItemsController();
    const body = { name: "Ada" };
    const req = { method: "POST", path: "/items", body, params: {} } as Request;
    attachHttpContext(req, controller, "ItemsController");
    server.extractParameters.mockReturnValue([body]);

    const send = jest.fn();
    const res = { headersSent: false, send } as unknown as Response;
    const next = jest.fn();

    await server.executeRouteHandler(
      req,
      res,
      next,
      "ItemsController",
      "create",
      [],
      ItemsController,
    );

    expect(send).toHaveBeenCalledWith(body);
  });

  it("delegates to content negotiation when enabled", async () => {
    const { getContentNegotiationMetadata } = jest.requireMock("../utils");
    getContentNegotiationMetadata.mockReturnValue({
      accept: "application/json",
      produces: undefined,
    });

    const server = buildExecuteServer();
    server.getContentNegotiationService = jest.fn().mockReturnValue({
      isEnabled: () => true,
      handleResponse: jest.fn().mockResolvedValue(true),
    });

    class ItemsController {
      list(): { ok: boolean } {
        return { ok: true };
      }
    }
    const controller = new ItemsController();
    const req = { method: "GET", path: "/items", params: {} } as Request;
    attachHttpContext(req, controller, "ItemsController");

    const send = jest.fn();
    const res = { headersSent: false, send } as unknown as Response;

    await server.executeRouteHandler(
      req,
      res,
      jest.fn(),
      "ItemsController",
      "list",
      [],
      ItemsController,
    );

    expect(server.getContentNegotiationService().handleResponse).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("renders a template when render metadata is present", async () => {
    const { getRenderMetadata } = jest.requireMock("../decorators");
    getRenderMetadata.mockReturnValue({ template: "home", defaultData: { title: "Hi" } });

    const server = buildExecuteServer();
    class PagesController {
      home(): { title: string } {
        return { title: "Welcome" };
      }
    }
    const controller = new PagesController();
    const req = { method: "GET", path: "/", params: {} } as Request;
    attachHttpContext(req, controller, "PagesController");

    const render = jest.fn();
    const res = { headersSent: false, render, send: jest.fn() } as unknown as Response;

    await server.executeRouteHandler(
      req,
      res,
      jest.fn(),
      "PagesController",
      "home",
      [],
      PagesController,
    );

    expect(render).toHaveBeenCalledWith("home", { title: "Welcome" });
  });

  it("forwards unexpected controller errors to Express error middleware", async () => {
    const server = buildExecuteServer();
    class BrokenController {
      boom(): never {
        throw new Error("boom");
      }
    }
    const controller = new BrokenController();
    const req = { method: "GET", path: "/broken", params: {} } as Request;
    attachHttpContext(req, controller, "BrokenController");

    const next = jest.fn();
    const res = { headersSent: false, send: jest.fn() } as unknown as Response;

    await server.executeRouteHandler(
      req,
      res,
      next,
      "BrokenController",
      "boom",
      [],
      BrokenController,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }));
  });

  it("records flow tracker steps when validation fails", async () => {
    const core = jest.requireMock("@expressots/core") as {
      ContextManager: { getCurrentContext: jest.Mock };
      findFlowTracker: jest.Mock;
    };
    const flowTracker = {
      isEnabled: jest.fn().mockReturnValue(true),
      startStep: jest.fn(),
      endStep: jest.fn(),
      failStep: jest.fn(),
    };
    core.ContextManager.getCurrentContext.mockReturnValue({ requestId: "req-1" });
    core.findFlowTracker.mockReturnValue(flowTracker);

    const server = buildExecuteServer();
    const validationService = new ValidationService();
    validationService.enable({
      adapters: [ZodValidatorAdapter],
      smartDetection: false,
      autoDetection: false,
    });
    server.setValidationService(validationService);

    class CreateDto {}
    class ItemsController {
      create(_dto: CreateDto): void {}
    }
    validatedBody(fakeSchema(() => false))(ItemsController.prototype, "create", 0);

    const controller = new ItemsController();
    const req = { method: "POST", path: "/items", body: { bad: true }, params: {} } as Request;
    attachHttpContext(req, controller, "ItemsController");
    server.extractParameters.mockReturnValue([req.body]);

    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    await server.executeRouteHandler(
      req,
      res,
      jest.fn(),
      "ItemsController",
      "create",
      [],
      ItemsController,
    );

    expect(flowTracker.startStep).toHaveBeenCalledWith(
      "validation",
      "Validation: ItemsController.create",
    );
    expect(flowTracker.failStep).toHaveBeenCalledWith(expect.any(Error));
  });

  it("stops when smart detection validation fails without explicit decorators", async () => {
    const core = jest.requireMock("@expressots/core") as {
      findFlowTracker: jest.Mock;
    };
    core.findFlowTracker.mockReturnValue(undefined);

    const server = buildExecuteServer();
    const validateParameters = jest.fn().mockResolvedValue(null);
    server.setValidationService({
      isEnabled: () => true,
      validateParameters,
    } as unknown as ValidationService);

    class ItemsController {
      create(body: { name: string }): { name: string } {
        return body;
      }
    }

    const controller = new ItemsController();
    const body = { name: "Ada" };
    const req = { method: "POST", path: "/items", body, params: {} } as Request;
    attachHttpContext(req, controller, "ItemsController");
    server.extractParameters.mockReturnValue([body]);

    const send = jest.fn();
    const res = { headersSent: false, send } as unknown as Response;

    await server.executeRouteHandler(
      req,
      res,
      jest.fn(),
      "ItemsController",
      "create",
      [],
      ItemsController,
    );

    expect(validateParameters).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
