import "reflect-metadata";
import { Console } from "..";
import { bgColorCodes, colorCodes } from "../../common/color-service.provider";

let spy: vi.SpyInstance;
let consoleInstance: Console;

beforeEach(() => {
  consoleInstance = new Console();
  spy = vi.spyOn(console, "log");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Console", () => {
  describe("messageServer", () => {
    it('calls message server with the correct arguments for environment "development" without IConsoleMessage', async () => {
      await consoleInstance.messageServer(3000, "development");

      expect(spy).toHaveBeenCalledWith(
        `${bgColorCodes["yellow"]}${colorCodes["black"]}Application version not provided is running on port 3000 - Environment: development\x1b[0m`,
      );
    });

    it('calls message server with the correct arguments for environment "staging" without IConsoleMessage', async () => {
      await consoleInstance.messageServer(3000, "staging");

      expect(spy).toHaveBeenCalledWith(
        `${bgColorCodes["blue"]}${colorCodes["black"]}Application version not provided is running on port 3000 - Environment: staging\x1b[0m`,
      );
    });

    it('calls message server with the correct arguments for environment "production" without IConsoleMessage', async () => {
      await consoleInstance.messageServer(3000, "production");

      expect(spy).toHaveBeenCalledWith(
        `${bgColorCodes["green"]}${colorCodes["black"]}Application version not provided is running on port 3000 - Environment: production\x1b[0m`,
      );
    });

    it('calls message server with the correct arguments for environment "unknown" without IConsoleMessage', async () => {
      await consoleInstance.messageServer(3000, "test");

      expect(spy).toHaveBeenCalledWith(
        `${bgColorCodes["red"]}${colorCodes["black"]}Application version not provided is running on port 3000 - Environment: test\x1b[0m`,
      );
    });

    it('calls message server with the correct arguments when the "consoleMessage" argument is provided', async () => {
      const consoleMessage = {
        appName: "TestApp",
        appVersion: "1.0.0",
      };
      await consoleInstance.messageServer(3000, "production", consoleMessage);
      expect(spy).toHaveBeenCalledWith(
        `${bgColorCodes["green"]}${colorCodes["black"]}TestApp version 1.0.0 is running on port 3000 - Environment: production\x1b[0m`,
      );
    });
  });
});
