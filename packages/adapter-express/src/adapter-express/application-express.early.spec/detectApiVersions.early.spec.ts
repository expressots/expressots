import { AppExpress } from "../application-express";
import {
  getControllerMetadata,
  getControllerMethodMetadata,
  getControllersFromMetadata,
} from "../express-utils/utils";

jest.mock("../express-utils/utils.js", () => ({
  getControllersFromMetadata: jest.fn(),
  getControllerMetadata: jest.fn(),
  getControllerMethodMetadata: jest.fn(),
}));

describe("AppExpress.detectApiVersions() method", () => {
  it("collects controller and method versions with v-prefix normalization", () => {
    class UsersController {}
    (getControllersFromMetadata as jest.Mock).mockReturnValue([UsersController]);
    (getControllerMetadata as jest.Mock).mockReturnValue({ version: "1" });
    (getControllerMethodMetadata as jest.Mock).mockReturnValue([{ version: "2" }]);

    const appExpress = new AppExpress() as AppExpress;
    const versions = (
      appExpress as unknown as { detectApiVersions: () => Array<string> }
    ).detectApiVersions();

    expect(versions).toEqual(["v1", "v2"]);
  });

  it("returns an empty array when metadata lookup fails", () => {
    (getControllersFromMetadata as jest.Mock).mockImplementation(() => {
      throw new Error("metadata unavailable");
    });

    const appExpress = new AppExpress() as AppExpress;
    const versions = (
      appExpress as unknown as { detectApiVersions: () => Array<string> }
    ).detectApiVersions();

    expect(versions).toEqual([]);
  });
});
