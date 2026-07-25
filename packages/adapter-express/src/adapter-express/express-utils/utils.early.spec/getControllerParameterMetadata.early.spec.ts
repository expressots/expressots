import "reflect-metadata";
import { getControllerParameterMetadata, getContentNegotiationMetadata } from "../utils";
import { METADATA_KEY } from "../constants";

describe("getControllerParameterMetadata()", () => {
  class BaseController {}
  class UsersController extends BaseController {
    create(): void {}
  }

  it("returns generic metadata when only the parent class defines parameters", () => {
    Reflect.defineMetadata(
      METADATA_KEY.controllerParameter,
      { create: [{ index: 0, type: 1 }] },
      BaseController,
    );

    expect(getControllerParameterMetadata(UsersController)).toEqual({
      create: [{ index: 0, type: 1 }],
    });
  });
});

describe("getContentNegotiationMetadata()", () => {
  it("reads negotiation metadata keys from the controller method", () => {
    class UsersController {
      list(): void {}
    }

    Reflect.defineMetadata(
      METADATA_KEY.accept,
      ["application/json"],
      UsersController.prototype,
      "list",
    );
    Reflect.defineMetadata(
      METADATA_KEY.produces,
      ["text/plain"],
      UsersController.prototype,
      "list",
    );

    const metadata = getContentNegotiationMetadata(UsersController.prototype, "list");

    expect(metadata.accept).toEqual(["application/json"]);
    expect(metadata.produces).toEqual(["text/plain"]);
  });
});
