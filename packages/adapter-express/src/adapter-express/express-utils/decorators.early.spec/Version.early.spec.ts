import "reflect-metadata";
import { Version, controller, Get, Http } from "../decorators";
import { HTTP_CODE_METADATA, METADATA_KEY } from "../constants";

describe("Version decorator", () => {
  it("stores normalized version metadata on controllers and methods", () => {
    @Version(1)
    @controller("/users")
    class UsersController {
      @Version("2")
      @Get("/")
      list(): string {
        return "ok";
      }
    }

    expect(Reflect.getMetadata(METADATA_KEY.version, UsersController)).toBe("v1");
    expect(Reflect.getMetadata(METADATA_KEY.version, UsersController.prototype, "list")).toBe("v2");
  });
});

describe("Http decorator status-code path mapping", () => {
  it("maps controller and method paths for status middleware lookup", () => {
    @controller("/api")
    class ApiController {
      @Http(201)
      @Get("users")
      create(): string {
        return "created";
      }
    }

    void ApiController;

    const mapping = Reflect.getMetadata(HTTP_CODE_METADATA.httpCode, Reflect) as Record<
      string,
      number
    >;
    expect(mapping["/api/users/-get"]).toBe(201);
  });
});
